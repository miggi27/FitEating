# backend/app/models/exercise.py
from sqlalchemy import Column, Integer, String, Float, DateTime
from datetime import datetime
from app.database import Base

# 블로그/운동로그 모델 정의
class WorkoutLog(Base):
    __tablename__ = "workout_logs"
    id = Column(Integer, primary_key=True, index=True)
    exercise_name = Column(String)  # SQUAT, DEAD 등
    counter = Column(Integer)       # 횟수
    score = Column(Float)           # 분석 점수
    image_path = Column(String)     # 빨간 원 캡처 저장 경로
    created_at = Column(DateTime, default=datetime.now)