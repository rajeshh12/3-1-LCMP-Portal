import os
from pathlib import Path

import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException

from .schemas import DeadlineFeatures, Prediction

ROOT = Path(__file__).resolve().parents[1]
MODEL_PATH = Path(os.getenv("MODEL_PATH", ROOT / "models" / "deadline-risk.joblib"))
LOW_THRESHOLD = float(os.getenv("RISK_LOW_THRESHOLD", "0.30"))
HIGH_THRESHOLD = float(os.getenv("RISK_HIGH_THRESHOLD", "0.65"))
app = FastAPI(title="Briefcase Deadline Risk Service", version="1.0.0")
model_bundle = None


@app.on_event("startup")
def load_model():
    global model_bundle
    if MODEL_PATH.exists():
        model_bundle = joblib.load(MODEL_PATH)


@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": model_bundle is not None}


@app.post("/predict", response_model=Prediction)
def predict(features: DeadlineFeatures):
    if model_bundle is None:
        raise HTTPException(status_code=503, detail="No trained model loaded; run python scripts/train_model.py")
    try:
        frame = pd.DataFrame([features.model_dump()])
        probability = float(model_bundle["model"].predict_proba(frame)[0][1])
    except (ValueError, KeyError) as error:
        raise HTTPException(status_code=422, detail=f"Prediction input could not be processed: {error}") from error
    category = "LOW RISK" if probability < LOW_THRESHOLD else "MEDIUM RISK" if probability < HIGH_THRESHOLD else "HIGH RISK"
    return Prediction(probability=probability, category=category, source=model_bundle["selected_model"])
