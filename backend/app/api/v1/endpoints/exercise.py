from fastapi import APIRouter
from pydantic import BaseModel
from app.services.exercise_service import exercise_service

router = APIRouter()

# 데이터 규격 정의 (x, y, z, v가 33쌍이므로 총 132개 숫자 리스트)
class AnalysisRequest(BaseModel):
    landmarks: list 

@router.post("/analyze")
async def analyze_pose(request: AnalysisRequest):
    # 서비스 클래스의 predict 함수 호출
    result = exercise_service.predict(request.landmarks)
    return result