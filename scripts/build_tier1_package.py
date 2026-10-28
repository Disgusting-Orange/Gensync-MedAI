"""
GenSync-Cache: Tier-1 Lambda Packaging Script & Size Verifier
Target: Under 50 MB compressed ZIP
"""

import os
import shutil
import zipfile
from pathlib import Path


def create_tier1_package(output_zip: str = "build/tier1_lambda.zip"):
    build_dir = Path("build/package")
    if build_dir.exists():
        shutil.rmtree(build_dir)
    build_dir.mkdir(parents=True, exist_ok=True)

    # 1. Copy application code
    print("[1/4] Copying Tier-1 source code...")
    src_dest = build_dir / "src" / "tier1"
    src_dest.mkdir(parents=True, exist_ok=True)
    shutil.copytree("src/tier1", src_dest, dirs_exist_ok=True)

    # 2. Copy embedded seed data
    print("[2/4] Copying embedded seed data...")
    db_dest = build_dir / "db"
    db_dest.mkdir(parents=True, exist_ok=True)
    shutil.copy2("db/seed_data_embedded.json", db_dest / "seed_data_embedded.json")

    # 3. Copy INT8 ONNX model and tokenizer
    print("[3/4] Copying quantized INT8 ONNX model and tokenizer...")
    model_dest = build_dir / "models" / "onnx"
    model_dest.mkdir(parents=True, exist_ok=True)
    
    # Model file
    src_model = Path("models/onnx/onnx/model_quantized.onnx")
    if not src_model.exists():
        src_model = Path("models/onnx/model_int8.onnx")
    
    dest_model_file = model_dest / "model.onnx"
    shutil.copy2(src_model, dest_model_file)
    print(f"  -> Copied model file: {dest_model_file.stat().st_size / (1024*1024):.2f} MB")

    # Tokenizer file
    shutil.copy2("models/onnx/tokenizer.json", model_dest / "tokenizer.json")

    # 4. Create ZIP package
    print("[4/4] Creating deployment ZIP archive...")
    zip_path = Path(output_zip)
    zip_path.parent.mkdir(parents=True, exist_ok=True)
    if zip_path.exists():
        zip_path.unlink()

    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as zipf:
        for root, dirs, files in os.walk(build_dir):
            for file in files:
                file_path = Path(root) / file
                archive_name = file_path.relative_to(build_dir)
                zipf.write(file_path, arcname=archive_name)

    zip_size_mb = zip_path.stat().st_size / (1024 * 1024)
    print(f"\n=======================================================")
    print(f"TIER-1 DEPLOYMENT ZIP SIZE: {zip_size_mb:.2f} MB")
    print(f"TARGET THRESHOLD        : 50.00 MB")
    if zip_size_mb <= 50.0:
        print(f"STATUS                  : PASS (Within direct Lambda upload limit)")
    else:
        print(f"STATUS                  : EXCEEDS 50MB (Requires Lambda Layer)")
    print(f"=======================================================")
    return zip_size_mb


if __name__ == "__main__":
    create_tier1_package()
