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

YOLO_WEIGHTS_PATH = "./models/best_big_bounding.pt"
EXERCISE_MODEL_PATHS = {
    "벤치프레스": "./models/benchpress/benchpress.pkl",
    "스쿼트": "./models/squat/squat.pkl",
    "데드리프트": "./models/deadlift/deadlift.pkl",
}

CAMERA_GUIDE = {
    "벤치프레스": "정면에서 촬영하세요. 카메라를 발 아래쪽에 두고 바가 정면으로 보이도록 배치하면 그립 너비와 허리 아치를 판정하기 좋습니다.",
    "스쿼트": "측면에서 촬영하세요. 무릎·허리 라인이 한눈에 보이게 옆에서 찍어야 무릎 안쪽 꺾임과 척추 각도를 판정할 수 있습니다.",
    "데드리프트": "측면에서 촬영하세요. 바·허리·무릎이 한 라인에 들어오도록 옆면을 잡으면 척추 중립 여부를 판정하기 좋습니다.",
}

FEEDBACK_MESSAGES = {
    "excessive_arch": "허리가 과도한 아치 자세입니다. 허리를 너무 아치 모양으로 만들지 말고 가슴을 피려고 노력하세요. 골반을 조금 더 들어올리고 복부를 긴장시켜 허리를 평평하게 유지하세요.",
    "arms_spread": "바를 너무 넓게 잡은 자세입니다. 어깨 너비보다 약간만 넓게 잡는 것이 좋습니다.",
    "arms_narrow": "바를 너무 좁게 잡은 자세입니다. 어깨 너비보다 조금 넓게 잡는 것이 좋습니다.",
    "spine_neutral": "척추가 중립이 아닌 자세입니다. 척추가 과도하게 굽지 않도록 가슴을 들어올리고 어깨를 뒤로 넣으세요.",
    "caved_in_knees": "무릎이 움푹 들어간 자세입니다. 엉덩이를 뒤로 빼서 무릎과 발끝을 일직선으로 유지하세요.",
    "feet_spread": "발을 너무 넓게 벌린 자세입니다. 발을 어깨 너비 정도로만 벌리도록 좁히세요.",
}

ERROR_KEYS = list(FEEDBACK_MESSAGES.keys())

ERROR_CATEGORY_MAP = {
    "excessive_arch": "Posture",
    "spine_neutral": "Posture",
    "arms_spread": "Movement Quality",
    "arms_narrow": "Movement Quality",
    "caved_in_knees": "Stability",
    "feet_spread": "Stability",
}

CATEGORY_ORDER = ["Stability", "ROM", "Movement Quality", "Posture", "Core"]

CATEGORY_LABELS = {
    "Stability": "Stability(안정성)",
    "ROM": "Range of Motion(가동범위)",
    "Movement Quality": "Movement Quality(동작 품질)",
    "Posture": "Posture(자세)",
    "Core": "Bracing & Core(코어 긴장)",
}

CATEGORY_PRAISE = {
    "Stability": "균형감 좋습니다.",
    "ROM": "깊이 충분히 내려갑니다. 좋아요.",
    "Movement Quality": "동작 컨트롤이 매끄럽습니다.",
    "Posture": "척추 중립이 잘 유지됩니다.",
    "Core": "복압 거의 완벽합니다.",
}

OVERLAY_MESSAGES = {
    "excessive_arch": "허리 아치 과도",
    "arms_spread": "그립 너무 넓음",
    "arms_narrow": "그립 너무 좁음",
    "spine_neutral": "척추 비중립",
    "caved_in_knees": "무릎 안쪽 꺾임",
    "feet_spread": "보폭이 너무 넓습니다",
}

ERROR_BODY_PARTS = {
    "feet_spread": [27, 28],
    "caved_in_knees": [25, 26],
    "arms_spread": [15, 16],
    "arms_narrow": [15, 16],
    "excessive_arch": [23, 24],
    "spine_neutral": [11, 12, 23, 24],
}

CATEGORY_HINTS = {
    "Stability": "발 가운데로 무게중심을 두고 좌우 흔들림을 줄여보세요.",
    "ROM": "rep 사이 깊이가 일정하지 않습니다. 매번 같은 깊이까지 컨트롤하면서 내려가세요.",
    "Movement Quality": "하강·상승 템포를 일정하게(예: 3초 내려가고 1초 올라오기) 유지하세요.",
    "Posture": "가슴을 천장 쪽으로 들고 시선을 정면 한 점에 고정해 척추 중립을 유지하세요.",
    "Core": "복압을 더 강하게 잡고 호흡 타이밍을 의식적으로 맞춰보세요.",
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
    guide_text = CAMERA_GUIDE.get(data.exercise_type, "카메라를 고정하고 전신이 나오게 해주세요.")

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

        # 에러 판정 및 좌표 추출 로직 강화
        current_error = None
        feedback_points = [] # 프론트엔드에 전달할 좌표 리스트

        # 예시: 무릎 꺾임 에러 발생 시
        if angle < 130 and abs(knee[0] - ankle[0]) > 0.05:
            current_error = "caved_in_knees"
            error_counts[current_error] = error_counts.get(current_error, 0) + 1
            
            # 모델 담당자가 정의한 ERROR_BODY_PARTS에 따라 좌표 추출 (무릎: 25, 26)
            # landmarks는 [x, y, z, v, x, y, z, v...] 형태이므로 4씩 곱해서 접근
            indices = ERROR_BODY_PARTS.get("caved_in_knees", [])
            for idx in indices:
                feedback_points.append({
                    "x": landmarks[idx * 4],
                    "y": landmarks[idx * 4 + 1]
                })

        # 관대한 점수 (최하 65점 보장)
        penalty = (len(error_counts) * 5) + ( (sum(error_counts.values())/total_frames)*30 if total_frames > 0 else 0 )
        total_score = max(65, int(100 - penalty))

        return {
            "counter": counter,
            "angle": round(angle, 1),
            "score": total_score,
            "error_key": current_error,
            "feedback_points": feedback_points, # 이 좌표를 리액트가 사용함
            "guide": guide_text,
            "overlay_message": OVERLAY_MESSAGES.get(current_error, ""), # 화면 상단 노출용
            "overall": f"{counter}회 완료! {total_score}점.",
            "cat_scores": {
                "Stability": max(70, 100 - (error_counts.get("caved_in_knees", 0) * 2)),
                "Posture": 95, 
                "ROM": 100 if angle < 100 else 85,
                "Movement Quality": 90,
                "Core": 88
            },
            "cat_details": {
                "Stability": FEEDBACK_MESSAGES["caved_in_knees"] if "caved_in_knees" in error_counts else "하체 중심이 견고합니다.",
                "Posture": "상체 각도가 아주 안정적입니다.",
                "ROM": "가동 범위가 충분합니다.",
                "Movement Quality": "하강 속도가 일정하여 근육의 긴장이 잘 유지됩니다.",
                "Core": "복압 유지가 잘 되어 허리 부담이 적습니다."
            }
        }
    except Exception:
        return {"counter": counter, "guide": guide_text}

@router.post("/reset")
async def reset_counter():
    global counter, stage, error_counts, total_frames
    counter, stage, total_frames, error_counts = 0, "ready", 0, {}
    return {"status": "success"}