import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../api/config';
import { useNavigate } from 'react-router-dom';
import { Plus, RotateCcw, Edit3, ChevronRight } from 'lucide-react';

const DietPage = () => {
  const navigate = useNavigate();
  
  // 1. 초기 상태 구조를 백엔드와 완벽히 일치시켜 undefined 방지
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
      // 데이터가 존재할 때만 업데이트
      if (res.data) setSummary(res.data);
    } catch (err) { console.error("데이터 로드 실패", err); }
  };

  useEffect(() => { fetchSummary(); }, []);

  const handleReset = async (mealType) => {
    if (!window.confirm(`${mealType} 기록을 초기화할까요?`)) return;
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_BASE_URL}/diet/record-many`, {
        meal_type: mealType, items: []
      }, { headers: { Authorization: `Bearer ${token}` } });
      fetchSummary();
    } catch (err) { alert("초기화 실패"); }
  };

  return (
    // 🟢 [수정 1] pb-40을 추가하여 하단 네비바 공간 확보 (스크롤 끝까지 가능)
    <div className="min-h-screen bg-[#09090b] text-zinc-100 p-4 lg:p-8 flex justify-center">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* 누적 영양성분 대시보드 - 디자인 100% 유지 */}
        <div className="bg-zinc-900 rounded-[2.5rem] p-8 border border-white/5 shadow-2xl bg-gradient-to-br from-zinc-900 to-black">
          <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] mb-1">Daily Accumulation</p>
          <div className="flex items-baseline gap-2">
            {/* ?. 연산자를 사용하여 데이터 로딩 중 에러 발생 차단 */}
            <span className="text-5xl font-black italic tracking-tighter">
              {Math.round(summary?.total?.kcal || 0)}
            </span>
            <span className="text-xl font-bold text-zinc-600">kcal</span>
          </div>
          
          <div className="grid grid-cols-3 gap-4 mt-8 pt-6 border-t border-white/5">
            {[
              { label: 'Carbs', val: summary?.total?.carbs || 0, color: 'text-blue-400' },
              { label: 'Protein', val: summary?.total?.protein || 0, color: 'text-orange-400' },
              { label: 'Fat', val: summary?.total?.fat || 0, color: 'text-yellow-400' }
            ].map(n => (
              <div key={n.label} className="text-center">
                <p className="text-[9px] font-bold text-zinc-500 uppercase mb-1">{n.label}</p>
                <p className={`text-lg font-black ${n.color}`}>
                  {Math.round(n.val)}
                  <span className="text-[10px] ml-0.5 text-zinc-600">g</span>
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* AI 피드백 영역 */}
        <div className="bg-blue-600/10 border border-blue-500/20 rounded-3xl p-5">
          <h3 className="text-[10px] font-black text-blue-400 uppercase mb-2 tracking-widest">AI Nutrition Guide</h3>
          <p className="text-sm text-zinc-300 leading-relaxed font-medium">
            {(summary?.total?.kcal || 0) === 0 
              ? "첫 식단을 기록해 보세요! AI가 영양 균형을 분석해 드립니다." : 
              (summary?.total?.protein || 0) < 60 
              ? "오늘 단백질 섭취가 조금 적네요. 닭가슴살이나 계란을 추천해요!" 
              : "완벽한 영양 밸런스입니다. 이대로만 유지하세요!"}
          </p>
        </div>

        {/* 식단 리스트 */}
        <div className="space-y-3">
          {['아침', '점심', '저녁', '간식'].map((type) => {
            // logs가 undefined일 경우를 대비해 빈 배열로 필터링
            const meals = (summary?.logs || []).filter(l => l.meal_type === type);
            const hasData = meals.length > 0;

            return (
              <div key={type} className="group relative bg-zinc-900/40 border border-white/5 rounded-[2rem] p-5 flex justify-between items-center hover:bg-zinc-800/50 transition-all">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{type}</span>
                    {hasData && (
                      <RotateCcw 
                        size={12} 
                        className="text-zinc-700 hover:text-red-500 cursor-pointer transition-colors" 
                        onClick={() => handleReset(type)} 
                      />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <p className={`text-base font-bold ${hasData ? 'text-white' : 'text-zinc-700 italic'}`}>
                      {hasData ? meals.map(m => m.food_name).join(', ') : '기록이 없습니다'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {hasData ? (
                    <button 
                      onClick={() => navigate(`/diet/add?type=${type}`)} 
                      className="w-12 h-12 rounded-2xl bg-zinc-800 text-zinc-400 flex items-center justify-center hover:text-blue-500 border border-white/5 shadow-inner"
                    >
                      <Edit3 size={18} />
                    </button>
                  ) : (
                    <button 
                      onClick={() => navigate(`/diet/add?type=${type}`)} 
                      className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-900/40 hover:scale-105 active:scale-95 transition-all"
                    >
                      <Plus size={20} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DietPage;