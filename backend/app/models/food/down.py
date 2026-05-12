from roboflow import Roboflow
import os

# 1. 초기화
rf = Roboflow(api_key="aMXFsYTlzTgSBniRIa2H") 
project = rf.workspace("kingofnoob").project("food-detector-dkl2e")

# 2. 모델 버전 선택 (해당 프로젝트의 1번 버전)
version = project.version(1)
model = version.model

# 3. 로컬로 모델 가중치 및 설정 파일 다운로드
# 'yolov8' 등 해당 모델의 형식에 맞게 다운로드합니다.
# 경로를 지정하지 않으면 현재 디렉토리에 저장됩니다.
version.download("yolov8") 

print("다운로드가 완료되었습니다! 폴더를 확인해 보세요.")