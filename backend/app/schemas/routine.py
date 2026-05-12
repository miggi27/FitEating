from pydantic import BaseModel, Field
from typing import List, Optional, Any
from datetime import datetime

# 1. 유저의 현재 1RM 상태 정보 (Stats)
class RoutineStatBase(BaseModel):
    exercise_name: str
    current_1rm: float
    training_max: float

class RoutineStatUpdate(BaseModel):
    """프론트에서 1RM 정보를 업데이트할 때 사용"""
    exercise_name: str
    current_1rm: float

class RoutineStatResponse(RoutineStatBase):
    """DB에서 데이터를 꺼내 프론트로 보낼 때 사용"""
    id: int
    last_updated: datetime

    class Config:
        from_attributes = True

# 2. 루틴 수행 기록 (Log)
class RoutineLogCreate(BaseModel):
    """운동 완료 후 저장 요청을 보낼 때 사용"""
    routine_name: str
    session_data: List[dict] # [ {"ex": "squat", "sets": [...]}, ... ]
    total_volume: float
    memo: Optional[str] = None

class RoutineLogResponse(BaseModel):
    """저장된 운동 기록을 불러올 때 사용"""
    id: int
    workout_date: datetime
    routine_name: str
    session_data: Any
    total_volume: float
    memo: Optional[str]

    class Config:
        from_attributes = True

# 3. 오늘 해야 할 계획 (Plan) - 계산기 결과용
class DailyPlanResponse(BaseModel):
    """오늘 해야 할 운동 계획 응답 (첨부해주신 파이썬 로직 결과물)"""
    routine_name: str
    day_label: str  # 예: "Week 1 - Day 1"
    exercises: List[dict] # 계산된 무게, 세트, 횟수, 플레이트 계산 결과 등 포함