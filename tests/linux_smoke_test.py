import sys
import os

print(f"[Smoke Test 1/5] Python interpreter: {sys.version}")

# 1. Test tokenizers
try:
    import tokenizers
    from tokenizers import Tokenizer
    tok = Tokenizer.from_file("models/onnx/tokenizer.json")
    tok.enable_padding(length=128)
    tok.enable_truncation(max_length=128)
    encoded = tok.encode("What is normal resting blood pressure?")
    print(f"SUCCESS: Tokenizers {tokenizers.__version__} - Encoded {len(encoded.ids)} tokens.")
except Exception as e:
    print(f"FAILED tokenizers: {e}")

# 2. Test onnxruntime or numpy
try:
    import numpy as np
    print(f"SUCCESS: NumPy {np.__version__}")
except Exception as e:
    print(f"FAILED numpy: {e}")

try:
    import onnxruntime as ort
    print(f"SUCCESS: ONNX Runtime {ort.__version__}")
    sess_opts = ort.SessionOptions()
    sess_opts.intra_op_num_threads = 1
    session = ort.InferenceSession("models/onnx/model.onnx", sess_options=sess_opts)
    print("SUCCESS: Loaded INT8 ONNX model session successfully.")
except Exception as e:
    print(f"FAILED onnxruntime / model loading: {e}")

# 3. Test Full Lambda Handler Execution
try:
    from src.tier1.handler import lambda_handler
    event = {
        "requestContext": {"http": {"method": "POST"}},
        "body": '{"query": "What is considered a normal resting blood pressure reading?"}'
    }
    response = lambda_handler(event)
    print(f"SUCCESS: lambda_handler status = {response['statusCode']}")
    print(f"SUCCESS: lambda_handler body preview = {response['body'][:120]}...")
except Exception as e:
    print(f"FAILED lambda_handler execution: {e}")
