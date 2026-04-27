import pandas as pd
import pickle
import numpy as np

class ExerciseService:
    def __init__(self):
        self.models = {
            "benchpress": self._load_model("app/models/benchpress/benchpress.pkl"),
            "squat": self._load_model("app/models/squat/squat.pkl") # 스쿼트 모델 경로
        }
        self.counter = 0
        self.current_stage = ""

    def _load_model(self, path):
        try:
            with open(path, "rb") as f:
                return pickle.load(f)
        except:
            return None

    def predict(self, landmarks: list, exercise_type: str):
        model = self.models.get(exercise_type)
        if not model:
            return {"error": "해당 종목 모델을 찾을 수 없습니다."}

        X = pd.DataFrame([landmarks])
        exercise_class = model.predict(X)[0]

    def predict(self, landmarks: list):
        try:
            # [디버깅] 들어온 데이터 개수 확인
            print(f"DEBUG: 들어온 데이터 개수 = {len(landmarks)}")
            
            # 데이터를 모델 입력용 DataFrame으로 변환
            X = pd.DataFrame([landmarks])
            
            # [디버깅] 데이터 프레임 형태 확인
            print(f"DEBUG: DataFrame shape = {X.shape}")
            
            # 모델 예측
            exercise_class = self.model.predict(X)[0]
            prob = self.model.predict_proba(X)[0]
            
            # 카운팅 로직
            if "down" in exercise_class:
                self.current_stage = "down"
            elif self.current_stage == "down" and "up" in exercise_class:
                self.current_stage = "up"
                self.counter += 1
                
            return {
                "exercise_class": str(exercise_class),
                "probability": round(float(max(prob)), 2),
                "counter": self.counter
            }
        except Exception as e:
            # 에러가 나면 터미널에 에러 내용을 출력합니다.
            print(f"ERROR 발생: {str(e)}")
            return {"error": str(e)}

exercise_service = ExerciseService()