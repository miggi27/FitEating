import pandas as pd
import os

# 1. 파일 경로 설정 (기필코님 환경에 맞춰서 수정)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# data 폴더 안에 넣어두신 파일명으로 바꾸세요!
ORIGINAL_CSV = os.path.join(BASE_DIR, "data", "food_master_가공.csv") 
NEW_CSV = os.path.join(BASE_DIR, "data", "food_master_가공_utf8.csv")

def fix_csv_encoding():
    try:
        # 공공데이터는 보통 cp949입니다. 이걸로 먼저 시도!
        print(f"🔄 파일 읽는 중: {ORIGINAL_CSV}")
        df = pd.read_csv(ORIGINAL_CSV, encoding='cp949')
        
        # 🟢 불필요한 공백 제거 및 컬럼 정리
        df.columns = df.columns.str.strip()
        
        # 🟢 UTF-8-SIG로 저장 (맥/윈도우 모두 한글 안 깨짐)
        df.to_csv(NEW_CSV, index=False, encoding='utf-8-sig')
        print(f"✅ 변환 완료! 저장 위치: {NEW_CSV}")
        
        # 🟢 잘 되었는지 테스트 검색
        print("\n🔍 데이터 샘플 (상위 5개):")
        print(df.head())
        
        return df

    except Exception as e:
        print(f"❌ 에러 발생: {e}")
        print("💡 cp949로 안 된다면 'euc-kr'로 시도해 보세요.")

if __name__ == "__main__":
    df = fix_csv_encoding()