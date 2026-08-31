from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any
from app.core.deps import get_current_user
from app.ml.predictors import ml_predictor
from pydantic import BaseModel

router = APIRouter()

class YieldPredictRequest(BaseModel):
    crop_type: str
    season: str
    area: float
    farm_id: str

class ProfitPredictRequest(BaseModel):
    crop_type: str
    season: str
    area: float
    farm_id: str

class AnomalyRequest(BaseModel):
    category: str
    amount: float
    farm_id: str
    farm_area: float = 1.0 # Defaulting for now if farm area isn't passed

class CategorizeRequest(BaseModel):
    description: str

@router.get("/status")
async def get_ai_status():
    """Get the status and metadata of the AI models."""
    return ml_predictor.get_status()

@router.post("/yield/predict")
async def predict_yield(req: YieldPredictRequest, user=Depends(get_current_user)):
    """Predict crop yield based on features."""
    if req.area <= 0:
        raise HTTPException(status_code=400, detail="Area must be greater than 0.")
    
    try:
        result = ml_predictor.predict_yield(
            crop_type=req.crop_type,
            season=req.season,
            area=req.area
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=503, detail="AI models are currently unavailable.")

@router.post("/profit/predict")
async def predict_profit(req: ProfitPredictRequest, user=Depends(get_current_user)):
    """Predict net profit for a crop."""
    if req.area <= 0:
        raise HTTPException(status_code=400, detail="Area must be greater than 0.")
    
    try:
        result = ml_predictor.predict_profit(
            crop_type=req.crop_type,
            season=req.season,
            area=req.area
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=503, detail="AI models are currently unavailable.")

@router.post("/expense/anomaly")
async def detect_anomaly(req: AnomalyRequest, user=Depends(get_current_user)):
    """Detect if an expense is an anomaly."""
    if req.amount < 0:
        raise HTTPException(status_code=400, detail="Amount cannot be negative.")
    
    try:
        result = ml_predictor.detect_anomaly(
            category=req.category,
            farm_area=req.farm_area,
            amount=req.amount
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=503, detail="AI models are currently unavailable.")

@router.post("/expense/categorize")
async def categorize_expense(req: CategorizeRequest, user=Depends(get_current_user)):
    """Categorize an expense description using NLP."""
    try:
        result = ml_predictor.categorize_expense(req.description)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=503, detail="AI models are currently unavailable.")
