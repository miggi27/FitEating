import torch
import torch.nn as nn
from torchvision import models, transforms
from ultralytics import YOLO
from PIL import Image
import pandas as pd
import io
import os
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Form
from sqlalchemy.orm import Session
from datetime import date

from app.database import get_db 
from app.api.v1.endpoints.auth import get_current_user
from app.models.user import User
from app.models.diet_log import DietLog

router = APIRouter()

# 🟢 누락되었던 검색 함수 다시 추가 (FOOD_MASTER_DF 검색용)
def search_food_nutrition(name: str):
    """공공데이터 DF에서 음식 이름으로 영양성분 검색"""
    if FOOD_MASTER_DF is None or FOOD_MASTER_DF.empty:
        return None
        
    # 텍스트가 포함된 음식 찾기
    result = FOOD_MASTER_DF[FOOD_MASTER_DF["식품명"].str.contains(name, na=False)]
    
    if not result.empty:
        row = result.iloc[0]
        return {
            "food_name": row["식품명"],
            "kcal": float(row["에너지(kcal)"]),
            "carbs": float(row["탄수화물(g)"]),
            "protein": float(row["단백질(g)"]),
            "fat": float(row["지방(g)"])
        }
    return None

# 경로 설정
CURRENT_FILE_PATH = os.path.abspath(__file__)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(CURRENT_FILE_PATH))))
DB_PATH = os.path.join(BASE_DIR, "data", "food_info_utf8.csv")
MODEL_PATH = os.path.join(BASE_DIR, "models", "food", "efficientnetb4.pt")
YOLO_PATH = os.path.join(BASE_DIR, "models", "food", "yolov8n.pt")
FOOD_CSV = os.path.join(BASE_DIR, "data", "food_master_음식_utf8.csv")
PROCESS_CSV = os.path.join(BASE_DIR, "data", "food_master_가공_utf8.csv")
print(f"📍 확인된 CSV 경로: {FOOD_CSV}") # 서버 뜰 때 터미널에서 확인용!

def load_and_merge_food_data():
    try:
        # 1. 필요한 컬럼만 지정
        cols = ["식품명", "에너지(kcal)", "탄수화물(g)", "단백질(g)", "지방(g)"]
        
        # 2. 데이터 읽기 (usecols로 필요한 것만 쏙 빼오기)
        df_food = pd.read_csv(FOOD_CSV, usecols=cols)
        df_proc = pd.read_csv(PROCESS_CSV, usecols=cols)
        
        # 3. 두 데이터 합치기
        full_df = pd.concat([df_food, df_proc], ignore_index=True)
        
        # 4. 중복 제거 및 데이터 정제 (이름 기준)
        full_df.drop_duplicates(subset=["식품명"], keep="first", inplace=True)
        
        print(f"✅ 총 {len(full_df)}개의 식품 데이터 로드 완료!")
        return full_df
    except Exception as e:
        print(f"❌ 데이터 로드 중 오류: {e}")
        return pd.DataFrame(columns=cols)

# 1. 공공데이터를 먼저 로드합니다 (순서 중요!)
FOOD_MASTER_DF = load_and_merge_food_data()

# 2. 수정된 load_food_db 함수
def load_food_db(path, master_df):
    db = {}
    try:
        # csv 로드 (인코딩은 환경에 맞게 조정하세요)
        df = pd.read_csv(path, encoding='utf-8-sig') 
        
        for _, row in df.iterrows():
            try:
                f_id = int(row['id'])
                f_name = str(row['name']).strip() # 모델이 분류한 음식 이름
                
                # --- [핵심 추가] 공공데이터 DF에서 상세 영양정보 검색 ---
                # 모델 DB의 음식 이름이 공공데이터 '식품명'에 포함되는지 확인
                target_nutrition = master_df[master_df["식품명"].str.contains(f_name, na=False)]
                
                if not target_nutrition.empty:
                    # 가장 유사한 첫 번째 데이터의 영양성분 가져오기
                    nutri = target_nutrition.iloc[0]
                    kcal = float(nutri["에너지(kcal)"])
                    carbs = float(nutri["탄수화물(g)"])
                    protein = float(nutri["단백질(g)"])
                    fat = float(nutri["지방(g)"])
                else:
                    # 공공데이터에 없을 경우 기본값 0 처리 (혹은 csv에 있는 값 사용)
                    kcal = float(row.get('calories', 0))
                    carbs = float(row.get('carbs', 0))
                    protein = float(row.get('protein', 0))
                    fat = float(row.get('fat', 0))

                db[f_id] = {
                    "name": f_name,
                    "kcal": kcal,
                    "carbs": carbs,
                    "protein": protein,
                    "fat": fat
                }
            except Exception as e:
                print(f"⚠️ {f_id}번 데이터 처리 중 스킵: {e}")
                continue
    except Exception as e:
        print(f"❌ DB 로드 실패: {e}")
    return db

# 3. 함수 호출 시 MASTER_DF를 함께 전달
FOOD_NUTRITION_DB = load_food_db(DB_PATH, FOOD_MASTER_DF)

# 모델 설정
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
yolo_model = YOLO(YOLO_PATH)
classify_transform = transforms.Compose([
    transforms.Resize((380, 380)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
])

def load_classifier(path):
    model = models.efficientnet_b4(weights=None)
    model.classifier[1] = nn.Linear(model.classifier[1].in_features, 150)
    try:
        checkpoint = torch.load(path, map_location=device, weights_only=False)
        if isinstance(checkpoint, nn.Module): model = checkpoint
        else: model.load_state_dict(checkpoint.get('state_dict', checkpoint))
    except: pass
    model.to(device).eval()
    return model

classifier = load_classifier(MODEL_PATH)

# 분석 API (탄단지 포함 반환)
@router.post("/analyze")
async def analyze_food(file: UploadFile = File(...)):
    try:
        image_data = await file.read()
        original_img = Image.open(io.BytesIO(image_data)).convert('RGB')
        results = yolo_model.predict(original_img, conf=0.25)
        detected_items = []
        if results[0].boxes:
            for box in results[0].boxes:
                xyxy = box.xyxy[0].tolist()
                cropped = original_img.crop((xyxy[0], xyxy[1], xyxy[2], xyxy[3]))
                input_tensor = classify_transform(cropped).unsqueeze(0).to(device)
                with torch.no_grad():
                    output = classifier(input_tensor)
                    conf, idx = torch.max(torch.nn.functional.softmax(output, dim=1), 1)
                f_info = FOOD_NUTRITION_DB.get(idx.item())
                if f_info:
                    detected_items.append({
                        "food_name": f_info["name"],
                        "calories": f_info["kcal"],
                        "carbs": f_info["carbs"],
                        "protein": f_info["protein"],
                        "fat": f_info["fat"]
                    })
        return list({item['food_name']: item for item in detected_items}.values())
    except: raise HTTPException(status_code=500, detail="분석 실패")


# 🟢 저장 API 수정
@router.post("/record-many")
def record_many_diet(
    data: dict, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    items = data.get("items", [])
    meal_type = data.get("meal_type")
    image_url = data.get("image_url")
    # 🟢 프론트에서 보낸 즐겨찾기 체크 여부 (isFavSet 값)
    save_as_fav = 1 if data.get("save_as_favorite") else 0
    today = date.today()

    # 1. 기존 같은 끼니 데이터 삭제 (수정 모드 대응)
    db.query(DietLog).filter(
        DietLog.user_id == current_user.id, 
        DietLog.date == today, 
        DietLog.meal_type == meal_type
    ).delete()

    # 2. 새로운 데이터 등록
    for item in items:
        new_log = DietLog(
            user_id=current_user.id,
            food_name=item.get("food_name"),
            calories=item.get("calories", 0),
            carbs=item.get("carbs", 0),
            protein=item.get("protein", 0),
            fat=item.get("fat", 0),
            weight=item.get("weight", 100),  # 이제 에러 안 남
            meal_type=meal_type,
            image_url=image_url,
            date=today,  # 모델의 컬럼명이 date이므로 수정
            is_favorite=save_as_fav  # 🟢 이 줄이 있어야 DB에 1이 들어갑니다!
        )
        db.add(new_log)
    
    db.commit()
    return {"message": "Success"}

@router.get("/daily-summary")
def get_daily_summary(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    logs = db.query(DietLog).filter(DietLog.user_id == current_user.id, DietLog.date == date.today()).all()
    return {"logs": logs}

# 🟢 즐겨찾기 목록 가져오기
@router.get("/favorites")
def get_favorites(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # 1로 저장된 음식들을 중복 없이 가져옴
    favs = db.query(DietLog.food_name, DietLog.calories, DietLog.carbs, DietLog.protein, DietLog.fat)\
             .filter(DietLog.user_id == current_user.id, DietLog.is_favorite == 1)\
             .group_by(DietLog.food_name).all()
    
    # 프론트가 쓰기 편하게 딕셔너리 리스트로 변환
    return [
        {"food_name": f[0], "calories": f[1], "carbs": f[2], "protein": f[3], "fat": f[4]} 
        for f in favs
    ]

# 🟢 영양 피드백 생성 (간단 버전)
@router.post("/feedback")
def get_diet_feedback(items: list):
    # 프론트에서 보낸 현재 식단 아이템들을 분석
    total_protein = sum(item.get('protein', 0) for item in items)
    
    if total_protein < 20:
        return {"feedback": "단백질이 조금 부족해요! 닭가슴살이나 달걀을 추가해보면 어떨까요?"}
    else:
        return {"feedback": "영양 구성이 아주 훌륭한 식단입니다! 이대로 유지하세요."}

# 🟢 영양 정보 검색 API (함수명 매칭 완료)
@router.get("/search-nutrition")
def search_nutrition_api(name: str):
    if not name:
        raise HTTPException(status_code=400, detail="음식 이름을 입력하세요.")
    
    # 위에서 정의한 search_food_nutrition 호출
    result = search_food_nutrition(name) 
    
    if result:
        return result
    
    # 검색 결과 없을 때 기본값
    return {"food_name": name, "kcal": 0, "carbs": 0, "protein": 0, "fat": 0}