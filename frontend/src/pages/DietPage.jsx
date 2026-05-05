// src/pages/DietPage.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../api/config';
import { useNavigate } from 'react-router-dom';

const DietPage = () => {
  const navigate = useNavigate();
  const [summary, setSummary] = useState({ 
    total: { kcal: 0, carbs: 0, protein: 0, fat: 0 }, 
    logs: [] 
  });

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_BASE_URL}/diet/daily-summary`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSummary(res.data);
      } catch (err) {
        console.error("데이터 로드 실패", err);
      }
    };
    fetchSummary();
  }, []);

  return (
    <div className="max-w-md mx-auto p-4 space-y-6">
      {/* 1. 오늘의 총합 (대시보드 영역) */}
      <div className="p-6 bg-green-500 text-white rounded-3xl shadow-lg">
        <h2 className="text-lg font-bold opacity-80">오늘 섭취한 칼로리</h2>
        <p className="text-4xl font-black mt-1">{summary.total.kcal} <span className="text-xl">kcal</span></p>
        
        <div className="grid grid-cols-3 gap-2 mt-6">
          <div className="bg-white/20 p-2 rounded-xl text-center">
            <p className="text-[10px] opacity-80">탄수화물</p>
            <p className="font-bold">{summary.total.carbs}g</p>
          </div>
          <div className="bg-white/20 p-2 rounded-xl text-center">
            <p className="text-[10px] opacity-80">단백질</p>
            <p className="font-bold">{summary.total.protein}g</p>
          </div>
          <div className="bg-white/20 p-2 rounded-xl text-center">
            <p className="text-[10px] opacity-80">지방</p>
            <p className="font-bold">{summary.total.fat}g</p>
          </div>
        </div>
      </div>

      {/* 2. 식단 기록 리스트 (아침, 점심, 저녁, 간식) */}
      <div className="space-y-4">
        {['아침', '점심', '저녁', '간식'].map((type) => (
          <div key={type} className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm flex justify-between items-center">
            <div>
              <span className="text-sm font-bold text-slate-400">{type}</span>
              {/* 해당 식사 타입에 기록이 있으면 이름 표시, 없으면 '기록 없음' */}
              <p className="text-lg font-bold text-slate-800">
                {summary.logs.filter(l => l.meal_type === type).map(l => l.food_name).join(', ') || '기록이 없어요'}
              </p>
            </div>
            <button 
              onClick={() => navigate(`/diet/add?type=${type}`)} // 👈 타입(아침/점심 등)을 들고 이동!
              className="w-10 h-10 bg-green-100 text-green-600 rounded-full text-xl font-bold hover:bg-green-200 transition-all"
            >
              +
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DietPage;