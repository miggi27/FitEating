import torch
import torch.nn as nn
from ultralytics import YOLO
from PIL import Image
import pandas as pd
import io
import os
import uuid  
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import date, datetime
from sqlalchemy import func
from app.database import get_db 
from app.api.v1.endpoints.auth import get_current_user
from app.models.user import User
from app.models.diet_log import DietLog

router = APIRouter()

# --- [1. 경로 및 환경 설정] ---
CURRENT_FILE_PATH = os.path.abspath(__file__)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(CURRENT_FILE_PATH))))

# ⭐️ 오직 YOLO 모델과 영양성분 마스터 CSV 경로만 사용합니다! (EfficientNet 완벽 배제)
YOLO_PATH = os.path.join(BASE_DIR, "models", "food", "best300.pt") 
FOOD_CSV = os.path.join(BASE_DIR, "data", "food_master_음식_utf8.csv") 
PROCESS_CSV = os.path.join(BASE_DIR, "data", "food_master_가공_utf8.csv") 

UPLOAD_DIR = os.path.join(BASE_DIR, "static", "uploads", "food")
os.makedirs(UPLOAD_DIR, exist_ok=True) 

print(f"📍 확인된 영양성분 CSV 경로: {FOOD_CSV}")

# --- [2. 공공 영양 데이터 로드 및 병합] ---
def load_and_merge_food_data():
    try:
        cols = ["식품명", "에너지(kcal)", "탄수화물(g)", "단백질(g)", "지방(g)"]
        df_food = pd.read_csv(FOOD_CSV, usecols=cols)
        df_proc = pd.read_csv(PROCESS_CSV, usecols=cols)
        full_df = pd.concat([df_food, df_proc], ignore_index=True)
        full_df.drop_duplicates(subset=["식품명"], keep="first", inplace=True)
        print(f"✅ 총 {len(full_df)}개의 식품 영양 데이터셋 로드 완료!")
        return full_df
    except Exception as e:
        print(f"❌ 데이터 로드 중 오류: {e}")
        return pd.DataFrame(columns=cols)

FOOD_MASTER_DF = load_and_merge_food_data()

def search_food_nutrition(name: str):
    if FOOD_MASTER_DF is None or FOOD_MASTER_DF.empty:
        return []
    results = FOOD_MASTER_DF[FOOD_MASTER_DF["식품명"].str.contains(name, na=False)].copy()
    if not results.empty:
        results['name_len'] = results['식품명'].str.len()
        top_10 = results.sort_values(by='name_len').head(10)
        output = []
        for _, row in top_10.iterrows():
            output.append({
                "food_name": row["식품명"],
                "kcal": float(row["에너지(kcal)"]),
                "carbs": float(row["탄수화물(g)"]),
                "protein": float(row["단백질(g)"]),
                "fat": float(row["지방(g)"])
            })
        return output
    return []

# --- [3. YOLO 모델 및 클래스 딕셔너리 로드] ---
yolo_model = YOLO(YOLO_PATH)

# ⚠️ 에러 원인 해결: YOLO 모델 내부 가중치에 들어있는 45개 클래스 이름을 딕셔너리로 추출합니다.
# {0: 'Food', 1: '감', ..., 15: '방울토마토'} 형태로 자동 매핑됩니다.
YOLO_CLASSES = yolo_model.names  

# --- [4. API 엔드포인트 핵심 로직] ---

@router.get("/search-nutrition")
def search_nutrition_api(name: str):
    if not name:
        raise HTTPException(status_code=400, detail="음식 이름을 입력하세요.")
    result = search_food_nutrition(name) 
    if result:
        return result
    return [{"food_name": name, "kcal": 0, "carbs": 0, "protein": 0, "fat": 0}]

@router.post("/analyze")
async def analyze_food(file: UploadFile = File(...)):    
    try:
        image_data = await file.read()
        original_img = Image.open(io.BytesIO(image_data)).convert('RGB')

        # 원본 전체 이미지 백업 저장
        main_filename = f"{uuid.uuid4()}_main.jpg"
        main_path = os.path.join(UPLOAD_DIR, main_filename)
        original_img.save(main_path, "JPEG")

        # 1. YOLO로 45개 음식 클래스 직접 탐지 수행
        results = yolo_model.predict(original_img, conf=0.3)    
        temp_best_items = {} 
        
        if results[0].boxes:
            for i, box in enumerate(results[0].boxes):
                xyxy = box.xyxy[0].tolist()
                current_conf = box.conf[0].item()  
                class_id = int(box.cls[0].item())  

                # ⭐️ YOLO가 찾은 클래스 번호로 실제 음식 이름 맵핑 (예: "방울토마토")
                food_name = YOLO_CLASSES.get(class_id, "알 수 없는 음식")

                # 사용자님이 친 박스 크기 그대로 깔끔하게 크롭 저장
                cropped = original_img.crop((xyxy[0], xyxy[1], xyxy[2], xyxy[3]))
                crop_filename = f"{uuid.uuid4()}_{i}.jpg"
                crop_path = os.path.join(UPLOAD_DIR, crop_filename)
                cropped.save(crop_path, "JPEG")

                # ⭐️ EfficientNet 완전 우회: YOLO가 뽑은 음식명으로 공공데이터에서 칼탄단지 즉시 매칭
                target_nutrition = FOOD_MASTER_DF[FOOD_MASTER_DF["식품명"].str.contains(food_name, na=False, regex=False)]
                
                if not target_nutrition.empty:
                    nutri = target_nutrition.iloc[0]
                    kcal = float(nutri["에너지(kcal)"])
                    carbs = float(nutri["탄수화물(g)"])
                    protein = float(nutri["단백질(g)"])
                    fat = float(nutri["지방(g)"])
                else:
                    kcal, carbs, protein, fat = 0.0, 0.0, 0.0, 0.0

                # 한 이미지 안에 동일 음식이 여러 개(예: 방울토마토 5개) 있으면 확신도 높은 녀석 하나만 최종 반환
                if food_name not in temp_best_items or current_conf > temp_best_items[food_name]['conf']:
                    temp_best_items[food_name] = {
                        "conf": current_conf,
                        "data": {
                            "food_name": food_name,
                            "calories": kcal,
                            "carbs": carbs,
                            "protein": protein,
                            "fat": fat,
                            "image_url": f"/static/uploads/food/{crop_filename}"
                        }
                    }

        return [item['data'] for item in temp_best_items.values()]
        
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail="분석 실패")

@router.post("/record-many")
def record_many_diet(
    data: dict, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    items = data.get("items", [])
    meal_type = data.get("meal_type")
    group_id = data.get("group_id") 
    image_url = data.get("image_url")  
    save_as_fav = data.get("save_as_favorite", False) 
    today = date.today()

    try:
        if meal_type in ['아침', '점심', '저녁']:
            db.query(DietLog).filter(DietLog.user_id == current_user.id, DietLog.date == today, DietLog.meal_type == meal_type).delete()
        else: 
            if group_id:
                db.query(DietLog).filter(DietLog.user_id == current_user.id, DietLog.entry_group_id == group_id).delete()

        for item in items:
            new_log = DietLog(
                user_id=current_user.id,
                food_name=item.get("food_name"),
                calories=item.get("calories", 0),
                carbs=item.get("carbs", 0),
                protein=item.get("protein", 0),
                fat=item.get("fat", 0),
                weight=item.get("weight", 100),
                meal_type=meal_type,
                entry_group_id=group_id, 
                image_url=image_url,     
                date=today,
                is_favorite=1 if save_as_fav else 0 
            )
            db.add(new_log)
        db.commit()
        return {"status": "success", "message": "식단이 성공적으로 저장되었습니다."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/daily-summary")
def get_daily_summary(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    logs = db.query(DietLog).filter(DietLog.user_id == current_user.id, DietLog.date == date.today()).all()
    total_data = {
        "kcal": sum((l.calories * (l.weight / 100.0)) for l in logs),
        "carbs": sum((l.carbs * (l.weight / 100.0)) for l in logs),
        "protein": sum((l.protein * (l.weight / 100.0)) for l in logs),
        "fat": sum((l.fat * (l.weight / 100.0)) for l in logs)
    }
    return {"total": total_data, "logs": logs}

@router.get("/favorites")
def get_favorites_categorized(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    fav_logs = db.query(DietLog).filter(DietLog.user_id == current_user.id, DietLog.is_favorite == 1).order_by(DietLog.created_at.desc()).all()
    result = {"meal": [], "snack": []}
    sets = {}

    for log in fav_logs:
        group_key = log.image_url if log.image_url else log.created_at.strftime("%Y-%m-%d %H:%M")
        if group_key not in sets:
            sets[group_key] = {"meal_type": log.meal_type, "image_url": log.image_url, "items": []}
        sets[group_key]["items"].append({
            "food_name": log.food_name, "calories": log.calories, "carbs": log.carbs,
            "protein": log.protein, "fat": log.fat, "weight": log.weight
        })

    for key, s in sets.items():
        category = "snack" if s["meal_type"] == "간식" else "meal"
        result[category].append(s)
    return result

@router.post("/feedback")
def get_diet_feedback(items: list):
    total_protein = sum(item.get('protein', 0) for item in items)
    if total_protein < 20:
        return {"feedback": "단백질이 조금 부족해요! 닭가슴살이나 달걀을 추가해보면 어떨까요?"}
    return {"feedback": "영양 구성이 아주 훌륭한 식단입니다! 이대로 유지하세요."}

@router.get("/today-summary")
def get_today_diet_summary(db: Session = Depends(get_db)):
    today = datetime.now().date()
    summary = db.query(
        func.sum(DietLog.calories).label("total_cal"), func.sum(DietLog.protein).label("total_protein")
    ).filter(func.date(DietLog.created_at) == today).first()
    return {"calories": summary.total_cal or 0, "protein": summary.total_protein or 0}