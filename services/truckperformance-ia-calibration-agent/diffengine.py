"""
Generic byte-level diff/patch engine - no ECU/hardware knowledge baked in.

Unlike vendor/ in ../simos18-agent (which knows Simos18/EDC17 block layouts),
this compares two same-size binaries byte-by-byte, groups differences into
blocks (merging ones that are close together), and can later re-apply just
those differing bytes onto another file that starts from the same original
content - the same idea as a generic "diff & patch" tool, kept independent of
any specific ECU platform.

Patch files are JSON (extension `.tppatch`) so they're inspectable by hand:
    {
      "format": "truckperformance-patch",
      "version": 1,
      "source_size": <int>,
      "source_sha256": "<hex>",
      "created_at": "<ISO8601>",
      "notes": "<free text>",
      "blocks": [{"offset": int, "original": "<hex>", "new": "<hex>"}, ...]
    }
"""
from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path

FORMAT_NAME = "truckperformance-patch"
FORMAT_VERSION = 1


class DiffEngineError(Exception):
    pass


@dataclass
class Block:
    offset: int
    original: bytes
    new: bytes

    @property
    def length(self) -> int:
        return len(self.new)

    def to_dict(self) -> dict:
        return {
            "offset": self.offset,
            "original": self.original.hex(),
            "new": self.new.hex(),
        }

    @staticmethod
    def from_dict(d: dict) -> "Block":
        return Block(offset=int(d["offset"]), original=bytes.fromhex(d["original"]), new=bytes.fromhex(d["new"]))


@dataclass
class Patch:
    source_size: int
    source_sha256: str
    blocks: list[Block] = field(default_factory=list)
    created_at: str = ""
    notes: str = ""

    def to_dict(self) -> dict:
        return {
            "format": FORMAT_NAME,
            "version": FORMAT_VERSION,
            "source_size": self.source_size,
            "source_sha256": self.source_sha256,
            "created_at": self.created_at,
            "notes": self.notes,
            "blocks": [b.to_dict() for b in self.blocks],
        }

    @staticmethod
    def from_dict(d: dict) -> "Patch":
        if d.get("format") != FORMAT_NAME:
            raise DiffEngineError(f"Not a {FORMAT_NAME} file (got format={d.get('format')!r})")
        if d.get("version") != FORMAT_VERSION:
            raise DiffEngineError(f"Unsupported patch version: {d.get('version')!r}")
        return Patch(
            source_size=int(d["source_size"]),
            source_sha256=d["source_sha256"],
            blocks=[Block.from_dict(b) for b in d.get("blocks", [])],
            created_at=d.get("created_at", ""),
            notes=d.get("notes", ""),
        )


def sha256_hex(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def diff_bins(original: bytes, modified: bytes, merge_gap: int = 8, notes: str = "") -> Patch:
    """Compare two byte strings of the same length and produce a Patch.

    Differing byte ranges that are within `merge_gap` bytes of each other are
    merged into a single block, so a scattering of nearby single-byte tweaks
    (common in calibration tables) doesn't explode into hundreds of tiny
    blocks.
    """
    if len(original) != len(modified):
        raise DiffEngineError(
            f"original and modified must be the same size to diff "
            f"({len(original)} vs {len(modified)} bytes) - they should be the "
            f"same base software, just edited"
        )

    diff_positions = [i for i in range(len(original)) if original[i] != modified[i]]
    if not diff_positions:
        return Patch(source_size=len(original), source_sha256=sha256_hex(original), blocks=[],
                     created_at=_now(), notes=notes)

    ranges: list[tuple[int, int]] = []
    start = prev = diff_positions[0]
    for pos in diff_positions[1:]:
        if pos - prev <= merge_gap:
            prev = pos
            continue
        ranges.append((start, prev))
        start = prev = pos
    ranges.append((start, prev))

    blocks = [
        Block(offset=start, original=original[start:end + 1], new=modified[start:end + 1])
        for start, end in ranges
    ]

    return Patch(source_size=len(original), source_sha256=sha256_hex(original), blocks=blocks,
                 created_at=_now(), notes=notes)


def check_patch(bin_data: bytes, patch: Patch) -> list[str]:
    """Return a list of human-readable problems (empty = safe to apply)."""
    problems: list[str] = []

    if len(bin_data) != patch.source_size:
        problems.append(
            f"File size mismatch: bin has {len(bin_data)} bytes, patch expects {patch.source_size}"
        )
        return problems  # offsets are meaningless if the size is already off

    for i, block in enumerate(patch.blocks):
        end = block.offset + block.length
        if end > len(bin_data):
            problems.append(f"Block {i} at offset {block.offset} (len {block.length}) runs past end of file")
            continue
        actual = bin_data[block.offset:end]
        if actual != block.original:
            problems.append(
                f"Block {i} at offset {block.offset}: bytes don't match patch's expected original "
                f"(got {actual.hex()}, expected {block.original.hex()}) - file was likely modified elsewhere"
            )

    return problems


def apply_patch(bin_data: bytes, patch: Patch, force: bool = False) -> bytes:
    if not force:
        problems = check_patch(bin_data, patch)
        if problems:
            raise DiffEngineError("Refusing to apply, bin doesn't match patch:\n" + "\n".join(problems))

    out = bytearray(bin_data)
    for block in patch.blocks:
        out[block.offset:block.offset + block.length] = block.new
    return bytes(out)


def revert_patch(bin_data: bytes, patch: Patch, force: bool = False) -> bytes:
    """Undo a patch: write each block's `original` bytes back."""
    if not force:
        problems: list[str] = []
        if len(bin_data) != patch.source_size:
            problems.append(f"File size mismatch: bin has {len(bin_data)} bytes, patch expects {patch.source_size}")
        else:
            for i, block in enumerate(patch.blocks):
                end = block.offset + block.length
                actual = bin_data[block.offset:end]
                if actual != block.new:
                    problems.append(
                        f"Block {i} at offset {block.offset}: bytes don't match patch's 'new' value "
                        f"(got {actual.hex()}, expected {block.new.hex()}) - patch may not be applied here"
                    )
        if problems:
            raise DiffEngineError("Refusing to revert, bin doesn't look patched:\n" + "\n".join(problems))

    out = bytearray(bin_data)
    for block in patch.blocks:
        out[block.offset:block.offset + block.length] = block.original
    return bytes(out)


def save_patch(patch: Patch, path: str | Path) -> None:
    Path(path).write_text(json.dumps(patch.to_dict(), indent=2), encoding="utf-8")


def load_patch(path: str | Path) -> Patch:
    return Patch.from_dict(json.loads(Path(path).read_text(encoding="utf-8")))


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()
