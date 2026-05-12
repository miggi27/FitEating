from roboflow import Roboflow
import cv2

# 1. 초기화
rf = Roboflow(api_key="aMXFsYTlzTgSBniRIa2H")
project = rf.workspace("kingofnoob").project("food-detector-dkl2e")

# 2. 버전 설정 (AttributeError 방지)
# 해당 프로젝트는 버전 1만 있으니 직접 지정하는 게 가장 안전합니다.
version = project.version(1)
model = version.model

# 3. 이미지 전처리 (370x380 -> 640x640)
image_path = "feature_img01.jpg"
img = cv2.imread(image_path)
# 모델이 보통 640x640으로 학습되므로 크기를 맞춰줍니다.
img_resized = cv2.resize(img, (640, 640))
cv2.imwrite("resized_image.jpg", img_resized)

# 4. 추론 실행 (신뢰도를 10%까지 낮춤)
# 홈페이지와 결과가 다르다면 confidence를 조절해보세요.
prediction = model.predict("resized_image.jpg", confidence=1)

# 5. 결과 확인
print("--- 분석 결과 ---")
results = prediction.json()
print(results)

# 6. 눈으로 확인하기 위해 이미지 저장
prediction.save("prediction_result.jpg")