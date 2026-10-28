"""
Export and quantize all-MiniLM-L6-v2 to INT8 ONNX
"""
import os
import torch
from pathlib import Path
from transformers import AutoTokenizer, AutoModel
from onnxruntime.quantization import quantize_dynamic, QuantType

def export_and_quantize(output_dir: str = "models/onnx"):
    out_path = Path(output_dir)
    out_path.mkdir(parents=True, exist_ok=True)
    
    model_name = "sentence-transformers/all-MiniLM-L6-v2"
    print(f"Loading {model_name}...")
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    model = AutoModel.from_pretrained(model_name)
    model.eval()

    # Save tokenizer files
    tokenizer.save_pretrained(out_path)
    print(f"Tokenizer saved to {out_path}")

    # Export to FP32 ONNX
    fp32_onnx_path = out_path / "model.onnx"
    int8_onnx_path = out_path / "model_int8.onnx"

    dummy_input = tokenizer("What is normal blood pressure?", return_tensors="pt")
    
    print("Exporting FP32 ONNX model...")
    torch.onnx.export(
        model,
        (dummy_input["input_ids"], dummy_input["attention_mask"], dummy_input["token_type_ids"]),
        str(fp32_onnx_path),
        input_names=["input_ids", "attention_mask", "token_type_ids"],
        output_names=["last_hidden_state"],
        dynamic_axes={
            "input_ids": {0: "batch_size", 1: "sequence_length"},
            "attention_mask": {0: "batch_size", 1: "sequence_length"},
            "token_type_ids": {0: "batch_size", 1: "sequence_length"},
            "last_hidden_state": {0: "batch_size", 1: "sequence_length"}
        },
        opset_version=14,
        do_constant_folding=True
    )
    print(f"FP32 ONNX saved: {fp32_onnx_path.stat().st_size / (1024*1024):.2f} MB")

    print("Quantizing to INT8 ONNX...")
    quantize_dynamic(
        model_input=str(fp32_onnx_path),
        model_output=str(int8_onnx_path),
        weight_type=QuantType.QInt8
    )
    print(f"INT8 ONNX saved: {int8_onnx_path.stat().st_size / (1024*1024):.2f} MB")

if __name__ == "__main__":
    export_and_quantize()
