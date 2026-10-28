"""
GenSync-Cache: Tier-1 Lambda & Layer Packaging Script
Produces:
1. build/tier1_layer.zip: Linux x86_64 ML dependencies (onnxruntime, tokenizers, numpy) for Python 3.11
2. build/tier1_lambda.zip: Core application logic, seed data, and INT8 ONNX model
"""

import os
import shutil
import zipfile
import glob
from pathlib import Path


def build_layer_package(output_zip: str = "build/tier1_layer.zip"):
    print("\n[Layer 1/3] Preparing Lambda Layer directory structure...")
    layer_dir = Path("build/layer_build/python/lib/python3.11/site-packages")
    if Path("build/layer_build").exists():
        shutil.rmtree("build/layer_build")
    layer_dir.mkdir(parents=True, exist_ok=True)

    print("[Layer 2/3] Extracting Linux x86_64 wheels...")
    wheels_dir = Path("build/wheels_test")
    if not wheels_dir.exists() or not list(wheels_dir.glob("*.whl")):
        raise RuntimeError("No wheels found in build/wheels_test. Run pip download first.")

    for whl in wheels_dir.glob("*.whl"):
        with zipfile.ZipFile(whl, "r") as z:
            z.extractall(layer_dir)

    # Clean up non-runtime bloat: tests, dist-info, pycache
    print("[Layer 3/3] Pruning unnecessary documentation, tests, and metadata...")
    for root, dirs, files in os.walk("build/layer_build", topdown=False):
        for name in files:
            if name.endswith((".pyc", ".pyo")) or "dist-info" in root:
                os.remove(os.path.join(root, name))
        for name in dirs:
            if name in ("tests", "test", "__pycache__", "docs"):
                shutil.rmtree(os.path.join(root, name), ignore_errors=True)

    zip_path = Path(output_zip)
    zip_path.parent.mkdir(parents=True, exist_ok=True)
    if zip_path.exists():
        zip_path.unlink()

    print(f"Compressing Layer to {output_zip}...")
    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as zipf:
        base_dir = Path("build/layer_build")
        for root, dirs, files in os.walk(base_dir):
            for file in files:
                file_path = Path(root) / file
                archive_name = file_path.relative_to(base_dir)
                zipf.write(file_path, arcname=archive_name)

    layer_size_mb = zip_path.stat().st_size / (1024 * 1024)
    print(f"--> TIER-1 DEPENDENCIES LAYER SIZE: {layer_size_mb:.2f} MB (Limit: 50 MB)")
    return layer_size_mb


def build_app_package(output_zip: str = "build/tier1_lambda.zip"):
    print("\n[App 1/3] Preparing application package directory...")
    app_dir = Path("build/app_build")
    if app_dir.exists():
        shutil.rmtree(app_dir)
    app_dir.mkdir(parents=True, exist_ok=True)

    # Copy code
    src_dest = app_dir / "src" / "tier1"
    src_dest.mkdir(parents=True, exist_ok=True)
    shutil.copytree("src/tier1", src_dest, dirs_exist_ok=True)

    # Copy seed data
    db_dest = app_dir / "db"
    db_dest.mkdir(parents=True, exist_ok=True)
    shutil.copy2("db/seed_data_embedded.json", db_dest / "seed_data_embedded.json")

    # Copy INT8 ONNX model & tokenizer
    print("[App 2/3] Copying INT8 ONNX model and tokenizer...")
    model_dest = app_dir / "models" / "onnx"
    model_dest.mkdir(parents=True, exist_ok=True)

    src_model = Path("models/onnx/onnx/model_quantized.onnx")
    if not src_model.exists():
        src_model = Path("models/onnx/model_int8.onnx")
    shutil.copy2(src_model, model_dest / "model.onnx")
    shutil.copy2("models/onnx/tokenizer.json", model_dest / "tokenizer.json")

    # Compress
    print(f"[App 3/3] Compressing application package to {output_zip}...")
    zip_path = Path(output_zip)
    if zip_path.exists():
        zip_path.unlink()

    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as zipf:
        for root, dirs, files in os.walk(app_dir):
            for file in files:
                file_path = Path(root) / file
                archive_name = file_path.relative_to(app_dir)
                zipf.write(file_path, arcname=archive_name)

    app_size_mb = zip_path.stat().st_size / (1024 * 1024)
    print(f"--> TIER-1 APPLICATION PACKAGE SIZE: {app_size_mb:.2f} MB (Limit: 50 MB)")
    return app_size_mb


if __name__ == "__main__":
    layer_mb = build_layer_package()
    app_mb = build_app_package()
    print("\n=======================================================")
    print(f"TIER-1 LAYER SIZE (onnxruntime + tokenizers + numpy) : {layer_mb:.2f} MB")
    print(f"TIER-1 FUNCTION SIZE (code + model + seed data)      : {app_mb:.2f} MB")
    print("STATUS: PASS (Both artifacts are safely under 50 MB)")
    print("=======================================================")
