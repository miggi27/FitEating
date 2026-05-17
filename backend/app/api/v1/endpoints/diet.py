import torch
import torch.nn as nn
from torchvision import models, transforms
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

# --- [1. 기본 하드웨어 및 경로 설정] ---
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

CURRENT_FILE_PATH = os.path.abspath(__file__)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(CURRENT_FILE_PATH))))

# ⭐️ 2단계 연동에 필요한 모든 모델 및 인덱스, CSV 경로를 완벽 매칭합니다.
DB_PATH = os.path.join(BASE_DIR, "data", "food_info.csv")   # EfficientNet의 클래스인덱스 파일
MODEL_PATH = os.path.join(BASE_DIR, "models", "food", "best_kfood_model.pth") # 2차 세부 음식 분류기
YOLO_PATH = os.path.join(BASE_DIR, "models", "food", "best300.pt")           # 1차 알맹이 탐지기
FOOD_CSV = os.path.join(BASE_DIR, "data", "food_master_음식_utf8.csv")         # 영양성분 DB 1
PROCESS_CSV = os.path.join(BASE_DIR, "data", "food_master_가공_utf8.csv")     # 영양성분 DB 2

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

# --- [3. EfficientNet 매칭용 구형 헬퍼 함수 복원] ---
def load_food_db(path, master_df):
    db = {}
    try:
        df = pd.read_csv(path, encoding='utf-8-sig') 
        for _, row in df.iterrows():
            try:
                f_id = int(row['id'])
                f_name = str(row['name']).strip() 
                
                # 공공데이터 매칭 (기존의 유연한 검색contains 복원)
                target_nutrition = master_df[master_df["식품명"].str.contains(f_name, na=False, regex=False)]
                
                if not target_nutrition.empty:
                    nutri = target_nutrition.iloc[0]
                    kcal = float(nutri["에너지(kcal)"])
                    carbs = float(nutri["탄수화물(g)"])
                    protein = float(nutri["단백질(g)"])
                    fat = float(nutri["지방(g)"])
                else:
                    kcal = float(row.get('calories', 0))
                    carbs = float(row.get('carbs', 0))
                    protein = float(row.get('protein', 0))
                    fat = float(row.get('fat', 0))

                db[f_id] = {"name": f_name, "kcal": kcal, "carbs": carbs, "protein": protein, "fat": fat}
            except Exception as e:
                continue
    except Exception as e:
        print(f"❌ 구형 인덱스 DB 로드 실패: {e}")
    return db

FOOD_NUTRITION_DB = load_food_db(DB_PATH, FOOD_MASTER_DF)

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

# --- [4. AI 모델 전처리 및 전용 로더 정의] ---
classify_transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
])

def load_classifier(path):
    try:
        if not os.path.exists(path):
            raise FileNotFoundError(f"모델 파일이 없습니다: {path}")
        model = torch.load(path, map_location=device, weights_only=False)
        model.to(device)
        model.eval()
        print(f"✅ [성공] 2차 분류 EfficientNet 로드 완료!")
        return model
    except Exception as e:
        print(f"⚠️ 기본 구조 생성 백업 작동: {e}")
        model = models.efficientnet_b0(weights=None)
        model.classifier[1] = nn.Linear(model.classifier[1].in_features, 150)
        model.to(device)
        model.eval()
        return model

# 양대 엔진 가동
yolo_model = YOLO(YOLO_PATH)
classifier = load_classifier(MODEL_PATH)

# --- [5. API 엔드포인트 핵심 로직] ---

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

        # 원본 전체 이미지 저장
        main_filename = f"{uuid.uuid4()}_main.jpg"
        main_path = os.path.join(UPLOAD_DIR, main_filename)
        original_img.save(main_path, "JPEG")

        # 1. 1차 YOLO 예측 실행 (음식 알맹이 좌표 따기 전용)
        results = yolo_model.predict(original_img, conf=0.1)    
        temp_best_items = {} 
        
        if results[0].boxes:
            for i, box in enumerate(results[0].boxes):
                xyxy = box.xyxy[0].tolist()
                
                # ⭐️ [마진 설정 구현부] 타이트하게 박스 쳐진 음식 알맹이 사방에 여유 버퍼 50px 부여
                margin = 50 
                img_w, img_h = original_img.size
                x1 = max(0, xyxy[0] - margin)
                y1 = max(0, xyxy[1] - margin)
                x2 = min(img_w, xyxy[2] + margin)
                y2 = min(img_h, xyxy[3] + margin)

                # ✂️ 주변 그릇과 배경이 적당히 포함되도록 널널하게 크롭!
                cropped = original_img.crop((x1, y1, x2, y2))

                # 파일명 중복 스킵을 방지하기 위해 고유 파일명 선언
                crop_filename = f"{uuid.uuid4()}_{i}.jpg"
                crop_path = os.path.join(UPLOAD_DIR, crop_filename)
                cropped.save(crop_path, "JPEG")

                # 2. 널널해진 크롭 이미지를 2차 EfficientNet 분류기에 입력
                input_tensor = classify_transform(cropped).unsqueeze(0).to(device)
                with torch.no_grad():
                    output = classifier(input_tensor)
                    probs = torch.nn.functional.softmax(output, dim=1)
                    conf_val, idx = torch.max(probs, 1)
                    current_conf = conf_val.item()  # 2차 분류 모델의 최종 확신도

                # 구형 food_list.csv 딕셔너리에서 세부 음식명 추출
                f_info = FOOD_NUTRITION_DB.get(idx.item())
                if f_info:
                    food_name = f_info["name"]
                    
                    # 최고 확신도 매칭 및 최종 영양 정보 주입
                    if food_name not in temp_best_items or current_conf > temp_best_items[food_name]['conf']:
                        temp_best_items[food_name] = {
                            "conf": current_conf,
                            "data": {
                                "food_name": food_name,
                                "calories": f_info["kcal"],
                                "carbs": f_info["carbs"],
                                "protein": f_info["protein"],
                                "fat": f_info["fat"],
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
            db.query(DietLog).filter(
                DietLog.user_id == current_user.id, 
                DietLog.date == today, 
                DietLog.meal_type == meal_type
            ).delete()
        else: 
            if group_id:
                db.query(DietLog).filter(
                    DietLog.user_id == current_user.id,
                    DietLog.entry_group_id == group_id
                ).delete()

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