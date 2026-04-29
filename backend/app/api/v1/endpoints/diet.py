import torch
import torch.nn as nn
from torchvision import models, transforms
from ultralytics import YOLO
from PIL import Image
import io
from fastapi import APIRouter, UploadFile, File

router = APIRouter()

# 1. 음식 영양 정보 DB (임시 데이터 - 나중에 실제 데이터로 채우세요)
# Key는 EfficientNet의 class_idx (0~149)입니다.
FOOD_NUTRITION_DB = {
    0: {"name": "쌀밥", "kcal": 300, "feedback": "탄수화물 에너지가 충분합니다."},
    1: {"name": "잡곡밥", "kcal": 320, "feedback": "식이섬유가 풍부한 좋은 선택입니다."},
    2: {"name": "김치볶음밥", "kcal": 450, "feedback": "나트륨이 높을 수 있으니 주의하세요."},
    # ... 나머지는 AI Hub 리스트에 맞춰서 채워넣어야 합니다.
}

# DB에 없는 ID가 들어올 경우를 위한 기본값 설정 함수
def get_food_info(class_idx):
    return FOOD_NUTRITION_DB.get(
        class_idx, 
        {"name": f"음식_{class_idx}", "kcal": 150, "feedback": "균형 잡힌 식단을 유지하세요."}
    )

@router.post("/analyze")
async def analyze_food(file: UploadFile = File(...)):
    try:
        image_data = await file.read()
        original_img = Image.open(io.BytesIO(image_data)).convert('RGB')
        
        # conf를 0.4 정도로 높이면 과탐지가 줄어듭니다.
        yolo_results = yolo_model.predict(original_img, conf=0.4, iou=0.45)
        
        final_detected_list = []
        
        if yolo_results[0].boxes:
            for box in yolo_results[0].boxes:
                # 너무 작은 박스(노이즈)는 무시하는 로직 (선택사항)
                w = box.xywh[0][2]
                h = box.xywh[0][3]
                if w < 30 or h < 30: continue 

                xyxy = box.xyxy[0].tolist()
                cropped_img = original_img.crop((xyxy[0], xyxy[1], xyxy[2], xyxy[3]))
                
                input_tensor = classify_transform(cropped_img).unsqueeze(0).to(device)
                with torch.no_grad():
                    output = classifier(input_tensor)
                    conf, idx = torch.max(torch.nn.functional.softmax(output, dim=1), 1)
                
                # 💡 정의한 DB에서 정보를 가져옴
                food_info = get_food_info(idx.item())
                
                final_detected_list.append({
                    "food_name": food_info["name"],
                    "calories": food_info["kcal"],
                    "confidence": round(conf.item(), 2),
                    "feedback": food_info["feedback"]
                })
        
        # YOLO가 실패했을 때 실행되는 로직
        if not final_detected_list:
            input_tensor = classify_transform(original_img).unsqueeze(0).to(device)
            with torch.no_grad():
                output = classifier(input_tensor)
                _, idx = torch.max(output, 1)
            
            food_info = get_food_info(idx.item())
            final_detected_list.append({
                "food_name": food_info["name"],
                "calories": food_info["kcal"],
                "confidence": 0.5,
                "feedback": "전체 이미지 분석 결과입니다."
            })

        return final_detected_list

    except Exception as e:
        print(f"Error: {e}")
        return [{"food_name": "에러 발생", "calories": 0, "confidence": 0, "feedback": str(e)}]

# 1. 모델 로드 (YOLO + EfficientNet)
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# 위치 잡는 용도 (가벼운 모델 추천)
yolo_model = YOLO('yolov8n.pt') 

# 상세 분류 용도
def load_classifier():
    model = models.efficientnet_v2_s(weights=None)
    model.classifier[1] = nn.Linear(model.classifier[1].in_features, 150) # 150종
    model.load_state_dict(torch.load('app/models/food/model_epoch_2.pth', map_location=device))
    model.to(device)
    model.eval()
    return model

classifier = load_classifier()

# 분류 모델용 전처리
classify_transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
])

# FOOD_CLASSES = [
#     "쌀밥", "잡곡밥", "김치볶음밥", "비빔밥", "김밥", 
#     "카레라이스", "오므라이스", "떡국", "만둣국", "미역국",
#     "쌀밥", "잡곡밥", "김치볶음밥", "비빔밥", "김밥", 
#     "카레라이스", "오므라이스", "떡국", "만둣국", "미역국",
#     "쌀밥", "잡곡밥", "김치볶음밥", "비빔밥", "김밥", 
#     "카레라이스", "오므라이스", "떡국", "만둣국", "미역국",
#     "쌀밥", "잡곡밥", "김치볶음밥", "비빔밥", "김밥", 
#     "카레라이스", "오므라이스", "떡국", "만둣국", "미역국",
#     "쌀밥", "잡곡밥", "김치볶음밥", "비빔밥", "김밥", 
#     "카레라이스", "오므라이스", "떡국", "만둣국", "미역국",
#     "쌀밥", "잡곡밥", "김치볶음밥", "비빔밥", "김밥", 
#     "카레라이스", "오므라이스", "떡국", "만둣국", "미역국",
#     "쌀밥", "잡곡밥", "김치볶음밥", "비빔밥", "김밥", 
#     "카레라이스", "오므라이스", "떡국", "만둣국", "미역국",
#     "쌀밥", "잡곡밥", "김치볶음밥", "비빔밥", "김밥", 
#     "카레라이스", "오므라이스", "떡국", "만둣국", "미역국",
#     "쌀밥", "잡곡밥", "김치볶음밥", "비빔밥", "김밥", 
#     "카레라이스", "오므라이스", "떡국", "만둣국", "미역국",
#     "쌀밥", "잡곡밥", "김치볶음밥", "비빔밥", "김밥", 
#     "카레라이스", "오므라이스", "떡국", "만둣국", "미역국",
#     "쌀밥", "잡곡밥", "김치볶음밥", "비빔밥", "김밥", 
#     "카레라이스", "오므라이스", "떡국", "만둣국", "미역국",
#     "쌀밥", "잡곡밥", "김치볶음밥", "비빔밥", "김밥", 
#     "카레라이스", "오므라이스", "떡국", "만둣국", "미역국",
#     "쌀밥", "잡곡밥", "김치볶음밥", "비빔밥", "김밥", 
#     "카레라이스", "오므라이스", "떡국", "만둣국", "미역국",
#     "쌀밥", "잡곡밥", "김치볶음밥", "비빔밥", "김밥", 
#     "카레라이스", "오므라이스", "떡국", "만둣국", "미역국",
#     "쌀밥", "잡곡밥", "김치볶음밥", "비빔밥", "김밥", 
#     "카레라이스", "오므라이스", "떡국", "만둣국", "미역국",
#     # ... 중략 (150개를 다 채워야 정확함) ...
#     # 임시로 150개까지 빈 값을 채워둡니다.
# ] + [f"미지정_음식_{i}" for i in range(150)]

@router.post("/analyze")
async def analyze_food(file: UploadFile = File(...)):
    try:
        image_data = await file.read()
        original_img = Image.open(io.BytesIO(image_data)).convert('RGB')
        
        # Step 1: YOLO 추론
        yolo_results = yolo_model.predict(original_img, conf=0.25, iou=0.45)
        
        final_detected_list = []
        
        # [Case A] YOLO가 박스를 하나라도 찾은 경우
        if yolo_results[0].boxes and len(yolo_results[0].boxes) > 0:
            for box in yolo_results[0].boxes:
                xyxy = box.xyxy[0].tolist()
                cropped_img = original_img.crop((xyxy[0], xyxy[1], xyxy[2], xyxy[3]))
                
                # 분류 모델(EfficientNet) 실행
                input_tensor = classify_transform(cropped_img).unsqueeze(0).to(device)
                with torch.no_grad():
                    output = classifier(input_tensor)
                    conf, idx = torch.max(torch.nn.functional.softmax(output, dim=1), 1)
                
                class_idx = idx.item()
                food_info = FOOD_NUTRITION_DB.get(class_idx, {"name": f"음식_{class_idx}", "kcal": 150})
                
                final_detected_list.append({
                    "food_name": food_info["name"],
                    "calories": food_info["kcal"],
                    "confidence": round(conf.item(), 2),
                    "feedback": "적절한 섭취량입니다." # 나중에 고도화할 부분
                })
        
        # [Case B] YOLO가 아무것도 못 찾았을 때 (사진 한 장이 곧 음식 하나인 경우)
        if not final_detected_list:
            input_tensor = classify_transform(original_img).unsqueeze(0).to(device)
            with torch.no_grad():
                output = classifier(input_tensor)
                conf, idx = torch.max(torch.nn.functional.softmax(output, dim=1), 1)
            
            class_idx = idx.item()
            food_info = FOOD_NUTRITION_DB.get(class_idx, {"name": f"음식_{class_idx}", "kcal": 150})
            
            final_detected_list.append({
                "food_name": food_info["name"],
                "calories": food_info["kcal"],
                "confidence": round(conf.item(), 2),
                "feedback": "음식을 하나로 인식하여 분석했습니다." 
            })

        return final_detected_list

    except Exception as e:
        print(f"Error: {e}")
        return [{"food_name": "분석 오류", "calories": 0, "confidence": 0, "feedback": str(e)}]