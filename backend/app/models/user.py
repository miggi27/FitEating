# backend/app/models/user.py
from sqlalchemy import Column, Integer, String, Float, DateTime
from datetime import datetime
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    password = Column(String)
    
    # 상세 가입 정보
    gender = Column(String)          # 남, 여
    height = Column(Float)           # 키
    weight = Column(Float)           # 체중
    lifestyle = Column(String)       # 학생, 일반사무직 등
    workout_experience = Column(String) # 입문자, 경력자 등
    workout_frequency = Column(String)  # 주1회, 주2회 등
    fitness_level = Column(String)      # 나쁨:못 달리겠어요 등
    goal = Column(String)            # 체중감소, 유지, 벌크업 등
    
    created_at = Column(DateTime, default=datetime.now)