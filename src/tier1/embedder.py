"""
GenSync-Cache: Lightweight INT8 ONNX Embedder for Tier-1 Lambda

Design Invariants:
1. Pure ONNX Runtime + tokenizers in production Lambda (zero PyTorch, zero Transformers).
2. INT8 quantized all-MiniLM-L6-v2 (under 25MB).
3. Mean pooling with attention mask followed by unit L2-normalization.
4. Fallback support for local testing environments.
"""

import os
from pathlib import Path
from typing import List, Union
import numpy as np


class LightweightEmbedder:
    """
    Serverless embedding provider optimized for AWS Lambda Python 3.11.
    """

    def __init__(self, model_dir: Union[str, Path] = "models/onnx"):
        self.model_dir = Path(model_dir)
        self.session = None
        self.tokenizer = None
        self._fallback_model = None
        self._initialized = False

    def _initialize(self):
        if self._initialized:
            return

        # Attempt to load INT8 ONNX model
        candidate_paths = [
            self.model_dir / "onnx" / "model_quantized.onnx",
            self.model_dir / "model_int8.onnx",
            self.model_dir / "model.onnx",
        ]
        onnx_model_path = next((p for p in candidate_paths if p.exists()), None)
        tokenizer_json_path = self.model_dir / "tokenizer.json"

        if onnx_model_path and tokenizer_json_path.exists():
            try:
                import onnxruntime as ort
                from tokenizers import Tokenizer

                # Highly optimized single-thread session for serverless Lambda
                opts = ort.SessionOptions()
                opts.intra_op_num_threads = 1
                opts.inter_op_num_threads = 1
                opts.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL

                self.session = ort.InferenceSession(str(onnx_model_path), sess_options=opts)
                self.tokenizer = Tokenizer.from_file(str(tokenizer_json_path))
                self.tokenizer.enable_padding(length=128)
                self.tokenizer.enable_truncation(max_length=128)
                self._initialized = True
                return
            except Exception as e:
                print(f"[LightweightEmbedder] ONNX load error: {e}. Falling back to SentenceTransformer.")

        # Fallback to SentenceTransformer for local unit testing / calibration
        try:
            from sentence_transformers import SentenceTransformer
            self._fallback_model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
            self._initialized = True
        except Exception as e:
            raise RuntimeError(f"Could not initialize any embedder: {e}")

    @staticmethod
    def _mean_pooling(last_hidden_state: np.ndarray, attention_mask: np.ndarray) -> np.ndarray:
        """
        Calculates attention-weighted mean pooling across sequence length.
        """
        input_mask_expanded = np.expand_dims(attention_mask, -1).astype(float)
        sum_embeddings = np.sum(last_hidden_state * input_mask_expanded, axis=1)
        sum_mask = np.clip(input_mask_expanded.sum(axis=1), a_min=1e-9, a_max=None)
        return sum_embeddings / sum_mask

    @staticmethod
    def _l2_normalize(vectors: np.ndarray) -> np.ndarray:
        """
        Projects vectors onto the unit hypersphere: ||v||_2 = 1.
        """
        norms = np.linalg.norm(vectors, axis=-1, keepdims=True)
        return vectors / np.clip(norms, a_min=1e-12, a_max=None)

    def encode(self, texts: Union[str, List[str]]) -> np.ndarray:
        """
        Encodes query string or list of strings into 384-dimensional unit vector(s).
        """
        self._initialize()

        if isinstance(texts, str):
            single = True
            texts = [texts]
        else:
            single = False

        if self.session and self.tokenizer:
            # ONNX Runtime inference
            encoded_tokens = self.tokenizer.encode_batch(texts)
            input_ids = np.array([e.ids for e in encoded_tokens], dtype=np.int64)
            attention_mask = np.array([e.attention_mask for e in encoded_tokens], dtype=np.int64)
            token_type_ids = np.array([e.type_ids for e in encoded_tokens], dtype=np.int64)

            # Match ONNX model inputs
            inputs = {
                "input_ids": input_ids,
                "attention_mask": attention_mask,
            }
            input_names = [inp.name for inp in self.session.get_inputs()]
            if "token_type_ids" in input_names:
                inputs["token_type_ids"] = token_type_ids

            outputs = self.session.run(None, inputs)
            last_hidden_state = outputs[0]

            # Pool and normalize
            pooled = self._mean_pooling(last_hidden_state, attention_mask)
            normalized = self._l2_normalize(pooled)
            return normalized[0] if single else normalized

        if self._fallback_model:
            embeddings = self._fallback_model.encode(texts, normalize_embeddings=True)
            return embeddings[0] if single else embeddings

        raise RuntimeError("No active embedder engine.")
