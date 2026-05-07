# backend/app/api/v1/endpoints/diet.py
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

# 필요한 것들 임포트
from app.database import get_db 
from app.api.v1.endpoints.auth import get_current_user # 문지기 소환
from app.models.user import User
from app.models.diet import DietLog

router = APIRouter()

# 1. 파일 시스템의 절대적인 위치를 기준으로 'backend' 폴더를 찾습니다.
CURRENT_PATH = os.path.abspath(__file__)
BASE_DIR = CURRENT_PATH
while os.path.basename(BASE_DIR) != "backend":
    BASE_DIR = os.path.dirname(BASE_DIR)

# 2. 정확한 CSV 경로 설정 (backend/app/data/ 폴더 기준)
FOOD_CSV = os.path.join(BASE_DIR, "app", "data", "food_master_음식_utf8.csv")
PROCESS_CSV = os.path.join(BASE_DIR, "app", "data", "food_master_가공_utf8.csv")

print(f"📍 확인된 CSV 경로: {FOOD_CSV}, {PROCESS_CSV}") # 서버 뜰 때 터미널에서 확인용!

# 파일 정리되면 지울것
# ---------------------------------------------------------
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

# 서버 시작 시 메모리에 딱 한 번 로드
FOOD_MASTER_DF = load_and_merge_food_data()

def search_food_nutrition(name: str):
    """음식 이름으로 탄단지 검색"""
    # 텍스트가 포함된 모든 음식 찾기
    result = FOOD_MASTER_DF[FOOD_MASTER_DF["식품명"].str.contains(name, na=False)]
    
    if not result.empty:
        # 가장 유사한 첫 번째 데이터 반환
        row = result.iloc[0]
        return {
            "food_name": row["식품명"],
            "kcal": float(row["에너지(kcal)"]),
            "carbs": float(row["탄수화물(g)"]),
            "protein": float(row["단백질(g)"]),
            "fat": float(row["지방(g)"])
        }
    return None

# ---------------------------------------------------------

@router.post("/record-specific")
async def record_specific(
    meal_type: str = Form(...),  # 아침, 점심, 저녁, 간식 구분
    food_name: str = Form(...),
    calories: float = Form(...),
    carbs: float = Form(...),
    protein: float = Form(...),
    fat: float = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. 이미 같은 식사 타임에 같은 음식이 있는지 확인
    existing = db.query(DietLog).filter(
        DietLog.user_id == current_user.id,
        DietLog.date == date.today(),
        DietLog.meal_type == meal_type,
        DietLog.food_name == food_name
    ).first()

    if existing:
        # 🟢 수정 모드: 기존 기록의 수치만 업데이트
        existing.calories = calories
        existing.carbs = carbs
        existing.protein = protein
        existing.fat = fat
        db.commit()
        return {"message": "기존 식단이 수정되었습니다!", "status": "updated"}
    
    # 2. 없으면 새로 생성
    new_log = DietLog(...)
    db.add(new_log)
    db.commit()
    return {"message": "새로운 식단이 기록되었습니다!", "status": "created"}

@router.post("/toggle-favorite/{log_id}")
def toggle_favorite(log_id: int, db: Session = Depends(get_db)):
    log = db.query(DietLog).filter(DietLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="기록을 찾을 수 없습니다.")
    
    # 0이면 1로, 1이면 0으로 토글
    log.is_favorite = 1 if log.is_favorite == 0 else 0
    db.commit()
    return {"is_favorite": log.is_favorite}


@router.post("/analyze-and-record")
async def analyze_and_record(
    meal_type: str = Form(...), 
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        # 1. 이미지 읽기
        image_data = await file.read()
        original_img = Image.open(io.BytesIO(image_data)).convert('RGB')
        
        # 2. YOLO로 음식 탐지 (여러 개 찾기)
        results = yolo_model.predict(original_img, conf=0.25)
        
        final_saved_foods = [] # 저장된 음식 이름을 담을 리스트

        if results[0].boxes:
            for box in results[0].boxes:
                # --- [A] 분석 로직 (B4 모델 실행) ---
                xyxy = box.xyxy[0].tolist()
                cropped = original_img.crop((xyxy[0], xyxy[1], xyxy[2], xyxy[3]))
                input_tensor = classify_transform(cropped).unsqueeze(0).to(device)
                
                with torch.no_grad():
                    output = classifier(input_tensor)
                    prob = torch.nn.functional.softmax(output, dim=1)
                    _, idx = torch.max(prob, 1)
                
                f_info = FOOD_NUTRITION_DB.get(idx.item())
                if not f_info: continue
                
                detected_name = f_info["name"]

                # --- [B] 중복 체크 (오늘 + 이 유저 + 이 식사타임 + 이 음식이 이미 있는지) ---
                existing_log = db.query(DietLog).filter(
                    DietLog.user_id == current_user.id,
                    DietLog.date == date.today(),
                    DietLog.meal_type == meal_type,
                    DietLog.food_name == detected_name
                ).first()

                if existing_log:
                    print(f"⚠️ 중복 패스: {detected_name}는 이미 {meal_type}에 기록됨")
                    continue # 이미 있으면 다음 음식으로 넘어감

                # --- [C] CSV에서 상세 영양정보 검색 ---
                nutrition = search_food_nutrition(detected_name)
                
                # --- [D] DB 저장 ---
                new_log = DietLog(
                    user_id=current_user.id,
                    meal_type=meal_type,
                    food_name=detected_name,
                    calories=nutrition["kcal"] if nutrition else f_info["kcal"],
                    carbs=nutrition["carbs"] if nutrition else 0.0,
                    protein=nutrition["protein"] if nutrition else 0.0,
                    fat=nutrition["fat"] if nutrition else 0.0,
                    date=date.today()
                )
                db.add(new_log)
                final_saved_foods.append(detected_name)

            db.commit() # 모든 음식 한 번에 커밋!

        # 저장된 결과가 있으면 성공 메시지, 없으면 중복이거나 탐지 실패
        if final_saved_foods:
            return {"message": f"{', '.join(final_saved_foods)} 기록 완료!", "foods": final_saved_foods}
        else:
            return {"message": "새로 추가된 음식이 없거나 탐지에 실패했습니다.", "foods": []}

    except Exception as e:
        db.rollback()
        print(f"❌ 서버 에러: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/record")
def record_diet(
    meal_data: dict, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user) # 로그인한 사람만 통과!
):
    # 이제 current_user.id를 통해 누가 이 음식을 먹었는지 알 수 있습니다.
    return {
        "message": f"{current_user.username}님, 식단이 기록되었습니다!",
        "received_data": meal_data
    }

@router.get("/daily-summary")
def get_daily_summary(
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    # 1. 오늘 날짜의 이 유저 데이터만 필터링
    today = date.today()
    logs = db.query(DietLog).filter(
        DietLog.user_id == current_user.id,
        DietLog.date == today
    ).all()

    # 2. 탄단지칼 총합 계산
    total_kcal = sum(log.calories for log in logs)
    total_carbs = sum(log.carbs for log in logs)
    total_protein = sum(log.protein for log in logs)
    total_fat = sum(log.fat for log in logs)

    return {
        "date": today,
        "total": {
            "kcal": round(total_kcal, 1),
            "carbs": round(total_carbs, 1),
            "protein": round(total_protein, 1),
            "fat": round(total_fat, 1)
        },
        "logs": logs # 상세 내역 (아침, 점심 등 리스트)
    }

# ---------------------------------------------------------
# 1. 경로 설정 및 파일 로드
# ---------------------------------------------------------
CURRENT_FILE_PATH = os.path.abspath(__file__)
# backend/app/api/v1/endpoints/diet.py 에서 4단계를 올라가면 backend/ (BASE_DIR)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(CURRENT_FILE_PATH))))

DB_PATH = os.path.join(BASE_DIR, "models", "food", "food_info2.csv")
MODEL_PATH = os.path.join(BASE_DIR, "models", "food", "efficientnetb4.pt")

# 🟢 추가: YOLO 모델 경로도 BASE_DIR 기준으로 통일!
YOLO_PATH = os.path.join(BASE_DIR, "models", "food", "yolov8n.pt")

def load_food_db(path):
    db = {}
    try:
        if not os.path.exists(path):
            return db
        df = pd.read_csv(path, encoding='utf-8-sig')
        df.columns = df.columns.str.strip()
        for _, row in df.iterrows():
            try:
                f_id = int(row['id'])
                db[f_id] = {
                    "name": str(row['name']).strip(),
                    "kcal": int(row['calories']),
                    "feedback": str(row['feedback']).strip()
                }
            except: continue
        print(f"✅ DB 로드 완료! 데이터 개수: {len(db)}개")
    except Exception as e:
        print(f"❌ DB 로드 오류: {e}")
    return db

FOOD_NUTRITION_DB = load_food_db(DB_PATH)

# ---------------------------------------------------------
# 2. 모델 로드 (B4 맞춤 설정)
# ---------------------------------------------------------
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

try:
    yolo_model = YOLO(YOLO_PATH)
    print(f"✅ YOLOv8 모델 로드 완료! (경로: {YOLO_PATH})")
except Exception as e:
    print(f"❌ YOLOv8 모델 로드 실패: {e}")

# [수정] EfficientNet-B4의 최적 해상도는 380x380입니다.
classify_transform = transforms.Compose([
    transforms.Resize((380, 380)), # 224 -> 380으로 변경
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
])

def load_classifier(path):
    try:
        if not os.path.exists(path):
            raise FileNotFoundError(f"모델 파일이 없습니다: {path}")
            
        # [핵심 수정] weights_only=False를 명시적으로 추가하여 전체 모델 구조 로드를 허용합니다.
        checkpoint = torch.load(path, map_location=device, weights_only=False)
        
        if isinstance(checkpoint, nn.Module):
            model = checkpoint # 전체 모델이 저장된 경우
        elif isinstance(checkpoint, dict):
            # state_dict만 저장된 경우 구조 정의 후 로드
            model = models.efficientnet_b4(weights=None)
            num_ftrs = model.classifier[1].in_features
            model.classifier[1] = nn.Linear(num_ftrs, 150)
            
            if 'state_dict' in checkpoint:
                model.load_state_dict(checkpoint['state_dict'])
            else:
                model.load_state_dict(checkpoint)
        else:
            raise TypeError("알 수 없는 모델 저장 형식입니다.")

        model.to(device)
        model.eval()
        print(f"✅ [성공] EfficientNet-B4 모델 로드 완료!")
        return model

    except Exception as e:
        print(f"❌ [로딩 실패] 상세 에러: {e}")
        # 실패 시 대비용 빈 모델 구조 생성
        model = models.efficientnet_b4(weights=None)
        model.classifier[1] = nn.Linear(model.classifier[1].in_features, 150)
        model.to(device)
        model.eval()
        return model

classifier = load_classifier(MODEL_PATH)

# ---------------------------------------------------------
# 3. 분석 API (기존 로직 유지하되 효율성 개선)
# ---------------------------------------------------------
@router.post("/analyze")
async def analyze_food(file: UploadFile = File(...)):
    try:
        image_data = await file.read()
        original_img = Image.open(io.BytesIO(image_data)).convert('RGB')
        
        # 1. YOLO로 음식 위치들 찾기
        results = yolo_model.predict(original_img, conf=0.25) # 임계값 조정
        detected_items = []

        if results[0].boxes:
            for box in results[0].boxes:
                # 음식 위치 크롭
                xyxy = box.xyxy[0].tolist()
                cropped = original_img.crop((xyxy[0], xyxy[1], xyxy[2], xyxy[3]))
                
                # 2. 크롭된 이미지를 B4 모델로 분류
                input_tensor = classify_transform(cropped).unsqueeze(0).to(device)
                with torch.no_grad():
                    output = classifier(input_tensor)
                    prob = torch.nn.functional.softmax(output, dim=1)
                    conf, idx = torch.max(prob, 1)
                
                fid = idx.item()
                f_info = FOOD_NUTRITION_DB.get(fid)
                
                if f_info:
                    detected_items.append({
                        "food_id": fid,
                        "food_name": f_info["name"],
                        "calories": f_info["kcal"],
                        "confidence": round(conf.item(), 2)
                    })

        # 중복된 음시는 확신도 높은 것만 남기기
        unique_items = {item['food_name']: item for item in detected_items}.values()
        return list(unique_items)

    except Exception as e:
        print(f"❌ 분석 에러: {e}")
        raise HTTPException(status_code=500, detail="분석 실패")

@router.get("/favorites")
def get_favorites(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # 💡 지금은 즐겨찾기 테이블이 따로 없으므로, 
    # DietLog에서 'is_favorite=1'인 데이터들을 그룹화해서 보내주거나 
    # 우선 빈 리스트라도 보내서 404를 없애야 합니다.
    
    # 임시로 빈 리스트 반환 (나중에 즐겨찾기 저장 로직 완성 후 수정)
    return []

@router.post("/record-many")
def record_many_foods(
    data: dict, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    meal_type = data.get("meal_type")
    items = data.get("items", [])
    today = date.today()

    # 🟢 [중복 방지 핵심] 오늘, 이 유저의, 해당 식사(아침 등) 기록을 먼저 지웁니다.
    db.query(DietLog).filter(
        DietLog.user_id == current_user.id,
        DietLog.date == today,
        DietLog.meal_type == meal_type
    ).delete()
    
    # 그 후 새로 받은 아이템들을 저장합니다.
    for item in items:
        new_log = DietLog(
            user_id=current_user.id,
            date=today,
            meal_type=meal_type,
            food_name=item.get("food_name"),
            calories=item.get("calories", 0),
            carbs=item.get("carbs", 0),
            protein=item.get("protein", 0),
            fat=item.get("fat", 0)
        )
        db.add(new_log)
    
    db.commit()
    return {"message": "식단이 최신 상태로 업데이트되었습니다."}