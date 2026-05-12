import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../api/config';
import { useNavigate } from 'react-router-dom';
import { Activity, Zap, MessageSquare, TrendingUp, ArrowRight, Flame } from 'lucide-react';
// 그래프 라이브러리 추가
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, AreaChart, Area, 
  BarChart, Bar, Cell, 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, 
  ResponsiveContainer // 👈 여기 한 번만 써주면 됩니다!
} from 'recharts';

const Dashboard = () => {
  const navigate = useNavigate();
  const [summary, setSummary] = useState({ total: { kcal: 0, carbs: 0, protein: 0, fat: 0 }, logs: [] });
  const [workoutStats, setWorkoutStats] = useState({ workout_time: 0, burned_calories: 0, total_volume: 0, history: [] });
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };

        const [dietRes, workoutRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/diet/daily-summary`, { headers }),
          axios.get(`${API_BASE_URL}/routine/dashboard-stats`, { headers })
        ]);

        if (dietRes.data) setSummary(dietRes.data);
        if (workoutRes.data) setWorkoutStats(workoutRes.data);
      } catch (err) {
        console.error("데이터 로드 실패");
      }
    };
    fetchData();
  }, []);

  const isDark = theme === 'dark';
  const cardClass = isDark ? "bg-[#16161a] border-white/5" : "bg-white shadow-xl border-slate-200";

  return (
    <div className={`fixed inset-0 overflow-y-scroll transition-colors duration-500 ${isDark ? 'bg-[#0c0c0e] text-white' : 'bg-slate-50 text-slate-900'}`}>
      <div className="w-full max-w-6xl mx-auto p-6 lg:p-10 space-y-8">
        
        {/* 1️⃣ [TOP] 초소형 칼로리 & 영양 바 */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] mb-1">Command Center</p>
            <h1 className="text-2xl font-black italic uppercase leading-none">Performance Summary</h1>
          </div>
          
          <div className={`flex items-center gap-6 p-4 rounded-3xl border ${cardClass}`}>
             <div className="flex items-center gap-3 border-r border-white/10 pr-6">
                <Flame className="text-orange-500" size={18} />
                <div>
                  <p className="text-[8px] font-black text-slate-500 uppercase">Today's Fuel</p>
                  <p className="text-lg font-black">{Math.round(summary?.total?.kcal || 0)} <span className="text-[10px] opacity-50 text-slate-500 italic">kcal</span></p>
                </div>
             </div>
             <div className="grid grid-cols-3 gap-4">
                {['Protein', 'Carbs', 'Fat'].map(label => (
                  <div key={label}>
                    <p className="text-[8px] font-black text-slate-500 uppercase">{label[0]}</p>
                    <p className="text-[11px] font-black">{Math.round(summary?.total?.[label.toLowerCase()] || 0)}g</p>
                  </div>
                ))}
             </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* 2️⃣ [MIDDLE LEFT] 머슬 활성도 맵 */}
          <div className="lg:col-span-4 space-y-4">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">Muscle Activation</h3>
            <div className={`aspect-[3/4] rounded-[3rem] border flex items-center justify-center relative overflow-hidden ${cardClass}`}>
              {/* 여기에 실제 사람 모양 SVG가 들어갈 자리입니다. 
                  임시로 아이콘과 텍스트를 배치했습니다. */}
              <div className="absolute inset-0 opacity-10 flex items-center justify-center pointer-events-none">
                <Activity size={300} />
              </div>
              
              {/* 활성화된 부위 텍스트 오버레이 */}
              <div className="relative z-10 space-y-4 text-center">
                <div className="animate-pulse">
                   <p className="text-[10px] font-black text-blue-500 uppercase">Chest</p>
                   <p className="text-2xl font-black italic">85%</p>
                </div>
                <div>
                   <p className="text-[10px] font-black text-slate-500 uppercase">Triceps</p>
                   <p className="text-2xl font-black italic opacity-40">40%</p>
                </div>
                <div className="animate-pulse">
                   <p className="text-[10px] font-black text-blue-500 uppercase">Quads</p>
                   <p className="text-2xl font-black italic text-shadow-glow">92%</p>
                </div>
              </div>

              <div className="absolute bottom-6 px-6 w-full">
                <div className="bg-black/40 backdrop-blur-xl p-4 rounded-2xl border border-white/5 text-center">
                   <p className="text-[8px] font-black text-blue-400 uppercase mb-1">Focus Zone</p>
                   <p className="text-xs font-bold italic uppercase">Lower Body & Chest Day</p>
                </div>
              </div>
            </div>
          </div>

          {/* 3️⃣ [MIDDLE RIGHT] 성장 그래프 & 운동 요약 */}
          <div className="lg:col-span-8 space-y-6">
             <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Time', val: workoutStats.workout_time, unit: 'm', color: 'text-blue-500' },
                  { label: 'Volume', val: workoutStats.total_volume, unit: 'kg', color: 'text-red-500' },
                  { label: 'Burned', val: workoutStats.burned_calories, unit: 'cal', color: 'text-yellow-500' }
                ].map(item => (
                  <div key={item.label} className={`p-6 rounded-[2rem] border ${cardClass}`}>
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">{item.label}</p>
                    <p className={`text-2xl font-black italic ${item.color}`}>{item.val}<span className="text-[10px] ml-1 opacity-50 uppercase">{item.unit}</span></p>
                  </div>
                ))}
             </div>

             {/* 메인 성장 차트 */}
             <div className={`p-8 rounded-[3rem] border h-[350px] ${cardClass}`}>
                <div className="flex justify-between items-center mb-6">
                   <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Weekly Performance Trend</h3>
                   <TrendingUp size={16} className="text-blue-500" />
                </div>
                <div className="w-full h-full pb-8">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={workoutStats.history || []}>
                      <defs>
                        <linearGradient id="colorVol" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                      <XAxis dataKey="date" hide />
                      <YAxis hide domain={['auto', 'auto']} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#16161a', border: '1px solid #ffffff10', borderRadius: '15px', fontSize: '12px' }}
                        itemStyle={{ color: '#2563eb', fontWeight: '900' }}
                      />
                      <Area type="monotone" dataKey="total_volume" stroke="#2563eb" strokeWidth={4} fillOpacity={1} fill="url(#colorVol)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
             </div>
          </div>
        </div>

        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={workoutStats.muscle_group_data}>
              <PolarGrid stroke="#ffffff10" />
              <PolarAngleAxis dataKey="group" tick={{ fill: '#64748b', fontSize: 10 }} />
              <Radar
                name="Volume"
                dataKey="volume"
                stroke="#2563eb"
                fill="#2563eb"
                fillOpacity={0.5}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* 4️⃣ [BOTTOM] 액션 버튼 */}
        <footer className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-10">
          <button onClick={() => navigate('/diet')} className="group p-8 rounded-[2rem] bg-blue-600 text-white font-black uppercase text-xs tracking-[0.3em] flex justify-between items-center transition-all hover:bg-blue-500">
            Nutrition Logs <ArrowRight className="group-hover:translate-x-2 transition-transform" />
          </button>
          <button onClick={() => navigate('/workout')} className="group p-8 rounded-[2rem] bg-zinc-800 text-zinc-400 font-black uppercase text-xs tracking-[0.3em] flex justify-between items-center transition-all hover:bg-zinc-700 hover:text-zinc-200">
            Start Workout <ArrowRight className="group-hover:translate-x-2 transition-transform" />
          </button>
        </footer>
      </div>
    </div>
  );
};

export default Dashboard;