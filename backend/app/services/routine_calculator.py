import math
from typing import List, Dict, Any

class RoutineCalculator:
    @staticmethod
    def round_weight(weight: float) -> float:
        """2.5kg 단위로 반올림 (가장 가까운 원판 무게 맞춤)"""
        return math.floor(weight / 2.5 + 0.5) * 2.5

    @staticmethod
    def calculate_plates(target_weight: float) -> List[float]:
        """바벨 양쪽에 끼울 원판 계산 (20kg 바벨 기준)"""
        weight_to_add = (target_weight - 20.0) / 2
        if weight_to_add <= 0:
            return []
        
        plates = []
        # 담당자가 설정한 가용 원판 리스트
        available_plates = [20.0, 15.0, 10.0, 5.0, 2.5, 1.25]
        for plate in available_plates:
            while weight_to_add >= plate:
                plates.append(plate)
                weight_to_add -= plate
                # 부동소수점 오차 방지
                weight_to_add = round(weight_to_add, 2)
        return plates

    @classmethod
    def get_warmup_sets(cls, training_max: float) -> List[Dict[str, Any]]:
        """본 운동 전 점진적 웜업 세트 계산 (담당자 로직 이식)"""
        # 40%, 60%, 80% 단계별 웜업
        percentages = [0.4, 0.6, 0.8]
        warmup_sets = []
        
        for p in percentages:
            weight = cls.round_weight(training_max * p)
            # 최소 무게는 빈 봉(20kg)
            final_weight = max(20.0, weight)
            warmup_sets.append({
                "weight": final_weight,
                "reps": 5,
                "is_warmup": True,
                "plates": cls.calculate_plates(final_weight)
            })
        return warmup_sets

    @classmethod
    def get_5x5_plan(cls, exercise_name: str, training_max: float) -> Dict[str, Any]:
        """StrongLifts 5x5 본 운동 세트 구성"""
        weight = cls.round_weight(training_max)
        return {
            "name": exercise_name,
            "weight": weight,
            "sets": 5,
            "reps": 5,
            "is_warmup": False,
            "plates": cls.calculate_plates(weight)
        }