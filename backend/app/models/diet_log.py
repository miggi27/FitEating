# backend/app/models/diet_log.py

from sqlalchemy import Column, Integer, String, Float, DateTime, Date
from sqlalchemy.sql import func
from app.database import Base
from datetime import datetime

class DietLog(Base):
    __tablename__ = "diet_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True) # 유저 식별용
    
    # 식사 날짜와 기록 시각 분리
    date = Column(Date, default=lambda: datetime.now().date(), index=True) 
    created_at = Column(DateTime, server_default=func.now()) 
    
    meal_type = Column(String)  # 아침, 점심, 저녁, 간식
    food_name = Column(String)
    
    # 영양 정보
    calories = Column(Float, default=0.0)
    carbs = Column(Float, default=0.0)    
    protein = Column(Float, default=0.0)  
    fat = Column(Float, default=0.0)      
    
    image_url = Column(String, nullable=True) 
    is_favorite = Column(Integer, default=0)