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
# 현재 파일(diet.py)의 절대 경로를 기준으로 루트 디렉토리를 찾습니다.
CURRENT_FILE_PATH = os.path.abspath(__file__)
# 보통 app/api/v1/endpoints/diet.py 구조라면 4단계 올라가야 루트입니다.
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(CURRENT_FILE_PATH))))

DB_PATH = os.path.join(BASE_DIR, "models", "food", "food_info2.csv")
MODEL_PATH = os.path.join(BASE_DIR, "models", "food", "efficientnetb0.pt")

# [DB 로드 함수]
def load_food_db(path):
    db = {}
    try:
        if not os.path.exists(path):
            print(f"❌ [에러] CSV 파일을 찾을 수 없습니다: {path}")
            return db
            
        df = pd.read_csv(path, encoding='utf-8-sig')
        # 컬럼명 공백 제거
        df.columns = df.columns.str.strip()
        
        for _, row in df.iterrows():
            try:
                f_id = int(row['id'])
                db[f_id] = {
                    "name": str(row['name']).strip(),
                    "kcal": int(row['calories']),
                    "feedback": str(row['feedback']).strip()
                }
            except:
                continue
        print(f"✅ [성공] DB 로드 완료! 데이터 개수: {len(db)}개")
    except Exception as e:
        print(f"❌ [실패] DB 로드 중 오류: {e}")
    return db

# 서버 시작 시 로드
FOOD_NUTRITION_DB = load_food_db(DB_PATH)

# ---------------------------------------------------------
# 2. 모델 로드 (YOLO + EfficientNet-B0)
# ---------------------------------------------------------
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# 전처리 설정
classify_transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
])

# YOLO 모델 로드
yolo_model = YOLO('yolov8n.pt')

# EfficientNet-B0 로드
def load_classifier(path):
    try:
        if not os.path.exists(path):
            raise FileNotFoundError(f"모델 파일이 없습니다: {path}")
            
        # .pt 파일 전체 로드 (weights_only=False)
        model = torch.load(path, map_location=device, weights_only=False)
        model.to(device)
        model.eval()
        print(f"✅ [성공] {os.path.basename(path)} 모델 로드 완료!")
        return model
    except Exception as e:
        print(f"⚠️ [주의] 모델 로드 실패, 기본 구조 생성: {e}")
        model = models.efficientnet_b0(weights=None)
        model.classifier[1] = nn.Linear(model.classifier[1].in_features, 150)
        model.to(device)
        model.eval()
        return model

classifier = load_classifier(MODEL_PATH)

# ---------------------------------------------------------
# 3. 분석 API
# ---------------------------------------------------------
@router.post("/analyze")
async def analyze_food(file: UploadFile = File(...)):
    try:
        image_data = await file.read()
        original_img = Image.open(io.BytesIO(image_data)).convert('RGB')
        
        # [Step 1] YOLO 객체 탐지
        results = yolo_model.predict(original_img, conf=0.4, iou=0.3)
        temp_list = []
        
        if results[0].boxes:
            for box in results[0].boxes:
                label = yolo_model.names[int(box.cls[0])]
                if label in ['person', 'chair', 'dining table', 'knife', 'fork']:
                    continue
                
                # 크롭 및 분류
                xyxy = box.xyxy[0].tolist()
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
                else:
                    temp_list.append({
                        "food_name": f"미등록 음식(ID: {fid})",
                        "calories": 0,
                        "confidence": round(conf.item(), 2),
                        "feedback": "DB 정보를 확인해주세요."
                    })

        # [Step 2] 중복 제거
        merged = {}
        for item in temp_list:
            name = item["food_name"]
            if name not in merged or item["confidence"] > merged[name]["confidence"]:
                merged[name] = item

        final_result = list(merged.values())

        # [Step 3] 탐지 실패 시 전체 사진 분석
        if not final_result:
            input_tensor = classify_transform(original_img).unsqueeze(0).to(device)
            with torch.no_grad():
                output = classifier(input_tensor)
                conf, idx = torch.max(torch.nn.functional.softmax(output, dim=1), 1)
            
            fid = idx.item()
            f_info = FOOD_NUTRITION_DB.get(fid)
            
            if f_info:
                final_result.append({
                    "food_name": f_info["name"],
                    "calories": f_info["kcal"],
                    "confidence": round(conf.item(), 2),
                    "feedback": f_info["feedback"]
                })
            else:
                final_result.append({
                    "food_name": f"인식 불가(ID: {fid})",
                    "calories": 0,
                    "confidence": round(conf.item(), 2),
                    "feedback": "전체 사진 분석 결과가 DB에 없습니다."
                })

        return final_result

    except Exception as e:
        print(f"❌ 서버 에러: {e}")
        return [{"food_name": "에러 발생", "calories": 0, "confidence": 0, "feedback": str(e)}]