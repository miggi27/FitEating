from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import numpy as np

app = FastAPI()

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# [GET] 이게 있어야 docs에 나오고 404가 안 뜹니다
@app.get("/")
def read_root():
    return {"status": "online", "message": "Fit-Eating API Server"}

class ExerciseData(BaseModel):
    landmarks: List[float]
    exercise_type: str

counter = 0
stage = "ready"

def calculate_angle(a, b, c):
    a = np.array(a)
    b = np.array(b)
    c = np.array(c)
    radians = np.arctan2(c[1] - b[1], c[0] - b[0]) - np.arctan2(a[1] - b[1], a[0] - b[0])
    angle = np.abs(radians * 180.0 / np.pi)
    if angle > 180.0:
        angle = 360 - angle
    return angle

# [POST] 실제 운동 분석 API
@app.post("/api/v1/exercise/analyze")
async def analyze_exercise(data: ExerciseData):
    global counter, stage
    landmarks = data.landmarks
    knee_angle = 0.0
    
    if not landmarks:
        return {"counter": counter, "exercise_class": "No Data", "angle": 0}

    try:
        step = 4 if len(landmarks) > 100 else 2
        hip = [landmarks[24*step], landmarks[24*step+1]]
        knee = [landmarks[26*step], landmarks[26*step+1]]
        ankle = [landmarks[28*step], landmarks[28*step+1]]
        
        knee_angle = calculate_angle(hip, knee, ankle)
        
        if knee_angle < 120:
            stage = "down"
        elif knee_angle > 160 and stage == "down":
            stage = "up"
            counter += 1
    except Exception as e:
        print(f"Error: {e}")

    return {
        "counter": counter,
        "exercise_class": stage,
        "angle": round(knee_angle, 2)
    }

@app.post("/api/v1/exercise/reset")
async def reset_counter():
    global counter, stage
    counter = 0
    stage = "ready"
    return {"status": "success", "counter": counter}