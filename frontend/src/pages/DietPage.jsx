import React from 'react';
import FoodCalculator from './FoodCalculator';

const DietPage = ({ theme }) => {
  return (
    // <div className="absolute inset-0 overflow-y-auto p-6 pb-24">
    <div className="p-8 w-full overflow-y-auto max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">오늘의 식단 계산기</h2>
      <FoodCalculator theme={theme} />
    </div>
  );
};

export default DietPage;