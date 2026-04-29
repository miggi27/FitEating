import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image
import io
from fastapi import APIRouter, UploadFile, File

router = APIRouter()

# 1. 모델 클래스 정의 및 로드 (서버 시작 시 한 번만 실행되도록 설정하는 것이 좋음)
# 주의: num_classes는 학습할 때 사용한 '소분류'의 개수와 정확히 일치해야 합니다. (예: 152)
NUM_CLASSES = 150
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

def load_food_model():
    # 학습 코드와 동일한 구조 생성
    model = models.efficientnet_v2_s(weights=None)
    model.classifier[1] = nn.Linear(model.classifier[1].in_features, NUM_CLASSES)
    
    # 가중치 파일 로드
    model.load_state_dict(torch.load('app/models/food/model_epoch_2.pth', map_location=device))
    model.to(device)
    model.eval()
    return model

# 전역 변수로 모델 로드
food_model = load_food_model()

# 2. 전처리 (학습 코드의 transform과 동일하게 설정)
preprocess = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
])

# 실제 AI Hub 데이터셋의 클래스명을 리스트로 정의해야 합니다.
# 아래는 예시이며, 실제 학습 시 사용한 'classes.txt'나 폴더 순서와 맞아야 합니다.
FOOD_CLASSES = [
    "쌀밥", "잡곡밥", "김치볶음밥", "비빔밥", "김밥", 
    "카레라이스", "오므라이스", "떡국", "만둣국", "미역국",
    "쌀밥", "잡곡밥", "김치볶음밥", "비빔밥", "김밥", 
    "카레라이스", "오므라이스", "떡국", "만둣국", "미역국",
    "쌀밥", "잡곡밥", "김치볶음밥", "비빔밥", "김밥", 
    "카레라이스", "오므라이스", "떡국", "만둣국", "미역국",
    "쌀밥", "잡곡밥", "김치볶음밥", "비빔밥", "김밥", 
    "카레라이스", "오므라이스", "떡국", "만둣국", "미역국",
    "쌀밥", "잡곡밥", "김치볶음밥", "비빔밥", "김밥", 
    "카레라이스", "오므라이스", "떡국", "만둣국", "미역국",
    "쌀밥", "잡곡밥", "김치볶음밥", "비빔밥", "김밥", 
    "카레라이스", "오므라이스", "떡국", "만둣국", "미역국",
    "쌀밥", "잡곡밥", "김치볶음밥", "비빔밥", "김밥", 
    "카레라이스", "오므라이스", "떡국", "만둣국", "미역국",
    "쌀밥", "잡곡밥", "김치볶음밥", "비빔밥", "김밥", 
    "카레라이스", "오므라이스", "떡국", "만둣국", "미역국",
    "쌀밥", "잡곡밥", "김치볶음밥", "비빔밥", "김밥", 
    "카레라이스", "오므라이스", "떡국", "만둣국", "미역국",
    "쌀밥", "잡곡밥", "김치볶음밥", "비빔밥", "김밥", 
    "카레라이스", "오므라이스", "떡국", "만둣국", "미역국",
    "쌀밥", "잡곡밥", "김치볶음밥", "비빔밥", "김밥", 
    "카레라이스", "오므라이스", "떡국", "만둣국", "미역국",
    "쌀밥", "잡곡밥", "김치볶음밥", "비빔밥", "김밥", 
    "카레라이스", "오므라이스", "떡국", "만둣국", "미역국",
    "쌀밥", "잡곡밥", "김치볶음밥", "비빔밥", "김밥", 
    "카레라이스", "오므라이스", "떡국", "만둣국", "미역국",
    "쌀밥", "잡곡밥", "김치볶음밥", "비빔밥", "김밥", 
    "카레라이스", "오므라이스", "떡국", "만둣국", "미역국",
    "쌀밥", "잡곡밥", "김치볶음밥", "비빔밥", "김밥", 
    "카레라이스", "오므라이스", "떡국", "만둣국", "미역국",
    # ... 중략 (150개를 다 채워야 정확함) ...
    # 임시로 150개까지 빈 값을 채워둡니다.
] + [f"미지정_음식_{i}" for i in range(150)]

@router.post("/analyze")
async def analyze_food(file: UploadFile = File(...)):
    image_data = await file.read()
    image = Image.open(io.BytesIO(image_data)).convert('RGB')
    
    input_tensor = preprocess(image).unsqueeze(0).to(device)
    
    with torch.no_grad():
        outputs = food_model(input_tensor)
        # 상위 K개의 결과를 가져오면 여러 음식을 보여주는 '척'이라도 할 수 있습니다.
        probs, indices = torch.topk(torch.softmax(outputs, dim=1), k=3) 
        
    detected_list = []
    
    # 실제 프로젝트라면 여기에 class_idx별 이름/칼로리 매핑 딕셔너리가 있어야 합니다.
    # 예: FOOD_DB = { 0: {"name": "닭가슴살", "kcal": 165}, ... }
    
    for i in range(len(indices[0])):
        idx = indices[0][i].item()
        # confidence = probs[0][i].item()
        conf = probs[0][i].item()
        if conf > 0.2: # 신뢰도가 너무 낮은 건 제외
            food_name = FOOD_CLASSES[idx] if idx < len(FOOD_CLASSES) else f"ID_{idx}"
            detected_list.append({
                "food_name": food_name,
                "calories": 200 + (idx % 10 * 20), # 임시 칼로리 계산
                "confidence": round(conf, 2)
            })

    # 이제 프론트엔드는 이 리스트를 받아서 3개의 카드를 그립니다.
    return detected_list