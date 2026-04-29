# backend/app/main.py
from fastapi import FastAPI
from app.api.v1.endpoints import exercise, diet # diet 추가
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

# 라우터 등록 (이 부분이 빠졌을 겁니다)
app.include_router(exercise.router, prefix="/api/v1/exercise", tags=["exercise"])
app.include_router(diet.router, prefix="/api/v1/diet", tags=["diet"])

# [GET] 이게 있어야 docs에 나오고 404가 안 뜹니다
@app.get("/")
def read_root():
    return {"status": "online", "message": "Fit-Eating API Server"}

    