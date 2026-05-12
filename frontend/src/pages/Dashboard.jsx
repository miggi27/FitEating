import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../api/config';
import { useNavigate } from 'react-router-dom';
import { Activity, Zap, MessageSquare, TrendingUp, ArrowRight } from 'lucide-react';

const Dashboard = () => {
  const navigate = useNavigate();
  const [summary, setSummary] = useState({ total: { kcal: 0, carbs: 0, protein: 0, fat: 0 }, logs: [] });
  // ✨ 운동 데이터를 위한 상태 추가
  const [workoutStats, setWorkoutStats] = useState({ workout_time: 0, burned_calories: 0, total_volume: 0 });
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };

        // 1. 식단 데이터
        const dietRes = await axios.get(`${API_BASE_URL}/diet/daily-summary`, { headers });
        if (dietRes.data) setSummary(dietRes.data);

        // 2. ✨ 운동 데이터 가져오기 추가
        const workoutRes = await axios.get(`${API_BASE_URL}/routine/dashboard-stats`, { headers });
        if (workoutRes.data) setWorkoutStats(workoutRes.data);

      } catch (err) {
        console.error("데이터 로드 실패");
      }
    };
    fetchData();
  }, []);

  return (
    <div className={`fixed inset-0 overflow-y-scroll transition-colors duration-500 ${theme === 'dark' ? 'bg-[#0c0c0e] text-white' : 'bg-slate-50 text-slate-900'}`} style={{ scrollbarGutter: 'stable' }}>
      
      <div className="w-full max-w-6xl mx-auto min-h-screen flex flex-col p-6 lg:p-10 space-y-10">
        
        {/* 1️⃣ [TOP SECTION] 영양 상태 (오늘의 성적표) */}
        <header className="space-y-6">
          <div className="flex justify-between items-end">
            <div>
              <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] mb-2">Daily Nutrition Score</p>
              <h1 className="text-3xl font-black italic tracking-tighter uppercase leading-none">Status Dashboard</h1>
            </div>
            <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="px-4 py-2 rounded-xl border border-white/5 text-[9px] font-black uppercase tracking-widest bg-white/5">
              Theme Toggle
            </button>
          </div>

          <section className={`rounded-[3rem] p-10 border border-white/5 relative overflow-hidden ${theme === 'dark' ? 'bg-[#16161a]' : 'bg-white shadow-xl'}`}>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
              {/* 메인 칼로리 */}
              <div className="lg:col-span-4 border-r border-white/5">
                <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2">Total Calories</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-7xl font-black italic tracking-tighter text-blue-500">{Math.round(summary?.total?.kcal || 0)}</span>
                  <span className="text-sm font-bold text-slate-500 uppercase">kcal</span>
                </div>
              </div>
              {/* 탄단지 3요소 */}
              <div className="lg:col-span-8 grid grid-cols-3 gap-4">
                {[
                  { label: 'Carbs', val: summary?.total?.carbs || 0, color: 'text-blue-400', bg: 'bg-blue-500/5' },
                  { label: 'Protein', val: summary?.total?.protein || 0, color: 'text-orange-400', bg: 'bg-orange-500/5' },
                  { label: 'Fat', val: summary?.total?.fat || 0, color: 'text-yellow-400', bg: 'bg-yellow-500/5' }
                ].map(n => (
                  <div key={n.label} className={`${n.bg} p-6 rounded-[2rem] border border-white/5`}>
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">{n.label}</p>
                    <p className={`text-2xl font-black ${n.color}`}>{Math.round(n.val)}<span className="text-[10px] ml-1 opacity-50">g</span></p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </header>

        {/* 2️⃣ [MIDDLE SECTION] 운동 & 머슬 맵 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* 사람 모양 근육 활성도 파트 (메인 비주얼) */}
          <div className="lg:col-span-8 space-y-6">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Muscle Activation Map</h3>
              <div className="flex gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                <span className="text-[9px] font-black text-blue-500 uppercase">Live Analysis</span>
              </div>
            </div>
            
            <div className={`aspect-[4/3] lg:aspect-video rounded-[3rem] border border-white/5 relative overflow-hidden flex items-center justify-center ${theme === 'dark' ? 'bg-[#16161a]' : 'bg-white shadow-xl'}`}>
              <Activity size={60} className="text-white/5 absolute animate-ping" />
              <p className="text-[10px] font-black text-slate-700 uppercase tracking-[0.4em] z-10">Visualizing Muscle Groups...</p>
              
              {/* 운동 데이터 요약 플로팅 박스 */}
              <div className="absolute bottom-6 right-6 left-6 p-6 bg-black/40 backdrop-blur-2xl rounded-[2rem] border border-white/10 grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-[8px] font-black text-slate-500 uppercase mb-1">Workout Time</p>
                  <p className="text-lg font-black italic text-blue-400">
                    {workoutStats.workout_time}<span className="text-[10px] ml-1">m</span>
                  </p>
                </div>
                <div className="text-center border-x border-white/10">
                  <p className="text-[8px] font-black text-slate-500 uppercase mb-1">Total Volume</p>
                  <p className="text-lg font-black italic text-red-500">
                    {workoutStats.total_volume}<span className="text-[10px] ml-1">kg</span>
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-[8px] font-black text-slate-500 uppercase mb-1">Est. Burn</p>
                  <p className="text-lg font-black italic text-yellow-500">
                    {workoutStats.burned_calories}<span className="text-[10px] ml-1">cal</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 3️⃣ [RIGHT SECTION] 피드백 & 바로가기 */}
          <div className="lg:col-span-4 space-y-6">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] px-2 text-right">Insight & Action</h3>
            
            {/* AI 피드백 */}
            <div className={`p-8 rounded-[2.5rem] border border-blue-500/10 relative ${theme === 'dark' ? 'bg-gradient-to-br from-[#1c1c22] to-[#0c0c0e]' : 'bg-white shadow-lg'}`}>
              <MessageSquare className="text-blue-500 mb-4" size={24} />
              <p className="text-xs font-black text-white uppercase tracking-widest mb-3">AI Feedback</p>
              <p className="text-sm text-slate-400 leading-relaxed font-medium">
                "현재 영양 섭취량 대비 운동 강도가 매우 적절합니다. 특히 등 근육의 활성도가 눈에 띄게 좋아졌네요. 내일은 부족한 탄수화물을 10% 정도 더 섭취하는 것을 추천합니다."
              </p>
            </div>

            {/* 페이지 이동 버튼 (식단/운동) */}
            <div className="flex flex-col gap-4">
              <button 
                onClick={() => navigate('/diet')} 
                className="w-full py-6 rounded-[2rem] bg-blue-600 hover:bg-blue-500 text-white font-black uppercase text-[10px] tracking-[0.3em] transition-all flex items-center justify-center gap-3 shadow-xl shadow-blue-600/20"
              >
                Go to Diet <ArrowRight size={14} />
              </button>
              <button 
                onClick={() => navigate('/workout')} 
                className="w-full py-6 rounded-[2rem] bg-zinc-800 hover:bg-zinc-700 text-zinc-400 font-black uppercase text-[10px] tracking-[0.3em] transition-all flex items-center justify-center gap-3"
              >
                Workout Page <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;