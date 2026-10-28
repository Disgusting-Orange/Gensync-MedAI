"""
GenSync-Cache: Real Embeddings, Centroid & Radius Computation
Model: sentence-transformers/all-MiniLM-L6-v2 (384 dimensions, L2-normalized)

This script calculates REAL embeddings for the seed questions and computes the mathematical
centroid and radius for each topic cluster. No fabricated or random vectors are used.
"""

import json
import os
import sys
from pathlib import Path
import numpy as np

try:
    from sentence_transformers import SentenceTransformer
except ImportError:
    print("Error: sentence-transformers not found. Run: pip install sentence-transformers")
    sys.exit(1)


def normalize(v: np.ndarray) -> np.ndarray:
    norm = np.linalg.norm(v)
    if norm == 0:
        return v
    return v / norm


def compute_seed_embeddings(
    input_path: Path,
    output_path: Path,
    model_name: str = "sentence-transformers/all-MiniLM-L6-v2",
):
    print(f"[1/4] Loading seed dataset from {input_path}...")
    with open(input_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    print(f"[2/4] Loading embedding model: {model_name}...")
    model = SentenceTransformer(model_name)

    total_entries = 0
    embedded_clusters = []

    print("[3/4] Generating embeddings and calculating real cluster centroids/radii...")
    for cluster in data["clusters"]:
        cluster_id = cluster["cluster_id"]
        cluster_name = cluster["cluster_name"]
        entries = cluster["entries"]

        questions = [entry["approved_question"] for entry in entries]
        print(f"  -> Encoding {len(questions)} questions in cluster: '{cluster_name}'...")

        # Encode with L2 normalization enabled
        embeddings = model.encode(questions, normalize_embeddings=True)
        embeddings = np.array(embeddings, dtype=np.float32)

        # Attach real vector to each entry
        for i, entry in enumerate(entries):
            entry["embedding"] = embeddings[i].tolist()
            entry["embedding_dim"] = int(embeddings.shape[1])
            total_entries += 1

        # Centroid calculation: normalized mean of vectors
        centroid_raw = np.mean(embeddings, axis=0)
        centroid = normalize(centroid_raw)

        # Radius calculation: max cosine distance (1 - cos_sim) from centroid
        # Since centroid and embeddings are unit vectors, cos_sim = dot product
        cos_sims = np.dot(embeddings, centroid)
        cos_distances = 1.0 - cos_sims
        cluster_radius = float(np.max(cos_distances))
        min_sim_to_centroid = float(np.min(cos_sims))

        # Recommended candidate gate: coarse domain pruning margin (0.12 below cluster min)
        gate_threshold = round(max(0.60, min_sim_to_centroid - 0.12), 3)

        cluster_record = {
            "cluster_id": cluster_id,
            "cluster_name": cluster_name,
            "description": cluster["description"],
            "model_name": model_name,
            "embedding_dim": int(embeddings.shape[1]),
            "centroid_vector": centroid.tolist(),
            "cluster_radius": round(cluster_radius, 6),
            "candidate_gate_threshold": gate_threshold,
            "min_sim_to_centroid": round(min_sim_to_centroid, 4),
            "entry_count": len(entries),
            "entries": entries,
        }
        embedded_clusters.append(cluster_record)
        print(
            f"     Radius={cluster_radius:.4f}, MinSim={min_sim_to_centroid:.4f}, GateThreshold={gate_threshold}"
        )

    output_data = {
        "metadata": {
            "model_name": model_name,
            "vector_dimension": 384,
            "normalization": "L2_unit_sphere",
            "distance_metric": "cosine",
            "total_clusters": len(embedded_clusters),
            "total_entries": total_entries,
        },
        "clusters": embedded_clusters,
    }

    print(f"[4/4] Writing embedded seed dataset to {output_path}...")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(output_data, f, indent=2)

    print(
        f"\nSUCCESS: Embedded {total_entries} approved entries across {len(embedded_clusters)} clusters."
    )
    return output_data


if __name__ == "__main__":
    base_dir = Path(__file__).resolve().parent
    in_file = base_dir / "seed_data.json"
    out_file = base_dir / "seed_data_embedded.json"
    compute_seed_embeddings(in_file, out_file)
