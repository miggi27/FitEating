# yolo 모델의 클래스명 알려주는 코드
from ultralytics import YOLO

# model = YOLO('yolov8n.pt')
# model = YOLO('best.pt')
# print(model.names) # 이 모델이 구별할 수 있는 80가지 목록이 나옵니다!

import os
from ultralytics import YOLO

# 현재 실행 중인 .py 파일의 절대 경로를 구합니다.
current_path = os.path.dirname(os.path.abspath(__file__))
model_path = os.path.join(current_path, "best.pt")

print(f"찾으려는 모델 경로: {model_path}")

# 파일이 존재하는지 체크
if os.path.exists(model_path):
    model = YOLO(model_path)
    print("✅ 모델 로드 성공!")
    print(model.names)
else:
    print("❌ 에러: 같은 폴더에 best.pt 파일이 없습니다!")
    # 현재 폴더에 어떤 파일들이 있는지 출력해보기 (확인용)
    print(f"현재 폴더 파일 목록: {os.listdir(current_path)}")