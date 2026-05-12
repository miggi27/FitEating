from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict
import math

from app.database import get_db
from app.models.routine_log import UserRoutineStats, RoutineLog
from app.schemas.routine import DailyPlanResponse, RoutineStatUpdate, RoutineStatResponse
from app.services.routine_calculator import RoutineCalculator
from pydantic import BaseModel

router = APIRouter()

EXERCISE_NAMES_KO = {
    "squat": "스쿼트",
    "bench": "벤치프레스",
    "deadlift": "데드리프트",
    "ohp": "오버헤드 프레스",
    "row": "바벨 로우",
}

# --- 핵심: 하나의 함수에서 모든 /plan 요청을 처리합니다 ---
@router.get("/plan/{routine_id}", response_model=DailyPlanResponse)
def get_daily_plan(routine_id: str, db: Session = Depends(get_db)):
    # 1. 루틴 아이디를 대문자로 변환하여 판별
    rid = routine_id.upper()
    
    # 2. 루틴별 운동 구성 정의 (여기서 루틴이 결정됩니다)
    workout_configs = {
        "A": ["squat", "bench", "row"],
        "B": ["squat", "ohp", "deadlift"],
        "NSUNS": ["squat", "bench", "deadlift", "ohp"] # 3번째 루틴 추가
    }
    
    # 요청한 루틴이 없으면 기본값 'A'로 설정
    selected_routine = rid if rid in workout_configs else "A"
    exercises_to_do = workout_configs[selected_routine]
    
    # 3. 유저의 TM(Training Max) 가져오기
    stats = db.query(UserRoutineStats).all()
    stats_dict = {s.exercise_name: s.training_max for s in stats}

    full_plan_exercises = []

    for ex_name in exercises_to_do:
        tm = stats_dict.get(ex_name, 40.0) # 없으면 기본 40kg
        
        # 5x5 인지 nSuns 인지에 따라 세트/무게 로직 분리 가능
        if selected_routine == "NSUNS":
            # nSuns 스타일 (예시: 고중량 3세트)
            weight = math.floor((tm * 0.9) / 2.5 + 0.5) * 2.5
            main_sets = [{"weight": weight, "reps": 3}, {"weight": weight, "reps": 3}, {"weight": weight, "reps": 3}]
        else:
            # 기본 5x5 스타일
            set_count = 1 if ex_name == "deadlift" else 5
            weight = math.floor(tm / 2.5 + 0.5) * 2.5
            main_sets = [{"weight": weight, "reps": 5} for _ in range(set_count)]
        
        full_plan_exercises.append({
            "name": ex_name,
            "name_ko": EXERCISE_NAMES_KO.get(ex_name, ex_name),
            "warmup_sets": RoutineCalculator.get_warmup_sets(tm),
            "main_sets": main_sets
        })

    return {
        "routine_name": f"Program - {selected_routine}",
        "day_label": f"Workout {selected_routine}",
        "exercises": full_plan_exercises
    }

# --- 나머지 통계 및 업데이트 API (중복 제거) ---

@router.get("/stats")
def get_workout_stats(db: Session = Depends(get_db)):
    logs = db.query(RoutineLog).order_by(RoutineLog.workout_date.desc()).limit(10).all()
    stats = db.query(UserRoutineStats).all()
    
    formatted_history = []
    for l in logs:
        # JSON 데이터에서 운동 이름들만 뽑아옵니다 (ex: "스쿼트, 벤치프레스")
        ex_names = ", ".join([item.get('ex', '') for item in l.session_data]) if l.session_data else "기록 없음"
        
        formatted_history.append({
            "date": l.workout_date.strftime("%Y-%m-%d"),
            "exercise": ex_names, # 이제 모델에 없는 필드 대신 가공한 데이터를 넣습니다
            "weight": l.total_volume, # 개별 무게 대신 오늘 총 볼륨으로 대체하거나 생략
            "success": True 
        })
    
    return {
        "history": formatted_history,
        "current_status": {s.exercise_name: {"1rm": s.current_1rm, "tm": s.training_max} for s in stats}
    }

# 1. 요청 데이터를 받기 위한 스키마 (클래스)
class WorkoutResultRequest(BaseModel):
    routine_name: str
    exercises: List[Dict] # [{'name': 'squat', 'completed_sets': 5, 'weight': 60.0}, ...]

# 2. 운동 완료 처리 API
@router.post("/finish-workout")
def finish_workout(data: WorkoutResultRequest, db: Session = Depends(get_db)):
    # 1. 프론트에서 받은 데이터를 모델이 원하는 JSON 구조로 변환
    session_info = []
    total_vol = 0.0
    
    for ex in data.exercises:
        is_success = (ex['completed_sets'] == 5)
        
        # JSON에 들어갈 상세 정보 구성
        ex_data = {
            "ex": ex['name'],
            "weight": ex['weight'],
            "completed": ex['completed_sets'],
            "success": is_success
        }
        session_info.append(ex_data)
        
        # 총 볼륨 계산 (무게 * 횟수)
        total_vol += (ex['weight'] * ex['completed_sets'] * 5) # 5x5 기준

        # 2. 증량 로직 (UserRoutineStats 업데이트)
        stats = db.query(UserRoutineStats).filter(
            UserRoutineStats.exercise_name == ex['name']
        ).first()
        
        if stats and is_success:
            # 모델에 있는 step_weight(기본 2.5)를 활용하거나 수동 증량
            increment = 5.0 if ex['name'] == 'deadlift' else 2.5
            stats.training_max += increment

    # 3. 모델 저장 (필드명을 모델 정의와 똑같이 맞춤!)
    new_log = RoutineLog(
        user_id=1,  # 임시
        routine_name=data.routine_name,
        workout_date=datetime.now(),
        session_data=session_info,  # <--- 아까 터졌던 부분! JSON으로 통째로 넣음
        total_volume=total_vol
    )
    
    db.add(new_log)
    db.commit()
    return {"status": "success"}

@router.get("/dashboard-stats")
def get_dashboard_stats(db: Session = Depends(get_db)):
    try:
        today = datetime.now().date()
        
        # ❌ 에러 난 부분: db.func.date(...)
        # ✅ 수정 후: func.date(...) 직접 사용
        today_logs = db.query(RoutineLog).filter(
            func.date(RoutineLog.workout_date) == today
        ).all()

        # 디버깅용: 로그가 몇 개나 잡히는지 서버 터미널에 찍어보세요
        print(f"오늘의 로그 개수: {len(today_logs)}")

        # 데이터가 없을 경우를 위한 방어 코드
        total_volume = sum(log.total_volume for log in today_logs) if today_logs else 0
        burned_kcal = int(total_volume * 0.05)
        total_minutes = len(today_logs) * 45 

        return {
            "workout_time": total_minutes,
            "burned_calories": burned_kcal,
            "total_volume": total_volume,
            "is_active": len(today_logs) > 0
        }
    except Exception as e:
        # 서버 에러 시 500을 내뱉는 대신 에러 메시지 확인
        print(f"대시보드 에러 발생: {e}")
        raise HTTPException(status_code=500, detail=str(e))