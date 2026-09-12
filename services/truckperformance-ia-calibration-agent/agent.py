"""
TruckPerformance IA Calibration Agent - generic binary diff/patch, plus an
optional AI layer that hypothesizes what each changed block might be.

Unlike ../simos18-agent (which knows Simos18/EDC17 block layouts via the
vendored BinToolz engine), this agent has no ECU-specific knowledge: it just
compares two same-size files byte-by-byte and produces a `.tppatch` (JSON)
that can be re-applied to another file that starts from the same content.

Usage:
    python agent.py diff <original.bin> <modified.bin> <output.tppatch> [--merge-gap N]
    python agent.py check <bin> <patch.tppatch>
    python agent.py apply <bin> <patch.tppatch> <output.bin> [--force]
    python agent.py revert <bin> <patch.tppatch> <output.bin> [--force]
    python agent.py analyze <patch.tppatch> [--max-blocks N]
"""
import argparse
import sys
from pathlib import Path

from diffengine import DiffEngineError, apply_patch, check_patch, diff_bins, load_patch, revert_patch, save_patch


def cmd_diff(args) -> int:
    original = Path(args.original).read_bytes()
    modified = Path(args.modified).read_bytes()
    try:
        patch = diff_bins(original, modified, merge_gap=args.merge_gap, notes=args.notes or "")
    except DiffEngineError as e:
        print(f"Error: {e}")
        return 1

    save_patch(patch, args.output)
    total_bytes = sum(b.length for b in patch.blocks)
    print(f"{len(patch.blocks)} block(s), {total_bytes} byte(s) changed -> {args.output}")
    return 0


def cmd_check(args) -> int:
    bin_data = Path(args.bin).read_bytes()
    patch = load_patch(args.patch)
    problems = check_patch(bin_data, patch)
    if not problems:
        print(f"OK - bin matches patch, ready to apply ({len(patch.blocks)} block(s))")
        return 0
    for p in problems:
        print(f"PROBLEM: {p}")
    return 1


def cmd_apply(args) -> int:
    bin_data = Path(args.bin).read_bytes()
    patch = load_patch(args.patch)
    try:
        result = apply_patch(bin_data, patch, force=args.force)
    except DiffEngineError as e:
        print(f"Error: {e}")
        return 1
    Path(args.output).write_bytes(result)
    print(f"Applied {len(patch.blocks)} block(s) -> {args.output}")
    return 0


def cmd_revert(args) -> int:
    bin_data = Path(args.bin).read_bytes()
    patch = load_patch(args.patch)
    try:
        result = revert_patch(bin_data, patch, force=args.force)
    except DiffEngineError as e:
        print(f"Error: {e}")
        return 1
    Path(args.output).write_bytes(result)
    print(f"Reverted {len(patch.blocks)} block(s) -> {args.output}")
    return 0


def cmd_analyze(args) -> int:
    import ai  # imported lazily so `diff`/`check`/`apply`/`revert` never need the anthropic package

    patch = load_patch(args.patch)
    try:
        results = ai.analyze_patch(patch, max_blocks=args.max_blocks)
    except ai.AIAnalysisError as e:
        print(f"Error: {e}")
        return 1

    print(ai.CAVEAT)
    print()
    for r in results:
        print(f"[{r.index}] offset=0x{r.offset:X} len={r.length} confidence={r.confidence}")
        print(f"    {r.hypothesis}")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest="command", required=True)

    p_diff = sub.add_parser("diff", help="Compare two same-size bins and produce a .tppatch")
    p_diff.add_argument("original")
    p_diff.add_argument("modified")
    p_diff.add_argument("output")
    p_diff.add_argument("--merge-gap", type=int, default=8,
                         help="merge differing bytes within this many bytes of each other into one block (default 8)")
    p_diff.add_argument("--notes", default="", help="free-text note stored in the patch file")

    p_check = sub.add_parser("check", help="Check whether a bin is ready to receive a patch (writes nothing)")
    p_check.add_argument("bin")
    p_check.add_argument("patch")

    p_apply = sub.add_parser("apply", help="Apply a .tppatch to a bin")
    p_apply.add_argument("bin")
    p_apply.add_argument("patch")
    p_apply.add_argument("output")
    p_apply.add_argument("--force", action="store_true", help="skip the check and write anyway")

    p_revert = sub.add_parser("revert", help="Undo a .tppatch from a bin (writes the original bytes back)")
    p_revert.add_argument("bin")
    p_revert.add_argument("patch")
    p_revert.add_argument("output")
    p_revert.add_argument("--force", action="store_true", help="skip the check and write anyway")

    p_analyze = sub.add_parser("analyze", help="Ask an AI model to hypothesize what each block represents")
    p_analyze.add_argument("patch")
    p_analyze.add_argument("--max-blocks", type=int, default=30, help="analyze at most N blocks, biggest first")

    args = parser.parse_args()

    handlers = {
        "diff": cmd_diff,
        "check": cmd_check,
        "apply": cmd_apply,
        "revert": cmd_revert,
        "analyze": cmd_analyze,
    }
    return handlers[args.command](args)


if __name__ == "__main__":
    sys.exit(main())
