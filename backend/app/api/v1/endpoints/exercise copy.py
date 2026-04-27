from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import pickle
import pandas as pd
import numpy as np

router = APIRouter()

# 모델 미리 로드 (서버 시작 시 한 번만)
with open("./models/benchpress/benchpress.pkl", "rb") as f:
    model = pickle.load(f)

# 프론트에서 보낼 데이터 규격 정의
class LandmarkData(BaseModel):
    landmarks: list  # [x1, y1, z1, v1, x2, y2, z2, v2, ...]

@router.post("/predict")
async def predict_posture(data: LandmarkData):
    try:
        # 1. 받은 리스트를 DataFrame으로 변환 (기존 코드의 row 구성 로직)
        X = pd.DataFrame([data.landmarks])
        
        # 2. 모델 예측
        exercise_class = model.predict(X)[0]
        prob = model.predict_proba(X)[0]
        
        return {
            "status": "success",
            "class": exercise_class,
            "probability": float(max(prob))
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))