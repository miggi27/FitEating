import React from 'react';
import { ResponsiveContainer, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
import { Save, RotateCcw, Award, CheckCircle2, AlertCircle, Activity, Target, ShieldCheck } from 'lucide-react';

const FeedbackDetail = ({ result, exerciseName, theme, onReset, onSaveToBlog }) => {
  const isDark = theme === 'dark';
  const s = {
    card: isDark ? 'bg-[#1c1c21] border-white/5' : 'bg-white border-slate-200',
    text: isDark ? 'text-slate-200' : 'text-slate-900',
    subText: isDark ? 'text-slate-500' : 'text-slate-500',
    accent: 'text-blue-500'
  };

  const radarData = [
    { subject: '안정성', A: result.cat_scores?.Stability || 0 },
    { subject: '가동범위', A: result.cat_scores?.ROM || 0 },
    { subject: '동작품질', A: result.cat_scores?.['Movement Quality'] || 0 },
    { subject: '자세', A: result.cat_scores?.Posture || 0 },
    { subject: '코어', A: result.cat_scores?.Core || 0 },
  ];

  return (
    <div className="flex flex-col space-y-6 pb-20 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* 1. 상단 요약 리포트 */}
      <div className={`p-10 rounded-[40px] border ${s.card} text-center shadow-2xl relative overflow-hidden`}>
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
        <div className="flex justify-center mb-4">
          <div className="bg-blue-500/10 p-4 rounded-full">
            <Award size={60} className={s.accent} />
          </div>
        </div>
        <h2 className={`text-4xl font-black italic tracking-tighter ${s.text} mb-2`}>
          {exerciseName} ANALYSIS
        </h2>
        <div className="flex justify-center items-baseline gap-2">
          <span className="text-6xl font-black text-blue-500 leading-none">{result.score || 0}</span>
          <span className="text-xl font-bold text-slate-500">POINTS</span>
        </div>
        <p className="mt-4 px-6 py-2 bg-blue-500/10 rounded-full inline-block text-blue-500 font-bold text-sm">
          {result.overall}
        </p>
      </div>

      {/* 2. 시각적 분석: 캡처 & 레이더 차트 */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* 운동 이름과 분석 캡처 - 어떤 운동인지 명확히 인지 */}
        <div className={`p-2 rounded-[35px] border ${s.card} shadow-2xl overflow-hidden bg-black`}>
          {/* 🔥 빨간 원이 포함된 캡처 사진 배치 */}
          {result?.capture_url ? (
            <img src={result.capture_url} alt="Analysis Result" className="w-full h-full object-contain" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-slate-500 italic">영상 분석 이미지를 생성 중입니다...</div>
          )}
        </div>

        {/* 능력치 차트 */}
        <div className={`p-6 rounded-[32px] border ${s.card} flex flex-col items-center justify-center min-h-[350px]`}>
          <h3 className={`text-xs font-bold uppercase tracking-widest mb-4 ${s.subText}`}>Performance Chart</h3>
          <div className="w-full h-[300px]"> 
            {/* ResponsiveContainer 부모는 반드시 고정 높이가 있어야 합니다 */}
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke={isDark ? "#333" : "#ddd"} />
                <PolarAngleAxis dataKey="subject" tick={{ fill: isDark ? '#888' : '#444', fontSize: 12 }} />
                <Radar name="Score" dataKey="A" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.4} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 3. 전문적인 카테고리 상세 진단 (이 부분이 성실함의 핵심) */}
      <div className={`p-8 rounded-[32px] border ${s.card}`}>
        <div className="flex items-center gap-2 mb-6">
          <ShieldCheck size={24} className="text-green-500" />
          <h4 className={`text-xl font-bold ${s.text}`}>운동 품질 상세 진단</h4>
        </div>
        <div className="grid gap-4">
          {result.cat_details && Object.entries(result.cat_details).map(([cat, msg]) => (
            <div key={cat} className="group p-5 rounded-2xl bg-white/5 border border-transparent hover:border-blue-500/30 transition-all">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-blue-400">{cat}</span>
                <span className="text-xs font-bold text-green-500">Excellent</span>
              </div>
              <p className={`text-sm leading-relaxed ${s.text} opacity-90`}>{msg}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 4. 하단 버튼 구역 */}
      <div className="flex gap-4">
        <button onClick={onReset} className={`flex-1 flex items-center justify-center gap-2 py-5 rounded-2xl font-bold ${s.card} border ${s.text} transition-all active:scale-95 shadow-xl`}>
          <RotateCcw size={20} />
          다시 시작하기
        </button>
        <button onClick={onSaveToBlog} className="flex-[1.5] flex items-center justify-center gap-2 py-5 rounded-2xl font-bold bg-blue-600 hover:bg-blue-700 text-white transition-all active:scale-95 shadow-lg shadow-blue-900/20">
          <Save size={20} />
          AI 리포트 블로그에 저장
        </button>
      </div>
    </div>
  );
};

export default FeedbackDetail;