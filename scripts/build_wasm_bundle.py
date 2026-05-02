"""Build Automaginarium's generated Multilingual artifacts."""

from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
from pathlib import Path

from wasmtime import wat2wasm


ROOT = Path(__file__).resolve().parents[1]
GENERATED = ROOT / "public" / "generated"
PACKED = GENERATED / "automate_packed"


def run(command: list[str]) -> None:
    """Run a build command from the repository root."""
    subprocess.run(command, cwd=ROOT, check=True)


def build_french_core() -> None:
    """Compile the rich French core to generated Python."""
    GENERATED.mkdir(parents=True, exist_ok=True)
    result = subprocess.run(
        [
            sys.executable,
            "-m",
            "multilingualprogramming",
            "compile",
            "src/automate_universel.ml",
        ],
        cwd=ROOT,
        check=True,
        text=True,
        capture_output=True,
    )
    (GENERATED / "automate_universel.py").write_text(result.stdout, encoding="utf-8")


def build_packed_wasm() -> None:
    """Build the narrow browser ABI and write WASM from the generated WAT."""
    run(
        [
            sys.executable,
            "-m",
            "multilingualprogramming",
            "build-wasm-bundle",
            "src/automate_packed_wasm.ml",
            "--out-dir",
            str(PACKED),
        ]
    )

    wat_path = PACKED / "module.wat"
    wasm_path = PACKED / "module.wasm"
    if not wat_path.is_file():
        raise FileNotFoundError(f"generated WAT missing: {wat_path}")
    wasm_path.write_bytes(wat2wasm(wat_path.read_text(encoding="utf-8")))

    shim_js = PACKED / "host_shim.js"
    shim_mjs = PACKED / "host_shim.mjs"
    if not shim_js.is_file():
        raise FileNotFoundError(f"generated host shim missing: {shim_js}")
    shutil.copyfile(shim_js, shim_mjs)


def main() -> None:
    """Build all generated artifacts used by CI and GitHub Pages."""
    parser = argparse.ArgumentParser()
    parser.parse_args()
    build_french_core()
    build_packed_wasm()


if __name__ == "__main__":
    main()
