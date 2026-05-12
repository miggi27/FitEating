from sqlalchemy import Column, Integer, String, Float, DateTime, JSON, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class UserRoutineStats(Base):
    __tablename__ = "user_routine_stats"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    exercise_name = Column(String, index=True)
    
    current_1rm = Column(Float, default=0.0)
    training_max = Column(Float, default=0.0)
    
    # --- 담당자 로직 이식을 위해 추가하면 좋은 것들 ---
    step_weight = Column(Float, default=2.5)      # 증량 단위 (성공 시 몇 kg씩 올릴지)
    current_level = Column(Integer, default=1)    # 현재 루틴의 몇 회차/단계인지
    goal_reps = Column(Integer, default=5)        # 목표 횟수 (이걸 채워야 증량함)
    # ------------------------------------------

    last_updated = Column(DateTime, default=datetime.now)
    user = relationship("User", backref="routine_stats")

class RoutineLog(Base):
    """
    실제 운동 수행 기록 (세션 단위)
    첨부된 파이썬 파일의 'session_history' 역할을 수행합니다.
    """
    __tablename__ = "routine_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    
    routine_name = Column(String)     # StrongLifts 5x5, nSuns 등
    workout_date = Column(DateTime, default=datetime.now)
    
    # 세트별 무게, 횟수, 성공 여부를 JSON으로 저장하여 유연성 확보
    # 예: [{"ex": "squat", "sets": [{"w": 100, "r": 5, "s": True}, ...]}]
    session_data = Column(JSON) 
    
    total_volume = Column(Float)      # 오늘 든 총 무게 합계 (중량 x 횟수 총합)
    memo = Column(String, nullable=True)

    user = relationship("User", backref="routine_logs")