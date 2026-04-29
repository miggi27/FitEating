from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Optional
import numpy as np

router = APIRouter()

# 전역 상태 (메모리 관리)
counter = 0
stage = "ready"
error_counts = {}
total_frames = 0

# 상세 페이지용 풍부한 피드백 문구
DETAILED_FEEDBACK = {
    "caved_in_knees": "무릎이 발끝 방향보다 안쪽으로 모이고 있습니다. 이는 무릎 인대에 큰 부담을 줄 수 있으니, 스쿼트 시 무릎을 바깥쪽으로 밀어준다는 느낌을 유지하세요.",
    "spine_neutral": "척추 중립이 무너지고 있습니다. 복부에 힘을 주어 허리가 말리거나 과하게 꺾이지 않도록 코어에 집중하세요.",
    "stability_praise": "발바닥 전체가 지면에 잘 밀착되어 흔들림 없는 안정적인 자세를 보여주셨습니다.",
    "posture_praise": "운동 내내 척추의 정렬이 곧게 유지되었습니다. 아주 훌륭한 자세입니다."
}

GUIDES = {
    "스쿼트": "측면에서 촬영하세요. 무릎과 허리 라인이 한눈에 보여야 정확한 판정이 가능합니다.",
    "벤치프레스": "카메라를 정면(발 아래쪽)에 두세요. 그립의 균형을 체크하기 좋습니다.",
    "데드리프트": "측면 45도에서 촬영하세요. 바의 동선과 허리의 움직임을 보기 좋습니다."
}

class ExerciseData(BaseModel):
    landmarks: List[float]
    exercise_type: str = "스쿼트"

@router.post("/analyze")
async def analyze_exercise(data: ExerciseData):
    global counter, stage, error_counts, total_frames
    landmarks = data.landmarks
    total_frames += 1

    # 1. 초기 가이드 문구 보장
    guide_text = GUIDES.get(data.exercise_type, "카메라를 고정하고 전신이 나오게 해주세요.")

    if not landmarks or len(landmarks) < 33:
        return {"counter": counter, "guide": guide_text, "angle": 0}

    try:
        step = 4
        hip = [landmarks[24*step], landmarks[24*step+1]]
        knee = [landmarks[26*step], landmarks[26*step+1]]
        ankle = [landmarks[28*step], landmarks[28*step+1]]
        
        # 각도 계산 (numpy)
        a, b, c = np.array(hip), np.array(knee), np.array(ankle)
        radians = np.arctan2(c[1]-b[1], c[0]-b[0]) - np.arctan2(a[1]-b[1], a[0]-b[0])
        angle = np.abs(radians * 180.0 / np.pi)
        if angle > 180.0: angle = 360 - angle

        # 카운팅
        if angle < 120: stage = "down"
        elif angle > 160 and stage == "down":
            stage = "up"
            counter += 1

        # 에러 판정
        current_error = None
        if angle < 130 and abs(knee[0] - ankle[0]) > 0.05:
            current_error = "caved_in_knees"
            error_counts[current_error] = error_counts.get(current_error, 0) + 1

        # 관대한 점수 (최하 65점 보장)
        penalty = (len(error_counts) * 5) + ( (sum(error_counts.values())/total_frames)*30 if total_frames > 0 else 0 )
        total_score = max(65, int(100 - penalty))

        return {
            "counter": counter,
            "angle": round(angle, 1),
            "score": total_score,
            "error_key": current_error, # 빨간 원을 위한 핵심 키
            "guide": guide_text,
            "overall": f"{counter}회 수행 완료! {total_score}점입니다. " + ("자세 교정이 조금 필요해요." if total_score < 85 else "완벽한 자세입니다!"),
            "cat_scores": {
                "Stability": max(70, 100 - error_counts.get("caved_in_knees", 0)),
                "Posture": 95,
                "ROM": 100 if angle < 100 else 85,
                "Movement Quality": 90,
                "Core": 88
            },
            "cat_details": {
                "Stability": DETAILED_FEEDBACK["caved_in_knees"] if "caved_in_knees" in error_counts else DETAILED_FEEDBACK["stability_praise"],
                "Posture": DETAILED_FEEDBACK["posture_praise"],
                "ROM": "적절한 깊이까지 잘 내려가고 있습니다."
            }
        }
    except Exception:
        return {"counter": counter, "guide": guide_text}

@router.post("/reset")
async def reset_counter():
    global counter, stage, error_counts, total_frames
    counter, stage, total_frames, error_counts = 0, "ready", 0, {}
    return {"status": "success"}