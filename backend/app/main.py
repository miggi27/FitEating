# backend/app/main.py
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqladmin import Admin, ModelView
# 새로 만든 구조에서 가져오기
from app.database import engine, Base
from app.models.user import User
from app.models.diet_log import DietLog
from app.models.exercise_log import WorkoutLog
# 기존 라우터들
from app.api.v1.endpoints import exercise, diet, auth

from pydantic import BaseModel  # 추가
import httpx
from fastapi.staticfiles import StaticFiles
from app.api.v1.endpoints import routine

app = FastAPI()

# 2. 허용할 Origin(프론트엔드 주소) 목록 작성
origins = [
    "http://localhost:5173",  # 리액트 Vite 기본 포트
    "http://127.0.0.1:5173",
]

# CORS 설정 (기존 유지)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    # allow_origins=origins, # 리액트 주소
    allow_credentials=True,
    allow_methods=["*"], # 모든 방식(GET, POST 등) 허용
    allow_headers=["*"], # 모든 헤더 허용
)

# 테이블 생성 (이 한 줄이 모든 모델의 테이블을 test.db에 만듭니다)
Base.metadata.create_all(bind=engine)

# 1. 현재 main.py 파일의 위치를 기준으로 경로 설정
# main.py가 backend/app/main.py에 있다면:
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__)) # backend/app
STATIC_DIR = os.path.join(CURRENT_DIR, "static")

# 2. 경로가 실제로 존재하는지 확인 (디버깅용)
if not os.path.exists(STATIC_DIR):
    print(f"❌ 설정된 경로에 폴더가 없습니다: {STATIC_DIR}")
else:
    print(f"✅ 정적 파일 경로 연결됨: {STATIC_DIR}")

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
# --- 관리자 페이지 설정 (컬럼 상세화) ---

# 라우터 등록
app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(exercise.router, prefix="/api/v1/exercise", tags=["exercise"])
app.include_router(diet.router, prefix="/api/v1/diet", tags=["diet"])
app.include_router(routine.router, prefix="/api/v1/routine", tags=["routine"])
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.get("/")
def read_root():
    return {"status": "online", "message": "Fit-Eating API Server"}

# 1. 데이터를 받을 구조 정의 (프론트에서 보낸 키값과 일치해야 함)
class FeedbackRequest(BaseModel):
    workout_data: str = ""
    food_data: str = ""
    type: str = "DEFAULT"  # 👈 이렇게 기본값을 주면 에러(422)를 방지할 수 있습니다.

@app.post("/ai-feedback")
async def get_feedback(data: FeedbackRequest):  # data 객체로 받음
    # 1. 페이지 타입별 프롬프트 사전(Dictionary) 정의
    prompts = {
        # 전체 식단 페이지용
        "TOTAL_DIET": f"너는 영양사야. 오늘의 전체 영양소({data.food_data})를 보고 하루 총평을 2줄로 해줘.",
        
        # 아침 식사 전용 (아침에 맞는 조언)
        "BREAKFAST": f"너는 식단 코치야. 아침 식사({data.food_data}) 구성을 보고 하루의 시작을 위한 피드백을 2줄로 해줘.",
        
        # 운동 결과 페이지용
        "EXERCISE_RESULT": f"너는 전문 트레이너야. 방금 마친 {data.workout_data} 기록을 보고 자세나 강도에 대해 2줄로 칭찬해줘.",
        
        # 메인 대시보드용 (종합 피드백)
        "DASHBOARD": f"너는 건강 관리사야. 오늘의 운동({data.workout_data})과 식단({data.food_data})을 종합해서 짧게 한마디 해줘."
    }

    # 2. 전송된 type에 맞는 프롬프트 선택 (없으면 기본 프롬프트)
    selected_prompt = prompts.get(data.type, "너는 건강 도우미야. 데이터에 대해 짧게 조언해줘.")
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                "http://localhost:11434/api/generate",
                json={
                    "model": "gemma3:4b",
                    "prompt": selected_prompt,
                    "stream": False
                },
                timeout=60.0
            )
            result = response.json()
            return {"feedback": result['response']}
        except Exception as e:
            return {"feedback": f"Ollama 연결 실패: {str(e)}"}