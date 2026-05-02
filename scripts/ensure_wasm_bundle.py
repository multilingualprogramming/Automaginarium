"""Validate and finish the generated Multilingual WASM bundle."""

from __future__ import annotations

import argparse
import shutil
from pathlib import Path


REQUIRED_FILES = (
    "module.wasm",
    "abi_manifest.json",
    "host_shim.mjs",
)


def print_listing(out_dir: Path) -> None:
    """Print a compact directory listing for CI logs."""
    print(f"Generated bundle contents in {out_dir}:")
    if not out_dir.exists():
        print("  <missing directory>")
        return
    for path in sorted(out_dir.iterdir()):
        if path.is_file():
            print(f"  {path.name} ({path.stat().st_size} bytes)")
        else:
            print(f"  {path.name}/")


def ensure_host_shim_mjs(out_dir: Path) -> None:
    """Create the ESM host shim expected by the browser loader."""
    js_path = out_dir / "host_shim.js"
    mjs_path = out_dir / "host_shim.mjs"
    if not mjs_path.exists() and js_path.exists():
        shutil.copyfile(js_path, mjs_path)
        print(f"Created {mjs_path} from {js_path}")


def ensure_wasm_from_wat(out_dir: Path) -> None:
    """Compile module.wat when a toolchain emits WAT but not WASM."""
    wasm_path = out_dir / "module.wasm"
    wat_path = out_dir / "module.wat"
    if wasm_path.exists() or not wat_path.exists():
        return

    try:
        from wasmtime import wat2wasm  # pylint: disable=import-outside-toplevel
    except Exception as exc:  # pragma: no cover - only hit in CI dependency breakage
        raise RuntimeError(
            "module.wasm is missing and wasmtime.wat2wasm is unavailable"
        ) from exc

    wasm_path.write_bytes(wat2wasm(wat_path.read_text(encoding="utf-8")))
    print(f"Created {wasm_path} from {wat_path}")


def validate(out_dir: Path) -> None:
    """Fail if the generated bundle is missing files consumed by the app."""
    missing = [name for name in REQUIRED_FILES if not (out_dir / name).is_file()]
    if missing:
        print_listing(out_dir)
        raise SystemExit(f"Missing generated WASM bundle file(s): {', '.join(missing)}")


def main() -> None:
    """Run bundle completion and validation."""
    parser = argparse.ArgumentParser()
    parser.add_argument("out_dir", type=Path)
    args = parser.parse_args()

    out_dir = args.out_dir
    ensure_host_shim_mjs(out_dir)
    ensure_wasm_from_wat(out_dir)
    print_listing(out_dir)
    validate(out_dir)


if __name__ == "__main__":
    main()
