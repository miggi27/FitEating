# backend/app/core/security.py
from passlib.context import CryptContext
from datetime import datetime, timedelta
from jose import jwt

SECRET_KEY = "your-super-secret-key" # 나중에 복잡하게 바꿔야 합니다!
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30 # 토큰 유효 시간 (30분)

def create_access_token(data: dict):
    """로그인 증표(JWT 토큰)를 생성합니다."""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# bcrypt 알고리즘을 사용하여 비밀번호 해싱
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password: str) -> str:
    """비밀번호를 해싱(암호화)합니다."""
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """입력한 비밀번호가 DB의 암호화된 비밀번호와 일치하는지 확인합니다."""
    # 만약 hashed_password가 None이거나 비어있으면 bcrypt가 에러를 냅니다.
    if not hashed_password:
        return False
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except ValueError:
        return False