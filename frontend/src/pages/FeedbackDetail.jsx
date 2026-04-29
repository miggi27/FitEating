import React from 'react';
import { ResponsiveContainer, Radar, RadarChart, PolarGrid, PolarAngleAxis } from 'recharts';
import { Save, RotateCcw, Award, CheckCircle2, AlertCircle } from 'lucide-react';

const FeedbackDetail = ({ result, exerciseName, theme, onReset, onSaveToBlog }) => {
  const isDark = theme === 'dark';
  const s = {
    card: isDark ? 'bg-[#16161a] border-white/5' : 'bg-white border-slate-200',
    text: isDark ? 'text-slate-200' : 'text-slate-900',
    subText: isDark ? 'text-slate-500' : 'text-slate-500',
    accent: 'text-blue-500'
  };

  // 서버에서 온 데이터를 차트용으로 변환
  const radarData = [
    { subject: 'Stability', A: result.cat_scores?.Stability || 0 },
    { subject: 'ROM', A: result.cat_scores?.ROM || 0 },
    { subject: 'Quality', A: result.cat_scores?.['Movement Quality'] || 0 },
    { subject: 'Posture', A: result.cat_scores?.Posture || 0 },
    { subject: 'Core', A: result.cat_scores?.Core || 0 },
  ];

  return (
    <div className="flex flex-col space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* 📸 분석 캡쳐 이미지 추가 */}
      {result.capture_url && (
        <div className={`mt-6 overflow-hidden rounded-3xl border ${theme === 'dark' ? 'border-white/10' : 'border-slate-200'} shadow-2xl bg-black`}>
          <div className="p-2 bg-slate-800/50 text-[10px] uppercase font-bold tracking-widest text-slate-400 px-4">
            Error Capture Moment
          </div>
          <img 
            src={result.capture_url} 
            alt="Exercise Error Capture" 
            /* 💡 object-contain으로 변경하여 이미지가 비율에 맞게 전체가 다 나오도록 합니다 */
            className="w-full h-auto max-h-[500px] object-contain mx-auto" 
          />
        </div>
      )}
      
      {/* 1. 상단 스코어 섹션 */}
      <div className={`p-8 rounded-3xl border ${s.card} text-center shadow-2xl`}>
        <div className="flex justify-center mb-4">
          <div className="relative">
            <Award size={80} className={s.accent} />
            <div className="absolute inset-0 flex items-center justify-center mt-2">
              <span className="text-2xl font-black text-white italic">{result.score || 0}</span>
            </div>
          </div>
        </div>
        <h2 className={`text-3xl font-black italic uppercase tracking-tighter ${s.text}`}>
          {exerciseName} REPORT
        </h2>
        <p className={`${s.subText} text-sm mt-1`}>Top {result.top_pct || 0}% Lifter 수준입니다.</p>
      </div>

      {/* 2. 레이더 차트 섹션 */}
      <div className={`p-4 rounded-3xl border ${s.card} flex flex-col items-center justify-center`}>
        <h3 className={`text-xs font-bold uppercase tracking-widest mb-4 ${s.subText}`}>Performance Chart</h3>
        <div className="w-full" style={{ height: '300px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
              <PolarGrid stroke={isDark ? "#333" : "#ddd"} />
              <PolarAngleAxis dataKey="subject" tick={{ fill: isDark ? '#888' : '#444', fontSize: 12 }} />
              <Radar
                name="Score"
                dataKey="A"
                stroke="#3b82f6"
                fill="#3b82f6"
                fillOpacity={0.5}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. 텍스트 피드백 섹션 */}
      <div className="space-y-4">
        <div className={`p-6 rounded-3xl border ${s.card}`}>
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 size={20} className="text-green-500" />
            <h4 className={`font-bold ${s.text}`}>종합 의견</h4>
          </div>
          <p className={`text-sm leading-relaxed ${s.text} opacity-80`}>
            {result.overall || "분석 데이터를 불러오는 중입니다..."}
          </p>
        </div>

        <div className={`p-6 rounded-3xl border ${s.card}`}>
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle size={20} className="text-amber-500" />
            <h4 className={`font-bold ${s.text}`}>카테고리별 분석</h4>
          </div>
          <ul className="space-y-3">
            {result.cat_details && Object.entries(result.cat_details).map(([cat, msg]) => (
              <li key={cat} className="flex flex-col gap-1 border-l-2 border-blue-500/30 pl-4">
                <span className={`text-[10px] font-bold uppercase ${s.subText}`}>{cat}</span>
                <span className={`text-sm ${s.text}`}>{msg}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* 4. 하단 액션 버튼 (생략했던 부분 포함) */}
      <div className="grid grid-cols-2 gap-4 pt-4">
        <button 
          onClick={onSaveToBlog}
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl transition-all active:scale-95 shadow-lg shadow-blue-600/20"
        >
          <Save size={18} />
          블로그 저장
        </button>
        <button 
          onClick={onReset}
          className={`flex items-center justify-center gap-2 ${s.card} border ${s.text} font-bold py-4 rounded-2xl transition-all active:scale-95 shadow-xl`}
        >
          <RotateCcw size={18} />
          다시 하기
        </button>
      </div>
    </div>
  );
};

export default FeedbackDetail;