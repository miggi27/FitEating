import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../api/config';
import { useNavigate } from 'react-router-dom';
import { Plus, RotateCcw, Edit3, X } from 'lucide-react';

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

  const handleReset = async (mealType) => {
    if (!window.confirm(`${mealType} 기록을 초기화할까요?`)) return;
    try {
      await axios.post(`${API_BASE_URL}/diet/record-many`, { meal_type: mealType, items: [] }, 
      { headers: { Authorization: `Bearer ${token}` } });
      fetchSummary();
    } catch (err) { alert("초기화 실패"); }
  };

  const fixedMeals = ['아침', '점심', '저녁'].map(type => {
    const items = (summary?.logs || []).filter(l => l.meal_type === type);
    return { type, items, hasData: items.length > 0 };
  });

  const snackGroups = (summary?.logs || [])
    .filter(l => l.meal_type === '간식')
    .reduce((acc, log) => {
      const gid = log.entry_group_id || `snack_${log.id}`;
      if (!acc[gid]) acc[gid] = [];
      acc[gid].push(log);
      return acc;
    }, {});

  return (
    // 💡 해결: 최상위 컨테이너 구조를 DietAddPage와 완벽하게 일치시킴
    <div className="fixed inset-0 bg-[#0c0c0e] text-white overflow-y-scroll" style={{ scrollbarGutter: 'stable' }}>
      
      <div className="w-full max-w-6xl mx-auto min-h-screen flex flex-col">
        
        {/* 상단 헤더: 수정 페이지와 높이 및 여백 일치 */}
        <header className="w-full flex justify-between items-center p-6 border-b border-white/5 sticky top-0 bg-[#0c0c0e]/80 backdrop-blur-md z-[100]">
          <div className="w-6"></div> {/* 여백 밸런스 */}
          <h2 className="text-[10px] font-black text-blue-500 italic uppercase tracking-[0.3em]">Daily Diet Overview</h2>
          <div className="w-6"></div>
        </header>

        {/* 메인 컨텐츠 */}
        <main className="flex-1 p-6 lg:p-10 space-y-10">
          
          {/* --- [대시보드: 전체 에너지 요약] --- */}
          <section className="bg-[#16161a] rounded-[3rem] p-10 border border-white/5 shadow-2xl relative overflow-hidden">
            {/* 배경 데코레이션 */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 blur-[100px] -z-10" />
            
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Total Energy Intake</p>
            <div className="flex items-baseline gap-3">
              <span className="text-7xl font-black italic text-white tracking-tighter">
                {Math.round(summary?.total?.kcal || 0)}
              </span>
              <span className="text-lg font-bold text-slate-500 italic uppercase">kcal</span>
            </div>

            <div className="grid grid-cols-3 gap-8 mt-12 pt-10 border-t border-white/5">
              {[
                { label: 'Carbs', val: summary?.total?.carbs || 0, color: 'text-blue-400' },
                { label: 'Protein', val: summary?.total?.protein || 0, color: 'text-orange-400' },
                { label: 'Fat', val: summary?.total?.fat || 0, color: 'text-yellow-400' }
              ].map(n => (
                <div key={n.label}>
                  <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-2">{n.label}</p>
                  <p className={`text-xl font-black ${n.color}`}>{Math.round(n.val)}<span className="text-[10px] ml-1 text-slate-500">g</span></p>
                </div>
              ))}
            </div>
          </section>

          {/* --- [식단 리스트 그리드] --- */}
          <section className="space-y-8">
            <div className="flex items-center gap-4">
              <div className="h-[1px] flex-1 bg-white/5"></div>
              <span className="text-[10px] font-black text-slate-700 uppercase tracking-[0.3em]">Main Meals</span>
              <div className="h-[1px] flex-1 bg-white/5"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {fixedMeals.map((meal) => (
                <div key={meal.type} className="bg-[#16161a] border border-white/5 rounded-[2.5rem] p-8 flex flex-col justify-between min-h-[180px] group hover:border-blue-500/30 transition-all shadow-lg">
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest bg-blue-500/10 px-3 py-1 rounded-full">{meal.type}</span>
                      {meal.hasData && (
                        <RotateCcw 
                          size={14} 
                          className="text-slate-700 hover:text-red-500 cursor-pointer transition-colors" 
                          onClick={() => handleReset(meal.type)} 
                        />
                      )}
                    </div>
                    <p className={`text-lg font-black leading-tight ${meal.hasData ? 'text-white' : 'text-slate-800 italic'}`}>
                      {meal.hasData ? meal.items.map(m => m.food_name).join(', ') : 'No data recorded'}
                    </p>
                  </div>
                  
                  <button 
                    onClick={() => navigate(`/diet/add?type=${meal.type}`)} 
                    className={`mt-6 w-full py-4 rounded-2xl flex items-center justify-center gap-2 font-black uppercase text-[10px] tracking-widest transition-all ${meal.hasData ? 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700' : 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-600/20'}`}
                  >
                    {meal.hasData ? <><Edit3 size={14} /> Edit</> : <><Plus size={14} /> Record</>}
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-4 pt-10">
              <div className="h-[1px] flex-1 bg-white/5"></div>
              <span className="text-[10px] font-black text-slate-700 uppercase tracking-[0.3em]">Snack Timeline</span>
              <div className="h-[1px] flex-1 bg-white/5"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Object.entries(snackGroups).map(([groupId, items], idx) => (
                <div key={groupId} className="bg-[#16161a] border border-orange-500/10 rounded-[2.5rem] p-8 flex flex-col justify-between min-h-[180px] shadow-lg">
                  <div>
                    <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest bg-orange-500/10 px-3 py-1 rounded-full mb-4 inline-block">Snack #{idx + 1}</span>
                    <p className="text-lg font-black text-white leading-tight">{items.map(m => m.food_name).join(', ')}</p>
                  </div>
                  <button 
                    onClick={() => navigate(`/diet/add?type=간식&group=${groupId}`)} 
                    className="mt-6 w-full py-4 rounded-2xl bg-zinc-800 text-zinc-500 hover:bg-zinc-700 flex items-center justify-center gap-2 font-black uppercase text-[10px] tracking-widest transition-all"
                  >
                    <Edit3 size={14} /> Modify
                  </button>
                </div>
              ))}

              {/* 간식 추가 버튼: 카드들과 높이를 맞춰서 일체감 부여 */}
              <button 
                onClick={() => {
                  const newGroupId = `snack_${new Date().getTime()}`; 
                  navigate(`/diet/add?type=간식&group=${newGroupId}&mode=new`);
                }}
                className="min-h-[180px] rounded-[2.5rem] border-2 border-dashed border-white/5 flex flex-col items-center justify-center gap-3 group hover:border-blue-500/50 transition-all"
              >
                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-blue-500/20 transition-all">
                  <Plus size={24} className="text-slate-700 group-hover:text-blue-500" />
                </div>
                <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest group-hover:text-blue-500">Add New Snack</span>
              </button>
            </div>
          </section>
        </main>

        {/* 하단 여백용 푸터 */}
        <footer className="py-20"></footer>
      </div>
    </div>
  );
};

export default DietPage;