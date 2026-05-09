import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../api/config';
import { useNavigate } from 'react-router-dom';
import { Plus, RotateCcw, Edit3 } from 'lucide-react';

const DietPage = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const [summary, setSummary] = useState({ total: { kcal: 0, carbs: 0, protein: 0, fat: 0 }, logs: [] });

  const fetchSummary = async () => {
    if (!token) { navigate('/login'); return; }
    try {
      const res = await axios.get(`${API_BASE_URL}/diet/daily-summary`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data) setSummary(res.data);
    } catch (err) { console.error("로드 실패", err); }
  };

  useEffect(() => { fetchSummary(); }, []);

  // 초기화 함수 (기존 로직 유지)
  const handleReset = async (mealType) => {
    if (!window.confirm(`${mealType} 기록을 초기화할까요?`)) return;
    try {
      await axios.post(`${API_BASE_URL}/diet/record-many`, { meal_type: mealType, items: [] }, 
      { headers: { Authorization: `Bearer ${token}` } });
      fetchSummary();
    } catch (err) { alert("초기화 실패"); }
  };

  // 1. 아침, 점심, 저녁 데이터 필터링
  const fixedMeals = ['아침', '점심', '저녁'].map(type => {
    const items = (summary?.logs || []).filter(l => l.meal_type === type);
    return { type, items, hasData: items.length > 0 };
  });

  // 2. 간식 그룹화 (entry_group_id 기준)
  const snackGroups = (summary?.logs || [])
    .filter(l => l.meal_type === '간식')
    .reduce((acc, log) => {
      const gid = log.entry_group_id || `snack_${log.id}`;
      if (!acc[gid]) acc[gid] = [];
      acc[gid].push(log);
      return acc;
    }, {});

  return (
    <div className="h-screen bg-[#09090b] text-zinc-100 overflow-y-auto pb-44 px-4 pt-6">
      <div className="max-w-md mx-auto space-y-6">
        
        {/* --- [대시보드 영역] --- */}
        <div className="bg-zinc-900 rounded-[2.5rem] p-8 border border-white/5 shadow-2xl bg-gradient-to-br from-zinc-900 to-black">
          <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] mb-1">Daily Accumulation</p>
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-black italic tracking-tighter">{Math.round(summary?.total?.kcal || 0)}</span>
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
                <p className={`text-lg font-black ${n.color}`}>{Math.round(n.val)}g</p>
              </div>
            ))}
          </div>
        </div>

        {/* --- [식단 리스트 영역] --- */}
        <div className="space-y-3">
          
          {/* A. 아침, 점심, 저녁 (고정 3칸) */}
          {fixedMeals.map((meal) => (
            <div key={meal.type} className="bg-zinc-900/40 border border-white/5 rounded-[2rem] p-5 flex justify-between items-center">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{meal.type}</span>
                  {meal.hasData && <RotateCcw size={12} className="text-zinc-700 cursor-pointer" onClick={() => handleReset(meal.type)} />}
                </div>
                <p className={`text-base font-bold ${meal.hasData ? 'text-white' : 'text-zinc-700 italic'}`}>
                  {meal.hasData ? meal.items.map(m => m.food_name).join(', ') : '기록이 없습니다'}
                </p>
              </div>
              <button 
                onClick={() => navigate(`/diet/add?type=${meal.type}`)} 
                className={`w-12 h-12 rounded-2xl flex items-center justify-center border border-white/5 ${meal.hasData ? 'bg-zinc-800 text-zinc-400' : 'bg-blue-600 text-white'}`}
              >
                {meal.hasData ? <Edit3 size={18} /> : <Plus size={20} />}
              </button>
            </div>
          ))}

          <div className="py-2 border-b border-white/5 text-[10px] text-zinc-600 font-black uppercase tracking-[0.2em]">Snack List</div>

          {/* B. 간식 (기록된 개수만큼 카드 생성) */}
          {Object.entries(snackGroups).map(([groupId, items], idx) => (
            <div key={groupId} className="bg-zinc-900/40 border border-orange-500/10 rounded-[2rem] p-5 flex justify-between items-center">
              <div className="flex-1">
                <span className="text-[10px] font-black text-orange-500 uppercase mb-1 block">간식 #{idx + 1}</span>
                <p className="text-base font-bold text-white">{items.map(m => m.food_name).join(', ')}</p>
              </div>
              <button 
                onClick={() => navigate(`/diet/add?type=간식&group=${groupId}`)} 
                className="w-12 h-12 rounded-2xl bg-zinc-800 text-zinc-400 flex items-center justify-center border border-white/5"
              >
                <Edit3 size={18} />
              </button>
            </div>
          ))}

          {/* C. 새로운 간식 추가 버튼 (딱 하나만 하단에 배치) */}
          <button 
            onClick={() => {
              const newGroupId = `snack_${new Date().getTime()}`; 
              navigate(`/diet/add?type=간식&group=${newGroupId}&mode=new`);
            }}
            className="w-full py-6 rounded-[2rem] border-2 border-dashed border-white/5 text-zinc-500 font-black hover:border-blue-500/50 hover:text-orange-500 transition-all flex items-center justify-center gap-2"
          >
            <Plus size={20} />
            새로운 간식 추가하기
          </button>

        </div>
      </div>
    </div>
  );
};

export default DietPage;