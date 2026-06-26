from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional
import os
import joblib
import numpy as np

# Import the training function in case we need to train the model on startup
from train_model import train_and_save_model

app = FastAPI(
    title="ParkShare AI Recommendation Engine",
    description="Machine Learning service to rank parking spaces based on price, proximity, ratings, traffic, and feature suitability.",
    version="1.0.0"
)

# Global variables
model = None
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'model.joblib')

# Ensure model exists and load it
def load_model():
    global model
    if not os.path.exists(MODEL_PATH):
        print("Model file not found. Running training script...")
        train_and_save_model()
    
    try:
        model = joblib.load(MODEL_PATH)
        print("Scikit-Learn RandomForest Model loaded successfully.")
    except Exception as e:
        print(f"Failed to load model: {e}")
        model = None

@app.on_event("startup")
async def startup_event():
    load_model()

# Schemas
class CandidateSpace(BaseModel):
    id: str
    price: float
    rating: float
    distance: float  # In kilometers
    traffic: int     # 1 (low) to 5 (high)
    peak_hour: int   # 0 or 1
    has_ev: int      # 0 or 1

class RecommendRequest(BaseModel):
    driver_coords: List[float] = Field(..., min_items=2, max_items=2, description="[latitude, longitude]")
    budget: float = Field(default=100.0, description="Preferred max price per hour")
    min_rating: float = Field(default=3.0, description="Minimum acceptable host rating")
    candidates: List[CandidateSpace]

class RecommendationResponse(BaseModel):
    id: str
    confidence_score: float

class RecommendResult(BaseModel):
    success: bool
    count: int
    recommendations: List[RecommendationResponse]

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "model_loaded": model is not None,
        "framework": "FastAPI + Scikit-Learn"
    }

@app.post("/recommend", response_model=RecommendResult)
def get_recommendations(request: RecommendRequest):
    global model
    if model is None:
        load_model()
        if model is None:
            raise HTTPException(status_code=500, detail="Recommendation model could not be loaded")

    if not request.candidates:
        return RecommendResult(success=True, count=0, recommendations=[])

    try:
        # Prepare feature matrix for predictions
        # Features: ['distance', 'price', 'rating', 'traffic', 'peak_hour', 'has_ev']
        features_list = []
        for c in request.candidates:
            features_list.append([
                c.distance,
                c.price,
                c.rating,
                c.traffic,
                c.peak_hour,
                c.has_ev
            ])

        X = np.array(features_list)
        
        # Predict Suitability scores (values between 0.0 and 1.0)
        predicted_scores = model.predict(X)
        
        # Apply filters & user preference adjustments directly to scores
        recommendations = []
        for idx, c in enumerate(request.candidates):
            raw_score = float(predicted_scores[idx])
            
            # Penalize price if it exceeds budget
            if c.price > request.budget:
                excess_ratio = (c.price - request.budget) / request.budget
                raw_score *= max(0.1, 1 - excess_ratio)
            
            # Penalize space if rating is below preferred minimum
            if c.rating < request.min_rating:
                raw_score *= 0.5

            recommendations.append({
                "id": c.id,
                "confidence_score": max(0.01, min(1.0, raw_score))
            })

        # Sort recommendations descending by confidence_score
        recommendations.sort(key=lambda x: x["confidence_score"], reverse=True)

        return RecommendResult(
            success=True,
            count=len(recommendations),
            recommendations=[
                RecommendationResponse(id=r["id"], confidence_score=r["confidence_score"])
                for r in recommendations
            ]
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
