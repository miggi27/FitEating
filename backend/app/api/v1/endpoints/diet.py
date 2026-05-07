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

# 경로 설정
CURRENT_FILE_PATH = os.path.abspath(__file__)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(CURRENT_FILE_PATH))))
DB_PATH = os.path.join(BASE_DIR, "models", "food", "food_info2.csv")
MODEL_PATH = os.path.join(BASE_DIR, "models", "food", "efficientnetb4.pt")
YOLO_PATH = os.path.join(BASE_DIR, "models", "food", "yolov8n.pt")

# 1. DB 로드 함수 (탄단지 컬럼 추가)
def load_food_db(path):
    db = {}
    try:
        df = pd.read_csv(path, encoding='utf-8-sig')
        for _, row in df.iterrows():
            try:
                f_id = int(row['id'])
                # 🟢 여기에 탄단지(carbs, protein, fat)가 정확히 매핑되어야 프론트에 나옵니다.
                db[f_id] = {
                    "name": str(row['name']),
                    "kcal": int(row.get('calories', 0)),
                    "carbs": float(row.get('carbs', 0)),
                    "protein": float(row.get('protein', 0)),
                    "fat": float(row.get('fat', 0))
                }
            except: continue
    except: pass
    return db

FOOD_NUTRITION_DB = load_food_db(DB_PATH)

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

# 저장 API (image_url 저장 로직)
@router.post("/record-many")
def record_many_foods(data: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    meal_type = data.get("meal_type")
    items = data.get("items", [])
    image_url = data.get("image_url") # 프론트의 preview 경로
    today = date.today()
    db.query(DietLog).filter(DietLog.user_id == current_user.id, DietLog.date == today, DietLog.meal_type == meal_type).delete()
    for item in items:
        db.add(DietLog(
            user_id=current_user.id, date=today, meal_type=meal_type,
            food_name=item.get("food_name"), calories=item.get("calories", 0),
            carbs=item.get("carbs", 0), protein=item.get("protein", 0),
            fat=item.get("fat", 0), image_url=image_url
        ))
    db.commit()
    return {"message": "저장 완료"}

@router.get("/daily-summary")
def get_daily_summary(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    logs = db.query(DietLog).filter(DietLog.user_id == current_user.id, DietLog.date == date.today()).all()
    return {"logs": logs}

@router.get("/favorites")
def get_favorites(): return []