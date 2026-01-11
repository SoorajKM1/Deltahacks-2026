import os
import io
import json
import base64
from typing import Dict, Any, Tuple, List
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from PIL import Image

import numpy as np
import cv2
from deepface import DeepFace

app = FastAPI(title="NeuroVault Vision (DeepFace)")

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))  # NeuroVault/
DATA_DIR = os.path.join(REPO_ROOT, "data")
IMAGES_DIR = os.path.join(DATA_DIR, "images")
LABELS_PATH = os.path.join(DATA_DIR, "labels.json")

MODEL_NAME = "Facenet512"   # good accuracy
DISTANCE_METRIC = "cosine"

# In-memory DB
DB: List[Dict[str, Any]] = []

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
class IdentifyRequest(BaseModel):
    image_base64: str  # data URL or raw base64


def _strip_data_url(b64: str) -> str:
    if "," in b64 and b64.strip().lower().startswith("data:"):
        return b64.split(",", 1)[1]
    return b64


def _image_from_base64(b64: str) -> np.ndarray:
    try:
        raw = base64.b64decode(_strip_data_url(b64))
        pil = Image.open(io.BytesIO(raw)).convert("RGB")
        return cv2.cvtColor(np.array(pil), cv2.COLOR_RGB2BGR)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image_base64: {e}")


def _load_labels() -> Dict[str, Any]:
    if not os.path.exists(LABELS_PATH):
        raise FileNotFoundError(f"labels.json not found at {LABELS_PATH}")
    with open(LABELS_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def _embed_image_bgr(img_bgr: np.ndarray) -> np.ndarray:
    """
    Returns a 1D embedding vector.
    enforce_detection=False so it does not hard fail on a bad frame.
    """
    rep = DeepFace.represent(
        img_path=img_bgr,
        model_name=MODEL_NAME,
        enforce_detection=False
    )

    # DeepFace can return list[dict] or dict depending on version
    if isinstance(rep, list) and len(rep) > 0:
        emb = rep[0].get("embedding")
    else:
        emb = rep.get("embedding")

    if emb is None:
        raise ValueError("No embedding produced")
    return np.array(emb, dtype=np.float32)


def _cosine_distance(a: np.ndarray, b: np.ndarray) -> float:
    a = a / (np.linalg.norm(a) + 1e-8)
    b = b / (np.linalg.norm(b) + 1e-8)
    return float(1.0 - np.dot(a, b))


def rebuild_db() -> Dict[str, Any]:
    global DB
    labels = _load_labels()

    if not os.path.isdir(IMAGES_DIR):
        raise FileNotFoundError(f"Images folder not found: {IMAGES_DIR}")

    items = []
    for filename, meta in labels.items():
        path = os.path.join(IMAGES_DIR, filename)
        if not os.path.exists(path):
            print(f"⚠️ Missing image for labels.json entry: {path}")
            continue

        img_bgr = cv2.imread(path)
        if img_bgr is None:
            print(f"⚠️ Could not read image: {path}")
            continue

        try:
            emb = _embed_image_bgr(img_bgr)
        except Exception as e:
            print(f"⚠️ Embedding failed for {filename}: {e}")
            continue

        items.append({
            "filename": filename,
            "label": meta.get("label", os.path.splitext(filename)[0]),
            "memory_id": meta.get("memory_id"),
            "embedding": emb
        })

    DB = items
    return {"ok": True, "count": len(DB)}


def best_match(capture_emb: np.ndarray) -> Tuple[Dict[str, Any], float]:
    if not DB:
        raise HTTPException(status_code=500, detail="DB is empty. Call /rebuild first.")

    best_item = None
    best_dist = 10.0
    for item in DB:
        dist = _cosine_distance(capture_emb, item["embedding"])
        if dist < best_dist:
            best_dist = dist
            best_item = item

    if best_item is None:
        raise HTTPException(status_code=500, detail="No candidates in DB")
    return best_item, best_dist


@app.on_event("startup")
def _startup():
    try:
        r = rebuild_db()
        print(f"✅ DeepFace DB ready: {r['count']} refs")
    except Exception as e:
        print(f"⚠️ Startup rebuild failed: {e}")


@app.get("/health")
def health():
    return {"ok": True, "images_dir": IMAGES_DIR, "labels_path": LABELS_PATH, "db_count": len(DB)}


@app.post("/rebuild")
def rebuild():
    return rebuild_db()


@app.post("/identify")
def identify(req: IdentifyRequest):
    img_bgr = _image_from_base64(req.image_base64)

    try:
        emb = _embed_image_bgr(img_bgr)
    except Exception:
        return {"label": "unknown", "confidence": 0.0, "distance": None, "memory_id": None}

    item, dist = best_match(emb)

    # Typical cosine thresholds:
    # < 0.30 strong, 0.30-0.40 ok, > 0.45 likely wrong
    if dist > 0.45:
        return {
            "label": "unknown",
            "confidence": round(max(0.0, 1.0 - dist), 3),
            "distance": round(dist, 4),
            "memory_id": None
        }

    return {
        "label": item["label"],
        "memory_id": item.get("memory_id"),
        "confidence": round(max(0.0, 1.0 - dist), 3),
        "distance": round(dist, 4),
        "match_filename": item["filename"]
    }
