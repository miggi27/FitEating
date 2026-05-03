import torch
import torch.nn as nn
from torchvision import models, transforms
from ultralytics import YOLO
from PIL import Image
import pandas as pd
import io
import os
from fastapi import APIRouter, UploadFile, File

router = APIRouter()

# ---------------------------------------------------------
# 1. 경로 설정 및 파일 로드
# ---------------------------------------------------------
CURRENT_FILE_PATH = os.path.abspath(__file__)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(CURRENT_FILE_PATH))))

DB_PATH = os.path.join(BASE_DIR, "models", "food", "food_info2.csv")
MODEL_PATH = os.path.join(BASE_DIR, "models", "food", "efficientnetb4.pt")

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

# [수정] EfficientNet-B4의 최적 해상도는 380x380입니다.
classify_transform = transforms.Compose([
    transforms.Resize((380, 380)), # 224 -> 380으로 변경
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
])

yolo_model = YOLO('yolov8n.pt')

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
        
        results = yolo_model.predict(original_img, conf=0.4, iou=0.3)
        temp_list = []
        
        # 제외할 YOLO 클래스들
        exclude_labels = ['person', 'chair', 'dining table', 'knife', 'fork', 'cup', 'spoon']

        if results[0].boxes:
            for box in results[0].boxes:
                label = yolo_model.names[int(box.cls[0])]
                if label in exclude_labels:
                    continue
                
                xyxy = box.xyxy[0].tolist()
                # 살짝 여유있게 크롭 (음식 특징 파악에 유리)
                cropped = original_img.crop((xyxy[0], xyxy[1], xyxy[2], xyxy[3]))
                
                input_tensor = classify_transform(cropped).unsqueeze(0).to(device)
                with torch.no_grad():
                    output = classifier(input_tensor)
                    prob = torch.nn.functional.softmax(output, dim=1)
                    conf, idx = torch.max(prob, 1)
                
                fid = idx.item()
                f_info = FOOD_NUTRITION_DB.get(fid)
                
                if f_info:
                    temp_list.append({
                        "food_name": f_info["name"],
                        "calories": f_info["kcal"],
                        "confidence": round(conf.item(), 2),
                        "feedback": f_info["feedback"]
                    })

        # 탐지 실패 시 전체 사진 분석
        if not temp_list:
            input_tensor = classify_transform(original_img).unsqueeze(0).to(device)
            with torch.no_grad():
                output = classifier(input_tensor)
                conf, idx = torch.max(torch.nn.functional.softmax(output, dim=1), 1)
            
            f_info = FOOD_NUTRITION_DB.get(idx.item())
            if f_info:
                temp_list.append({
                    "food_name": f_info["name"],
                    "calories": f_info["kcal"],
                    "confidence": round(conf.item(), 2),
                    "feedback": f_info["feedback"]
                })

        # 중복 제거 (이름이 같으면 확신도 높은 것 선택)
        merged = {}
        for item in temp_list:
            name = item["food_name"]
            if name not in merged or item["confidence"] > merged[name]["confidence"]:
                merged[name] = item

        return list(merged.values())

    except Exception as e:
        return [{"food_name": "에러", "calories": 0, "confidence": 0, "feedback": str(e)}]