# backend/app/models/diet.py
from sqlalchemy import Column, Integer, String, Float, DateTime
from datetime import datetime
from app.database import Base

class DietLog(Base):
    __tablename__ = "diet_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer)
    
    date = Column(DateTime, default=datetime.now) # 기록 날짜
    meal_type = Column(String)  # 아침, 점심, 저녁, 간식
    food_name = Column(String)
    
    # 영양 정보 추가
    calories = Column(Float)
    carbs = Column(Float)    # 탄수화물
    protein = Column(Float)  # 단백질
    fat = Column(Float)      # 지방
    
    # 사진 정보 (이미지 파일 경로 또는 URL)
    image_url = Column(String, nullable=True) 
    
    # 즐겨찾기 여부
    is_favorite = Column(Integer, default=0) # 1이면 즐겨찾기