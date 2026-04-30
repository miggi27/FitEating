import torch
import torch.nn as nn
from torchvision import models, transforms
from ultralytics import YOLO
from PIL import Image
import io
import os
import csv
from fastapi import APIRouter, UploadFile, File

router = APIRouter()

# ---------------------------------------------------------
# 1. 경로 설정 및 DB 로드
# ---------------------------------------------------------
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
# app 폴더 위치 (diet.py가 app/api/v1/endpoints에 있다고 가정 시 상위 3단계)
BASE_DIR = os.path.abspath(os.path.join(CURRENT_DIR, "..", "..", ".."))
DB_PATH = os.path.join(BASE_DIR, "models", "food", "food_info.csv")
MODEL_PATH = os.path.join(BASE_DIR, "models", "food", "kfood_model_260430.pth")

def load_food_db(file_path):
    food_db = {}
    try:
        with open(file_path, mode='r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            for row in reader:
                food_db[int(row['id'])] = {
                    "name": row['name'],
                    "kcal": int(row['calories']),
                    "feedback": "성공적인 식단 관리를 응원합니다!"
                }
        print(f"✅ CSV 로드 성공: {len(food_db)}개 항목")
    except Exception as e:
        print(f"❌ CSV 로드 실패: {e}")
    return food_db

FOOD_NUTRITION_DB = load_food_db(DB_PATH)

# ---------------------------------------------------------
# 2. 모델 로드 (YOLO + EfficientNet)
# ---------------------------------------------------------
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# YOLOv8 기본 모델 (객체 위치 탐지용)
yolo_model = YOLO('yolov8n.pt') 

def load_classifier():
    model = models.efficientnet_v2_s(weights=None)
    model.classifier[1] = nn.Linear(model.classifier[1].in_features, 150)
    if os.path.exists(MODEL_PATH):
        model.load_state_dict(torch.load(MODEL_PATH, map_location=device))
        print(f"✅ 분류 모델 로드 완료: {MODEL_PATH}")
    else:
        print(f"❌ 분류 모델 파일을 찾을 수 없습니다: {MODEL_PATH}")
    model.to(device)
    model.eval()
    return model

classifier = load_classifier()

classify_transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
])

# ---------------------------------------------------------
# 3. API 엔드포인트
# ---------------------------------------------------------
@router.post("/analyze")
async def analyze_food(file: UploadFile = File(...)):
    try:
        image_data = await file.read()
        original_img = Image.open(io.BytesIO(image_data)).convert('RGB')
        
        # [Step 1] YOLO 탐지 - 문턱값을 낮춰서 최대한 많이 잡습니다.
        yolo_results = yolo_model.predict(
            original_img, 
            conf=0.45,    # 0.5에서 낮춤 (더 많이 찾게)
            iou=0.3,     # 겹침 허용도 조절
            agnostic_nms=True
        )
        
        temp_detected_list = []
        
        if yolo_results[0].boxes:
            print(f"🔎 탐지된 객체 수: {len(yolo_results[0].boxes)}")
            
            for box in yolo_results[0].boxes:
                class_id = int(box.cls[0])
                label = yolo_model.names[class_id]
                
                # 가구/도구 등 음식이 절대 아닌 것만 제외 (bowl은 포함시킴 - 한국 음식 특성)
                if label in ['knife', 'fork', 'spoon', 'dining table', 'chair', 'person']:
                    continue
                
                # 좌표 추출 및 이미지 크롭
                xyxy = box.xyxy[0].tolist()
                cropped_img = original_img.crop((xyxy[0], xyxy[1], xyxy[2], xyxy[3]))
                
                # [Step 2] EfficientNet으로 무슨 음식인지 분류
                input_tensor = classify_transform(cropped_img).unsqueeze(0).to(device)
                with torch.no_grad():
                    output = classifier(input_tensor)
                    prob = torch.nn.functional.softmax(output, dim=1)
                    conf, idx = torch.max(prob, 1)
                
                # DB에서 정보 매칭
                food_id = idx.item()
                food_info = FOOD_NUTRITION_DB.get(food_id, {
                    "name": f"알 수 없는 음식({food_id})", 
                    "kcal": 0, 
                    "feedback": "정보 없음"
                })
                
                temp_detected_list.append({
                    "food_name": food_info["name"],
                    "calories": food_info["kcal"],
                    "confidence": round(conf.item(), 2),
                    "feedback": food_info["feedback"]
                })
                print(f"🎯 분석결과: {food_info['name']} ({round(conf.item(), 2)})")

        # [Step 3] 중복 제거 및 결과 정리
        # 같은 이름의 음식이 여러 개 잡히면 가장 신뢰도 높은 것만 남김
        merged_dict = {}
        for item in temp_detected_list:
            name = item["food_name"]
            if name not in merged_dict or item["confidence"] > merged_dict[name]["confidence"]:
                merged_dict[name] = item

        final_list = list(merged_dict.values())

        # [Step 4] 아무것도 못 잡았을 때의 예외 처리 (이미지 전체 분석)
        if not final_list:
            input_tensor = classify_transform(original_img).unsqueeze(0).to(device)
            with torch.no_grad():
                output = classifier(input_tensor)
                conf, idx = torch.max(torch.nn.functional.softmax(output, dim=1), 1)
            
            food_id = idx.item()
            food_info = FOOD_NUTRITION_DB.get(food_id, {"name": "인식 불가", "kcal": 0, "feedback": ""})
            final_list.append({
                "food_name": food_info["name"],
                "calories": food_info["kcal"],
                "confidence": round(conf.item(), 2),
                "feedback": "전체 사진 분석 결과입니다."
            })

        return final_list

    except Exception as e:
        print(f"❌ 서버 에러: {e}")
        return [{"food_name": "에러 발생", "calories": 0, "confidence": 0, "feedback": str(e)}]