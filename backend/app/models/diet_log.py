# backend/app/models/diet.py
from sqlalchemy import Column, Integer, String, Float, DateTime, Date
from sqlalchemy.sql import func
from app.database import Base
from datetime import datetime
from fastapi import Form # 👈 Form 임포트 추가!

class DietLog(Base):
    __tablename__ = "diet_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True) # 검색 성능을 위해 인덱스 추가
    
    # 🟢 수정 포인트: 실제 식사 날짜(검색용)와 데이터 생성 시각(기록용) 분리
    date = Column(Date, default=datetime.now().date(), index=True) 
    created_at = Column(DateTime, server_default=func.now()) # 기록 날짜

    meal_type = Column(String)  # 아침, 점심, 저녁, 간식
    food_name = Column(String)
    
    # 영양 정보 추가
    calories = Column(Float, default=0.0) # 칼로리
    carbs = Column(Float, default=0.0)    # 탄수화물
    protein = Column(Float, default=0.0)  # 단백질
    fat = Column(Float, default=0.0)      # 지방
    
    # 사진 정보 (이미지 파일 경로 또는 URL)
    image_url = Column(String, nullable=True) 
    
    # 즐겨찾기 여부
    is_favorite = Column(Integer, default=0) # 1이면 즐겨찾기