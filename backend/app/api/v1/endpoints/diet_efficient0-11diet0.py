import torch
from torchvision.models.efficientnet import EfficientNet # 에러 메시지에 뜬 클래스 가져오기
from torchvision.ops.misc import Conv2dNormActivation
import torch.nn as nn
from torchvision import models, transforms
from ultralytics import YOLO
from PIL import Image
import pandas as pd
import io
import os
import uuid  # 파일명 중복 방지를 위해 상단에 추가
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Form
from sqlalchemy.orm import Session
from datetime import date

from app.database import get_db 
from app.api.v1.endpoints.auth import get_current_user
from app.models.user import User
from app.models.diet_log import DietLog
from roboflow import Roboflow
from dotenv import load_dotenv  # 🟢 환경 변수 로드용

# 1. 환경 변수 로드 (.env 파일을 읽어옴)
load_dotenv()
ROBOFLOW_API_KEY = os.getenv("ROBOFLOW_API_KEY")

router = APIRouter()

# 2. 장치 설정 (M4 맥미니라면 'mps', 아니면 'cpu'나 'cuda')
if torch.backends.mps.is_available():
    device = torch.device("mps")
elif torch.cuda.is_available():
    device = torch.device("cuda")
else:
    device = torch.device("cpu")

def search_food_nutrition(name: str):
    if FOOD_MASTER_DF is None or FOOD_MASTER_DF.empty:
        return []
        
    # 1. 포함된 모든 데이터 검색
    results = FOOD_MASTER_DF[FOOD_MASTER_DF["식품명"].str.contains(name, na=False)].copy()
    
    if not results.empty:
        # 2. 이름 짧은 순으로 정렬하여 상위 10개만 추출
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
        return output # 이제 리스트를 반환합니다!
    return []

@router.get("/search-nutrition")
def search_nutrition_api(name: str):
    return search_food_nutrition(name) # 리스트가 프론트로 전송됨

# 2. Roboflow 초기화 (가중치 파일 대신 API 모델 사용)
rf = Roboflow(api_key=ROBOFLOW_API_KEY)
project = rf.workspace("kingofnoob").project("food-detector-dkl2e")
roboflow_model = project.version(1).model

# 경로 설정
CURRENT_FILE_PATH = os.path.abspath(__file__)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(CURRENT_FILE_PATH))))
DB_PATH = os.path.join(BASE_DIR, "data", "food_list.csv") # 클래스인덱스
MODEL_PATH = os.path.join(BASE_DIR, "models", "food", "efficient0-11diet.pt") # 음식인식
# YOLO_PATH = os.path.join(BASE_DIR, "models", "food", "yolov8n.pt") # 음식분류
FOOD_CSV = os.path.join(BASE_DIR, "data", "food_master_음식_utf8.csv") # 칼탄단지 계산용
PROCESS_CSV = os.path.join(BASE_DIR, "data", "food_master_가공_utf8.csv") # 칼탄단지 계산용

# 저장 경로 설정 (상단 경로 설정 부분에 추가)
UPLOAD_DIR = os.path.join(BASE_DIR, "static", "uploads", "food")
os.makedirs(UPLOAD_DIR, exist_ok=True) # 폴더가 없으면 생성
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
                target_nutrition = master_df[master_df["식품명"].str.contains(f_name, na=False, regex=False)]
                
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
# device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
# yolo_model = YOLO(YOLO_PATH)

# Sequential과 EfficientNet 구조를 안전한 것으로 등록
torch.serialization.add_safe_globals([nn.Sequential, EfficientNet])

# 분류 모델 구조 정의
classifier = models.efficientnet_b0(weights=None)
num_ftrs = classifier.classifier[1].in_features
classifier.classifier[1] = nn.Linear(num_ftrs, 10)  # 클래스 개수에 맞게 수정 (예: 10개)
# classifier.load_state_dict(torch.load(MODEL_PATH, map_location=device))
checkpoint = torch.load(MODEL_PATH, map_location=device, weights_only=False)
if isinstance(checkpoint, dict):
    classifier.load_state_dict(checkpoint)
else:
    classifier = checkpoint
# classifier.load_state_dict(torch.load(MODEL_PATH, map_location=device, weights_only=False))
classifier.to(device)
classifier.eval()

# 전처리 설정
classify_transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
])

# 에러가 날 만한 모든 부품을 미리 안전 리스트에 등록
torch.serialization.add_safe_globals([
    nn.Sequential, 
    EfficientNet, 
    Conv2dNormActivation, 
    nn.Module,
    nn.Linear,
    nn.Conv2d,
    nn.BatchNorm2d,
    nn.ReLU,
    nn.AdaptiveAvgPool2d,
    nn.Dropout,
    nn.Sigmoid
])

# EfficientNet-B0 로드
def load_classifier(path):
    try:
        if not os.path.exists(path):
            raise FileNotFoundError(f"모델 파일이 없습니다: {path}")
            
        # 윈도우 + PyTorch 2.6 대응 핵심: weights_only=False
        # map_location=device로 현재 CPU/GPU에 맞게 로드
        checkpoint = torch.load(path, map_location=device, weights_only=False)
        
        # 1. 파일 자체가 모델 객체(Module)인 경우
        if isinstance(checkpoint, nn.Module):
            model = checkpoint
        # 2. 가중치(dict)만 들어있는 경우
        else:
            model = models.efficientnet_b0(weights=None)
            num_ftrs = model.classifier[1].in_features
            model.classifier[1] = nn.Linear(num_ftrs, 150) # 클래스 개수 확인 필요
            model.load_state_dict(checkpoint)
            
        model.to(device)
        model.eval()
        print(f"✅ [성공] {os.path.basename(path)} 모델 로드 완료!")
        return model

    except Exception as e:
        # 에러가 나면 서버가 죽지 않게 기본 모델이라도 띄웁니다.
        print(f"⚠️ [주의] 모델 로드 실패: {e}")
        model = models.efficientnet_b0(weights=None)
        model.classifier[1] = nn.Linear(model.classifier[1].in_features, 150)
        model.to(device)
        model.eval()
        return model

# 최종 호출
classifier = load_classifier(MODEL_PATH)

# 분석 API (탄단지 포함 반환)
@router.post("/analyze")
async def analyze_food(file: UploadFile = File(...)):    
    try:
        image_data = await file.read()
        original_img = Image.open(io.BytesIO(image_data)).convert('RGB')

        # 원본 이미지 임시 저장 (Roboflow API는 파일 경로가 필요할 수 있음)
        temp_filename = f"temp_{uuid.uuid4()}.jpg"
        temp_path = os.path.join(UPLOAD_DIR, temp_filename)
        original_img.save(temp_path)

        # 3. Roboflow 모델로 음식 위치 찾기 (신뢰도 낮게 설정)
        # 18장짜리 모델이므로 confidence를 낮춰야 홈페이지처럼 잡힙니다.
        prediction = roboflow_model.predict(temp_path, confidence=10)
        roboflow_results = prediction.json()
        
        # 임시 파일 삭제
        if os.path.exists(temp_path): os.remove(temp_path)

        temp_best_items = {}

        if roboflow_results.get('predictions'):
            for i, box in enumerate(roboflow_results['predictions']):
                # Roboflow는 중심점(x, y) 기반이므로 crop을 위해 x1, y1, x2, y2로 변환
                x, y = box['x'], box['y']
                w, h = box['width'], box['height']
                
                x1 = max(0, x - w/2)
                y1 = max(0, y - h/2)
                x2 = x + w/2
                y2 = y + h/2

                # 4. 이미지 쪼개기(Crop)
                cropped = original_img.crop((x1, y1, x2, y2))

                # 5. 분류 모델(EfficientNet) 통과
                input_tensor = classify_transform(cropped).unsqueeze(0).to(device)
                with torch.no_grad():
                    output = classifier(input_tensor)
                    probs = torch.nn.functional.softmax(output, dim=1)
                    conf_val, idx = torch.max(probs, 1)
                    current_conf = conf_val.item()

                f_info = FOOD_NUTRITION_DB.get(idx.item())
                if f_info:
                    food_name = f_info["name"]
                    
                    # 중복 제거 및 최고 확신도 아이템 유지
                    if food_name not in temp_best_items or current_conf > temp_best_items[food_name]['conf']:
                        crop_filename = f"{uuid.uuid4()}.jpg"
                        crop_path = os.path.join(UPLOAD_DIR, crop_filename)
                        cropped.save(crop_path, "JPEG")
                        
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


# 🟢 저장 API 수정
@router.post("/record-many")
def record_many_diet(
    data: dict, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    # 1. 프론트엔드에서 보낸 데이터 안전하게 꺼내기
    items = data.get("items", [])
    meal_type = data.get("meal_type")
    group_id = data.get("group_id") 
    image_url = data.get("image_url")  # 🟢 정의되지 않았던 변수 해결
    save_as_fav = data.get("save_as_favorite", False) # 🟢 정의되지 않았던 변수 해결
    
    today = date.today()

    try:
        # 2. 기존 데이터 삭제 (수정 모드 대응)
        if meal_type in ['아침', '점심', '저녁']:
            db.query(DietLog).filter(
                DietLog.user_id == current_user.id, 
                DietLog.date == today, 
                DietLog.meal_type == meal_type
            ).delete()
        else: # 간식일 때
            if group_id:
                db.query(DietLog).filter(
                    DietLog.user_id == current_user.id,
                    DietLog.entry_group_id == group_id
                ).delete()

        # 3. 새로운 데이터 등록
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
                entry_group_id=group_id, # 🟢 간식 그룹화를 위해 추가
                image_url=image_url,     # 🟢 이제 에러 안 남
                date=today,
                is_favorite=1 if save_as_fav else 0 # 🟢 boolean을 int(0/1)로 변환
            )
            db.add(new_log)
        
        db.commit()
        return {"status": "success", "message": "식단이 성공적으로 저장되었습니다."}
        
    except Exception as e:
        db.rollback()
        print(f"❌ 저장 중 서버 에러: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/daily-summary")
def get_daily_summary(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    logs = db.query(DietLog).filter(
        DietLog.user_id == current_user.id, 
        DietLog.date == date.today()
    ).all()

    # 🟢 무게(weight)를 반영한 정확한 합산 로직
    # DB의 calories가 100g 기준이라면 (val * weight / 100)을 해야 합니다.
    total_data = {
        "kcal": sum((l.calories * (l.weight / 100.0)) for l in logs),
        "carbs": sum((l.carbs * (l.weight / 100.0)) for l in logs),
        "protein": sum((l.protein * (l.weight / 100.0)) for l in logs),
        "fat": sum((l.fat * (l.weight / 100.0)) for l in logs)
    }
    # ⚠️ 수정/복원 기능을 위해 로그 원본(logs)은 절대 가공하지 않고 그대로 보냅니다.
    return {
        "total": total_data, 
        "logs": logs
    }

# 🟢 즐겨찾기 목록 가져오기
@router.get("/favorites")
def get_favorites_categorized(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # 모든 즐겨찾기 데이터를 가져옴
    fav_logs = db.query(DietLog).filter(
        DietLog.user_id == current_user.id, 
        DietLog.is_favorite == 1
    ).order_by(DietLog.created_at.desc()).all()

    # 결과 구조: { "식사": [세트1, 세트2], "간식": [세트1, 세트2] }
    result = {"meal": [], "snack": []}
    sets = {}

    for log in fav_logs:
        # 사진 경로를 기준으로 세트를 묶음 (사진이 없다면 생성 날짜 분 단위로 묶음)
        group_key = log.image_url if log.image_url else log.created_at.strftime("%Y-%m-%d %H:%M")
        
        if group_key not in sets:
            sets[group_key] = {
                "meal_type": log.meal_type,
                "image_url": log.image_url,
                "items": []
            }
        
        sets[group_key]["items"].append({
            "food_name": log.food_name,
            "calories": log.calories,
            "carbs": log.carbs,
            "protein": log.protein,
            "fat": log.fat,
            "weight": log.weight
        })

    # meal_type에 따라 분류 (아침/점심/저녁 -> meal, 간식 -> snack)
    for key, s in sets.items():
        category = "snack" if s["meal_type"] == "간식" else "meal"
        result[category].append(s)

    return result

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