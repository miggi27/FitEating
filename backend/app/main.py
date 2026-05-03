# backend/app/main.py
from fastapi import FastAPI
from app.api.v1.endpoints import exercise, diet
from fastapi.middleware.cors import CORSMiddleware
from sqladmin import Admin, ModelView
from sqlalchemy import Column, Integer, String, DateTime, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import create_engine
from datetime import datetime

app = FastAPI()

# --- [DB 설정 시작] ---
DATABASE_URL = "sqlite:///./test.db"  # 현재 폴더에 test.db 파일이 생깁니다.
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
Base = declarative_base()

# 블로그/운동로그 모델 정의
class WorkoutLog(Base):
    __tablename__ = "workout_logs"
    id = Column(Integer, primary_key=True, index=True)
    exercise_name = Column(String)  # SQUAT, DEAD 등
    counter = Column(Integer)       # 횟수
    score = Column(Float)           # 분석 점수
    image_path = Column(String)     # 빨간 원 캡처 저장 경로
    created_at = Column(DateTime, default=datetime.now)

# DB 테이블 생성
Base.metadata.create_all(bind=engine)
# --- [DB 설정 끝] ---

# CORS 설정 (기존 유지)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 🟢 SQLAdmin 설정 (관리자 페이지)
admin = Admin(app, engine)

class WorkoutLogAdmin(ModelView, model=WorkoutLog):
    # 리스트에 보여줄 컬럼들 (문자열로 써도 여긴 괜찮습니다)
    column_list = ["id", "exercise_name", "counter", "score", "created_at"]
    
    # ✅ 검색 기능은 그대로 두셔도 됩니다.
    column_searchable_list = ["exercise_name"]
    
    # ❌ 에러의 주범인 필터 기능을 일단 제거합니다.
    # column_filters = ["exercise_name"]  <-- 이 줄을 삭제하거나 주석 처리하세요.
    
    name = "운동 기록"
    name_plural = "운동 기록 목록"
    icon = "fa-solid fa-chart-line"

admin.add_view(WorkoutLogAdmin)

# 라우터 등록
app.include_router(exercise.router, prefix="/api/v1/exercise", tags=["exercise"])
app.include_router(diet.router, prefix="/api/v1/diet", tags=["diet"])

@app.get("/")
def read_root():
    return {"status": "online", "message": "Fit-Eating API Server"}