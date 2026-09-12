"""
Simos18 multimap/patch agent for Truck Performance.

Thin CLI around the vendored BinToolz engine (vendor/). All the actual
byte-level work (identify hardware, validate, patch, checksum-verify the
.btp itself) lives there unchanged; this file only adds:
  - a `patches` catalog lookup by ECU hardware code (S50, A05, V30, ...)
  - a friendlier CLI surface (identify / list / check / apply / create)

Usage:
    python agent.py identify <bin>
    python agent.py list <patches_dir> [hw_code]
    python agent.py check <bin> <patch.btp> [more.btp ...]
    python agent.py apply <bin> <output.bin> --mode ignore <patch.btp> [more.btp ...]
    python agent.py create <original.bin> <modified.bin> <output.btp>
"""
import argparse
import sys
from pathlib import Path

from vendor.simos_bin import SimosBIN
from vendor.return_type import ReturnType
from vendor.patch_functions import FunctionType, DataMode, patchApply, patchCreate


def identify(bin_path: str) -> ReturnType:
    bin = SimosBIN()
    ret = bin.load(bin_path)
    if ret != ReturnType.OK:
        print(f"Unable to open bin [{ret.string()}]")
        return ret

    hw_key, hw_value = bin.hardwareType()
    if hw_value is None:
        print("Unknown hardware type - this file doesn't look like a Simos18/19/DQ bin")
        return ReturnType.UNKNOWN_HW

    print(f"Hardware      : {hw_key}")
    print(f"Box code      : {bin.boxCode()!r}")
    print(f"Software code : {bin.softwareCode()!r}")
    print(f"File size     : {len(bin.data)} bytes")
    return ReturnType.OK


def list_patches(patches_dir: str, hw_code: str | None) -> ReturnType:
    directory = Path(patches_dir)
    if not directory.is_dir():
        print(f"Patches directory not found: {patches_dir}")
        return ReturnType.FILE_DOESNT_EXIST

    matches = sorted(directory.glob("*.btp"))
    if hw_code:
        needle = f"- {hw_code.upper()}.btp".lower()
        matches = [m for m in matches if m.name.lower().endswith(needle)]

    if not matches:
        print("No matching .btp files found.")
        return ReturnType.FILE_DOESNT_EXIST

    for m in matches:
        print(m.name)
    return ReturnType.OK


def _resolve_mode(mode_str: str) -> DataMode:
    return {
        "normal": DataMode.NORMAL,
        "ignore": DataMode.IGNORE,
        "force": DataMode.FORCE,
    }[mode_str]


def check(bin_path: str, patch_paths: list[str]) -> ReturnType:
    return patchApply(FunctionType.FUNC_CHECK, bin_path, patch_paths, "", DataMode.IGNORE, print)


def apply(bin_path: str, output_path: str, patch_paths: list[str], mode: str) -> ReturnType:
    return patchApply(FunctionType.FUNC_ADD, bin_path, patch_paths, output_path, _resolve_mode(mode), print)


def remove(bin_path: str, output_path: str, patch_paths: list[str], mode: str) -> ReturnType:
    return patchApply(FunctionType.FUNC_REMOVE, bin_path, patch_paths, output_path, _resolve_mode(mode), print)


def create(original_path: str, modified_path: str, output_path: str, mode: str) -> ReturnType:
    return patchCreate(original_path, modified_path, output_path, _resolve_mode(mode), print)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest="command", required=True)

    p_identify = sub.add_parser("identify", help="Show hardware/software code for a bin")
    p_identify.add_argument("bin")

    p_list = sub.add_parser("list", help="List available .btp patches for a hardware code")
    p_list.add_argument("patches_dir")
    p_list.add_argument("hw_code", nargs="?")

    p_check = sub.add_parser("check", help="Check whether a bin is ready to accept patch(es)")
    p_check.add_argument("bin")
    p_check.add_argument("patches", nargs="+")

    p_apply = sub.add_parser("apply", help="Apply patch(es) to a bin")
    p_apply.add_argument("bin")
    p_apply.add_argument("output")
    p_apply.add_argument("patches", nargs="+")
    p_apply.add_argument("--mode", choices=["normal", "ignore", "force"], default="ignore",
                          help="ignore (default) preserves the customer's existing calibration/Stage tune")

    p_remove = sub.add_parser("remove", help="Remove patch(es) from a bin")
    p_remove.add_argument("bin")
    p_remove.add_argument("output")
    p_remove.add_argument("patches", nargs="+")
    p_remove.add_argument("--mode", choices=["normal", "ignore", "force"], default="ignore")

    p_create = sub.add_parser("create", help="Create a .btp patch from an original/modified bin pair")
    p_create.add_argument("original")
    p_create.add_argument("modified")
    p_create.add_argument("output")
    p_create.add_argument("--mode", choices=["normal", "ignore", "force"], default="ignore",
                           help="ignore (default) excludes the calibration block from the generated patch")

    args = parser.parse_args()

    if args.command == "identify":
        ret = identify(args.bin)
    elif args.command == "list":
        ret = list_patches(args.patches_dir, args.hw_code)
    elif args.command == "check":
        ret = check(args.bin, args.patches)
    elif args.command == "apply":
        ret = apply(args.bin, args.output, args.patches, args.mode)
    elif args.command == "remove":
        ret = remove(args.bin, args.output, args.patches, args.mode)
    elif args.command == "create":
        ret = create(args.original, args.modified, args.output, args.mode)
    else:
        parser.print_help()
        return 1

    return 0 if ret == ReturnType.OK else 1


if __name__ == "__main__":
    sys.exit(main())
