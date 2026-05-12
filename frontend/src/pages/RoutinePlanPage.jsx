import React, { useState, useEffect, useRef } from 'react';
import { API_BASE_URL } from '../api/config';
import { Weight, Flame, Settings2, X, Save, CheckCircle2, TrendingUp } from 'lucide-react';

const RoutinePlanPage = ({ theme, setTheme }) => {
  const [currentRid, setCurrentRid] = useState('A'); 
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [completedSets, setCompletedSets] = useState(() => {
    const saved = localStorage.getItem('workout_progress');
    return saved ? JSON.parse(saved) : {};
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [inputs, setInputs] = useState({ squat: 20, bench: 20, deadlift: 20, ohp: 20, row: 20 });
  const [stats, setStats] = useState(null);
  const [dietSummary, setDietSummary] = useState({ calories: 0, protein: 0 });
  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = useRef(null);

  // 루틴 데이터를 가져오는 통합 함수
  const fetchPlanData = async (rid) => {
    setLoading(true);
    try {
      const planRes = await fetch(`${API_BASE_URL}/routine/plan/${rid}`); 
      if (!planRes.ok) throw new Error("Plan not found"); 

      const planData = await planRes.json();
      setPlan(planData);

      try {
        const [statsRes, dietRes] = await Promise.all([
          fetch(`${API_BASE_URL}/routine/stats`),
          fetch(`${API_BASE_URL}/diet/today-summary`)
        ]);
        if (statsRes.ok) setStats(await statsRes.json());
        if (dietRes.ok) setDietSummary(await dietRes.json());
      } catch (subErr) {
        console.warn("Sub-data fetch failed.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlanData(currentRid);
  }, [currentRid]);

  useEffect(() => {
    localStorage.setItem('workout_progress', JSON.stringify(completedSets));
  }, [completedSets]);

  const toggleSet = (exName, setIdx) => {
    const isAdding = !(completedSets[exName] || []).includes(setIdx);
    setCompletedSets(prev => {
      const currentExSets = prev[exName] || [];
      const newSets = currentExSets.includes(setIdx)
        ? currentExSets.filter(i => i !== setIdx)
        : [...currentExSets, setIdx];
      return { ...prev, [exName]: newSets };
    });

    if (isAdding) {
      clearInterval(timerRef.current);
      setTimeLeft(90); 
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) { clearInterval(timerRef.current); return 0; }
          return prev - 1;
        });
      }, 1000);
    }
  };  

  const isAllFinished = plan?.exercises?.every(ex => 
    (completedSets[ex.name]?.length || 0) === (ex.name === 'deadlift' ? 1 : 5)
  ) || false;

  const handleUpdate1RM = async () => {
    for (const [name, val] of Object.entries(inputs)) {
      await fetch(`${API_BASE_URL}/routine/update-1rm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exercise_name: name, current_1rm: parseFloat(val) })
      });
    }
    setIsModalOpen(false);
    fetchPlanData(currentRid);
  };

  const handleFinishWorkout = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/routine/finish-workout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          routine_name: plan.routine_name,
          exercises: plan.exercises.map(ex => ({
            name: ex.name,
            completed_sets: completedSets[ex.name]?.length || 0,
            weight: ex.main_sets[0].weight
          }))
        })
      });

      if (response.ok) {
        alert("오늘 운동 완료! 고생하셨습니다. ㅡ.ㅡ+");
        localStorage.removeItem('workout_progress');
        window.location.href = "/";
      }
    } catch (err) {
      console.error("네트워크 에러:", err);
    }
  };

  const isDark = theme === 'dark' || theme === 'design';
  const bgClass = isDark ? "bg-[#0c0c0e]" : "bg-slate-50";
  const cardClass = isDark ? "bg-[#16161a] border-white/5" : "bg-white border-slate-200 shadow-sm";
  const textClass = isDark ? "text-white" : "text-slate-900";

  if (loading) return <div className={`fixed inset-0 ${bgClass} flex items-center justify-center text-blue-500 font-black italic`}>LOADING...</div>;
  if (!plan) return <div className={`fixed inset-0 ${bgClass} flex items-center justify-center text-red-500 font-black`}>PLAN NOT FOUND. CHECK BACKEND.</div>;

  return (
    <div className={`fixed inset-0 ${bgClass} ${textClass} overflow-y-auto`} style={{ scrollbarGutter: 'stable' }}>
      {timeLeft > 0 && (
        <div className="fixed top-[80px] left-1/2 -translate-x-1/2 z-[999] bg-orange-500 text-white px-10 py-3 rounded-full font-black shadow-lg flex items-center gap-3">
          <div className="w-2 h-2 bg-white rounded-full animate-ping" />
          <span>REST {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</span>
        </div>
      )}

      <div className="w-full max-w-6xl mx-auto pt-[50px] pb-[120px]">
        {/* 대시보드 섹션 */}
        <section className="px-6 py-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className={`${cardClass} p-6 rounded-[2rem] border-l-4 border-orange-500`}>
            <p className="text-[10px] font-black text-orange-500 uppercase mb-2">Today's Fuel</p>
            <div className="flex justify-between items-end">
              <h3 className="text-2xl font-black">1,850 <span className="text-sm opacity-50">kcal</span></h3>
              <span className="text-xs font-bold text-orange-400">Protein 120g</span>
            </div>
          </div>
          <div className={`${cardClass} p-6 rounded-[2rem] border-l-4 border-blue-600`}>
            <p className="text-[10px] font-black text-blue-500 uppercase mb-2">Power Status</p>
            <h3 className="text-2xl font-black">{stats?.current_status?.['squat']?.tm || '--'} <span className="text-sm opacity-50">kg</span></h3>
          </div>
          <div className={`${cardClass} p-6 rounded-[2rem] border-l-4 border-green-500`}>
            <p className="text-[10px] font-black text-green-500 uppercase mb-2">Last Session</p>
            <span className="font-black text-sm uppercase">{stats?.history?.[0]?.exercise || 'No logs yet'}</span>
          </div>
        </section>

        {/* 헤더 및 루틴 전환 버튼 */}
        <header className="p-6 flex justify-between items-center sticky top-0 z-50 backdrop-blur-md">
          <div className="flex gap-2">
            {['A', 'B', 'NSUNS'].map(rid => (
              <button 
                key={rid} 
                onClick={() => setCurrentRid(rid)}
                className={`px-4 py-1.5 rounded-full text-[10px] font-black transition-all ${currentRid === rid ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-slate-500'}`}
              >
                {rid}
              </button>
            ))}
          </div>
          <button onClick={() => setIsModalOpen(true)} className="p-2 bg-blue-600/10 text-blue-500 rounded-full"><Settings2 size={16}/></button>
        </header>

        <main className="p-6 space-y-10">
          <section>
            <div className="flex items-center gap-2 mb-2">
              <Flame size={18} className="text-orange-500" />
              <span className="text-xs font-black text-orange-500 uppercase">{plan.day_label}</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-black tracking-tighter">{plan.routine_name}</h1>
          </section>

          <section className="grid grid-cols-1 gap-12">
            {plan.exercises?.map((ex, idx) => (
              <div key={idx} className="space-y-6">
                <div className="flex items-baseline gap-3 border-l-4 border-blue-600 pl-4">
                  <h2 className="text-3xl font-black">{ex.name_ko}</h2>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className={`${cardClass} rounded-[2.5rem] p-6 opacity-60`}>
                    <p className="text-[10px] font-black mb-4 uppercase">Warm-up</p>
                    {ex.warmup_sets?.map((s, i) => (
                      <div key={i} className="flex justify-between text-sm mb-1">
                        <span>Set {i+1}</span>
                        <span className="font-black">{s.weight}kg × {s.reps}</span>
                      </div>
                    ))}
                  </div>
                  <div className={`${cardClass} rounded-[2.5rem] p-6 border-blue-500/20`}>
                    <p className="text-[10px] font-black text-blue-500 mb-6 uppercase">Main Sets - {ex.main_sets[0].weight}kg</p>
                    <div className="grid grid-cols-5 gap-2">
                      {ex.main_sets.map((_, sIdx) => {
                        const isDone = completedSets[ex.name]?.includes(sIdx);
                        return (
                          <button key={sIdx} onClick={() => toggleSet(ex.name, sIdx)} className={`aspect-square rounded-xl border flex items-center justify-center ${isDone ? 'bg-blue-600 border-none text-white' : 'border-white/10'}`}>
                            {isDone ? <CheckCircle2 size={20}/> : sIdx + 1}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </section>

          {Object.keys(completedSets).length > 0 && (
            <button onClick={handleFinishWorkout} className="w-full py-8 bg-blue-600 rounded-[2rem] font-black text-white text-xl shadow-2xl active:scale-95 transition-all">
              {isAllFinished ? "🚀 LEVEL UP & FINISH" : "FINISH WORKOUT"}
            </button>
          )}
        </main>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/90 p-4">
          <div className={`${cardClass} w-full max-w-md rounded-[2rem] p-8`}>
            <div className="flex justify-between mb-6">
              <h3 className="text-xl font-black">Set 1RM</h3>
              <button onClick={() => setIsModalOpen(false)}><X /></button>
            </div>
            <div className="space-y-4">
              {Object.keys(inputs).map(ex => (
                <div key={ex} className="flex justify-between items-center bg-white/5 p-3 rounded-xl">
                  <span className="uppercase text-xs font-bold text-slate-500">{ex}</span>
                  <input type="number" value={inputs[ex]} onChange={(e) => setInputs({...inputs, [ex]: e.target.value})} className="bg-transparent text-right font-black outline-none w-20 text-blue-500" />
                </div>
              ))}
            </div>
            <button onClick={handleUpdate1RM} className="w-full mt-6 py-4 bg-blue-600 text-white rounded-xl font-black">SAVE STATUS</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoutinePlanPage;