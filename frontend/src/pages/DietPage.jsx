import React, { useEffect, useState } from 'react';
import axios from 'axios'; // axios가 설치되어 있어야 합니다 (npm install axios)
import { API_BASE_URL } from '../api/config';
import { useNavigate } from 'react-router-dom';
import { Plus, RotateCcw, Edit3, X } from 'lucide-react';

const DietPage = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const [summary, setSummary] = useState({ total: { kcal: 0, carbs: 0, protein: 0, fat: 0 }, logs: [] });

  const [aiFeedback, setAiFeedback] = useState(""); // AI 답변 저장
  const [isLoading, setIsLoading] = useState(false); // 로딩 상태

  const getAiFeedback = async () => {
    setIsLoading(true);
    try {
      // /api/v1을 떼고 /ai-feedback을 붙여야 하므로 아래처럼 조합하는 게 안전합니다.
      const baseUrl = API_BASE_URL.split('/api/v1')[0];
      const foodData = `칼로리 ${summary?.total?.kcal}kcal, 탄수화물 ${summary?.total?.carbs}g, 단백질 ${summary?.total?.protein}g, 지방 ${summary?.total?.fat}g`;
      const workoutData = "오늘의 운동 없음"; // 또는 실제 데이터

      const response = await axios.post(`${baseUrl}/ai-feedback`, {
        type: "TOTAL_DIET",
        // workout_data: "", // 키 이름 주의 (FastAPI 필드명과 일치)
        food_data: foodData        // 키 이름 주의
      });

      setAiFeedback(response.data.feedback);
    } catch (error) {
      console.error("AI 피드백 오류:", error);
      setAiFeedback("피드백을 가져오는데 실패했습니다.");
    }
    setIsLoading(false);
  };

  useEffect(() => {
  // 1. 칼로리 데이터가 들어왔고
  // 2. 이미 피드백을 받은 상태가 아닐 때만 실행 (무한 루프 방지)
  if (summary?.total?.kcal > 0 && !aiFeedback) { 
    getAiFeedback(); 
  }
}, [summary, aiFeedback]); // summary나 aiFeedback이 변하면 다시 체크해라!

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

  // 개별 아이템 삭제 함수 추가
  const handleDeleteItem = async (itemId) => {
    if (!window.confirm("이 항목을 삭제할까요?")) return;
    try {
      await axios.delete(`${API_BASE_URL}/diet/log/${itemId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchSummary(); // 삭제 후 목록 갱신
    } catch (err) {
      alert("삭제 실패");
    }
  };

  return (
    // 💡 해결: 최상위 컨테이너 구조를 DietAddPage와 완벽하게 일치시킴
    <div className="fixed inset-0 bg-[#0c0c0e] text-white overflow-y-scroll">      
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

          {/* 인공지능 피드백 추가 */}
          <div className="w-full max-w-6xl mx-auto px-6 pb-20"> {/* 폭은 설정 페이지처럼 5xl로 통일 */}
            <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 shadow-xl backdrop-blur-md">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-black text-blue-500 italic uppercase">AI Trainer Feedback</h3>
                  <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">Gemma-3 Powered Analysis</p>
                </div>
                <button 
                  onClick={getAiFeedback}
                  disabled={isLoading}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black rounded-full transition-all disabled:opacity-50"
                >
                  {isLoading ? "ANALYZING..." : "GET FEEDBACK"}
                </button>
              </div>

              {/* 피드백 내용이 나오는 곳 */}
              <div className="min-h-[80px] flex items-center justify-center border-t border-white/5 pt-6">
                {aiFeedback ? (
                  <p className="text-slate-200 text-sm font-medium leading-relaxed italic text-center">
                    "{aiFeedback}"
                  </p>
                ) : (
                  <p className="text-slate-500 text-xs italic">버튼을 눌러 오늘의 식단 피드백을 받아보세요.</p>
                )}
              </div>
            </div>
          </div>

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
          {/* 식단 리스트: 개별 삭제 버튼(X) 추가 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {fixedMeals.map((meal) => (
              <div key={meal.type} className="bg-[#16161a] border border-white/5 rounded-[2rem] p-6 flex flex-col justify-between min-h-[160px]">
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[9px] font-black text-blue-500 uppercase bg-blue-500/10 px-2 py-1 rounded-md">{meal.type}</span>
                    {meal.hasData && <RotateCcw size={12} className="text-slate-600 cursor-pointer" onClick={() => handleReset(meal.type)} />}
                  </div>
                  
                  {/* 개별 아이템 리스트와 삭제 버튼 */}
                  <div className="space-y-2">
                    {meal.hasData ? meal.items.map(m => (
                      <div key={m.id} className="flex justify-between items-center bg-white/5 px-3 py-2 rounded-xl group">
                        <span className="text-sm font-bold text-white">{m.food_name}</span>
                        <X 
                          size={14} 
                          className="text-slate-500 hover:text-red-500 cursor-pointer opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all" 
                          onClick={() => handleDeleteItem(m.id)}
                        />
                      </div>
                    )) : <p className="text-slate-700 italic text-sm">No record</p>}
                  </div>
                </div>
                <button onClick={() => navigate(`/diet/add?type=${meal.type}`)} className="mt-6 w-full py-3 bg-zinc-800 text-zinc-500 rounded-xl text-[10px] font-black uppercase">
                  {meal.hasData ? 'Edit' : 'Record'}
                </button>
              </div>
            ))}
          </div>
        </main>

        {/* 하단 여백용 푸터 */}
        <footer className="py-20"></footer>
      </div>
    </div>
  );
};

export default DietPage;