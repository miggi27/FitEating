# backend/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqladmin import Admin, ModelView
# 새로 만든 구조에서 가져오기
from app.database import engine, Base
from app.models.user import User
from app.models.diet import DietLog
from app.models.exercise import WorkoutLog
# 기존 라우터들
from app.api.v1.endpoints import exercise, diet, auth

app = FastAPI()

# 테이블 생성 (이 한 줄이 모든 모델의 테이블을 test.db에 만듭니다)
Base.metadata.create_all(bind=engine)

# CORS 설정 (기존 유지)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 관리자 페이지 설정 (컬럼 상세화) ---
admin = Admin(app, engine)

class UserAdmin(ModelView, model=User):
    # 회원가입 상세 정보들을 리스트에서 볼 수 있게 추가
    column_list = [
        "id", "username", "gender", "height", "weight", 
        "lifestyle", "goal", "created_at"
    ]
    name = "회원 관리"
    icon = "fa-solid fa-user"

class DietAdmin(ModelView, model=DietLog):
    # 탄단지 영양소 정보를 리스트에 표시
    column_list = [
        "id", "meal_type", "food_name", "calories", 
        "carbs", "protein", "fat", "date"
    ]
    name = "식단 관리"
    icon = "fa-solid fa-utensils"

class WorkoutLogAdmin(ModelView, model=WorkoutLog):
    column_list = ["id", "exercise_name", "counter", "score", "created_at"]
    name = "운동 기록"
    icon = "fa-solid fa-dumbbell"

admin.add_view(UserAdmin)
admin.add_view(DietAdmin)
admin.add_view(WorkoutLogAdmin)

# 라우터 등록
app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(exercise.router, prefix="/api/v1/exercise", tags=["exercise"])
app.include_router(diet.router, prefix="/api/v1/diet", tags=["diet"])

@app.get("/")
def read_root():
    return {"status": "online", "message": "Fit-Eating API Server"}