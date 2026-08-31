import os
import json
import joblib
import pandas as pd
import numpy as np

# Set up paths
ML_DIR = os.path.dirname(__file__)
MODELS_DIR = os.path.join(ML_DIR, "saved_models")

class FarmFlowPredictor:
    def __init__(self):
        self.models_loaded = False
        self.yield_model = None
        self.profit_model = None
        self.anomaly_model = None
        self.nlp_model = None
        self.metadata = None

    def load_models(self):
        """Load all ML models into memory."""
        try:
            with open(os.path.join(MODELS_DIR, 'metadata.json'), 'r') as f:
                self.metadata = json.load(f)

            self.yield_model = joblib.load(os.path.join(MODELS_DIR, 'yield_model_v1.joblib'))
            self.profit_model = joblib.load(os.path.join(MODELS_DIR, 'profit_model_v1.joblib'))
            self.anomaly_model = joblib.load(os.path.join(MODELS_DIR, 'anomaly_model_v1.joblib'))
            self.nlp_model = joblib.load(os.path.join(MODELS_DIR, 'expense_nlp_v1.joblib'))
            self.models_loaded = True
            print("Successfully loaded AI models from disk.")
        except Exception as e:
            print(f"Error loading AI models: {e}")
            self.models_loaded = False

    def get_status(self):
        if not self.models_loaded:
            return {"status": "unavailable", "message": "Models are not loaded"}
        return {
            "status": "ready",
            "metadata": self.metadata
        }

    def predict_yield(self, crop_type: str, season: str, area: float) -> dict:
        if not self.models_loaded:
            raise Exception("Models not loaded")
        
        # Prepare input data as dataframe to match training schema
        df = pd.DataFrame([{
            'crop_type': crop_type,
            'season': season,
            'area': area
        }])
        
        try:
            pred = self.yield_model.predict(df)[0]
            # Random forest trees in scikit-learn don't easily export feature importances directly 
            # if wrapped in a Pipeline with OneHotEncoder, so we just provide generic factors.
            return {
                "estimated_yield_kg": round(float(pred), 2),
                "factors": ["Crop Type", "Season", "Area (Acres)"]
            }
        except ValueError as e:
            # If the crop type is unknown to the model
            raise ValueError(f"Unknown crop type or season. Ensure sufficient historical data exists. Error: {e}")

    def predict_profit(self, crop_type: str, season: str, area: float) -> dict:
        if not self.models_loaded:
            raise Exception("Models not loaded")
        
        df = pd.DataFrame([{
            'crop_type': crop_type,
            'season': season,
            'area': area
        }])
        
        try:
            pred = self.profit_model.predict(df)[0]
            return {
                "estimated_profit": round(float(pred), 2),
                "factors": ["Crop Type", "Season", "Area (Acres)"]
            }
        except ValueError as e:
            raise ValueError(f"Unknown crop type or season. Error: {e}")

    def detect_anomaly(self, category: str, farm_area: float, amount: float) -> dict:
        if not self.models_loaded:
            raise Exception("Models not loaded")
        
        df = pd.DataFrame([{
            'category': category,
            'farm_area': farm_area,
            'amount': amount
        }])
        
        try:
            # Predict returns 1 for inliers, -1 for outliers
            pred = self.anomaly_model.predict(df)[0]
            score = self.anomaly_model.decision_function(df)[0]
            
            is_anomaly = bool(pred == -1)
            reason = "Expense is significantly higher than expected for this category and farm size." if is_anomaly else "Expense is within normal range."
            
            return {
                "is_anomaly": is_anomaly,
                "anomaly_score": round(float(score), 4),
                "reason": reason
            }
        except Exception as e:
            raise ValueError(f"Could not process anomaly detection: {e}")

    def categorize_expense(self, description: str) -> dict:
        if not self.models_loaded:
            raise Exception("Models not loaded")
        
        if not description or len(description.strip()) < 3:
            return {"category": "Other", "confidence": 0.0}

        try:
            # Predict returns an array
            pred = self.nlp_model.predict([description])[0]
            
            # Get probabilities
            probs = self.nlp_model.predict_proba([description])[0]
            confidence = float(np.max(probs))
            
            return {
                "category": pred,
                "confidence": round(confidence * 100, 2) # As percentage
            }
        except Exception as e:
            raise ValueError(f"Could not categorize text: {e}")

# Global instance to be loaded once
ml_predictor = FarmFlowPredictor()
