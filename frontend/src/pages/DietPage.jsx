import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../api/config';
import { useNavigate } from 'react-router-dom';
import { Plus, RotateCcw } from 'lucide-react';

const DietPage = () => {
  const navigate = useNavigate();
  const [summary, setSummary] = useState({ 
    total: { kcal: 0, carbs: 0, protein: 0, fat: 0 }, 
    logs: [] 
  });

  const fetchSummary = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE_URL}/diet/daily-summary`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSummary(res.data);
    } catch (err) { console.error("Load Failed", err); }
  };

  useEffect(() => { fetchSummary(); }, []);

  // 아침, 점심, 저녁 전용 초기화
  const handleReset = async (mealType) => {
    if (!window.confirm(`${mealType}을 초기화할까요?`)) return;
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_BASE_URL}/diet/record-many`, {
        meal_type: mealType,
        items: []
      }, { headers: { Authorization: `Bearer ${token}` } });
      fetchSummary();
    } catch (err) { alert("초기화 실패"); }
  };

  return (
    /* h-screen 대신 min-h-screen 사용 및 overflow-y-auto로 스크롤 보장 */
    <div className="min-h-screen bg-black text-slate-200 overflow-y-auto pb-20">
      <div className="max-w-md mx-auto p-4 space-y-6">
        
        {/* 상단 요약: 컬러 최소화 */}
        <div className="p-6 bg-zinc-900 rounded-3xl border border-zinc-800">
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Total Energy</p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-4xl font-black">{summary.total.kcal}</span>
            <span className="text-sm font-bold text-zinc-500">kcal</span>
          </div>
          
          <div className="grid grid-cols-3 gap-2 mt-6 pt-6 border-t border-zinc-800/50">
            {[
              { label: '탄', val: summary.total.carbs },
              { label: '단', val: summary.total.protein },
              { label: '지', val: summary.total.fat }
            ].map(n => (
              <div key={n.label} className="text-center">
                <p className="text-[10px] text-zinc-500">{n.label}</p>
                <p className="font-bold text-blue-500">{n.val}g</p>
              </div>
            ))}
          </div>
        </div>

        {/* AI 피드백 섹션: 가벼운 텍스트 위주 */}
        <div className="px-2">
          <p className="text-[10px] font-bold text-zinc-600 uppercase mb-2">AI Feedback</p>
          <p className="text-sm text-zinc-400 leading-relaxed">
            {summary.total.kcal === 0 ? "식단을 입력하면 AI 분석이 시작됩니다." : 
             summary.total.protein < 50 ? "현재 단백질 섭취량이 부족합니다. 보충이 필요해요." : "오늘 영양 균형이 아주 좋습니다."}
          </p>
        </div>

        {/* 식단 리스트: 아침/점심/저녁/간식 */}
        <div className="space-y-3">
          {['아침', '점심', '저녁', '간식'].map((type) => {
            const meals = summary.logs.filter(l => l.meal_type === type);
            const hasData = meals.length > 0;

            return (
              <div key={type} className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl flex justify-between items-center">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-black text-zinc-600 uppercase">{type}</span>
                    {hasData && (
                      <RotateCcw size={12} className="text-zinc-700 cursor-pointer" onClick={() => handleReset(type)} />
                    )}
                  </div>
                  <p className={`text-sm font-bold ${hasData ? 'text-zinc-200' : 'text-zinc-700 italic'}`}>
                    {hasData ? meals.map(m => m.food_name).join(', ') : '기록 없음'}
                  </p>
                </div>

                <button 
                  onClick={() => navigate(`/diet/add?type=${type}`)}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                    hasData ? 'bg-zinc-800 text-zinc-500' : 'bg-blue-600 text-white shadow-lg shadow-blue-900/20'
                  }`}
                >
                  <Plus size={20} />
                </button>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
};

export default DietPage;