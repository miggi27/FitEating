import React from 'react';
import { useNavigate } from "react-router-dom";

const Settings = ({ theme, setTheme, s }) => {
  const navigate = useNavigate();

  // 섹션 타이틀 컴포넌트
  const SectionTitle = ({ children }) => (
    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4 ml-2">
      {children}
    </p>
  );

  return (

    /* 💡 해결 포인트:
      1. max-w-5xl: 다른 페이지와 폭을 똑같이 맞춤
      2. pt-[120px] pb-[200px]: 상단 네비바와 하단 네비바(2배 높음)에 가려지지 않게 물리적 여백 확보
      3. min-h-screen: 스크롤이 가능하도록 최소 높이 보장
    */
    
    <div className="w-full max-w-6xl px-6 pt-[50px] pb-[100px] space-y-8 overflow-y-scroll">
    {/* <div className="fixed inset-0 bg-[#0c0c0e] text-white overflow-y-scroll pt-[50px] pb-[100px]" style={{ scrollbarGutter: 'stable' }}> */}
      
      {/* 상단 헤더 */}
      <div className="flex flex-col gap-1 ml-2">
        <h2 className="text-3xl font-black text-white tracking-tighter italic uppercase">SETTINGS</h2>
        <p className="text-slate-500 text-xs font-medium">서비스 환경 및 개인 설정을 관리합니다.</p>
      </div>

      {/* 1. 테마 및 디자인 모드 설정 */}
      <div className="space-y-4">
        <SectionTitle>Display Mode</SectionTitle>
        <div className="grid grid-cols-3 gap-3 p-2 bg-white/5 rounded-[2.5rem] border border-white/5">
          <button 
            onClick={() => setTheme('dark')}
            className={`py-4 rounded-[1.8rem] text-xs font-black transition-all ${theme === 'dark' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-500 hover:text-slate-300'}`}
          >
            DARK
          </button>

          <button 
            onClick={() => setTheme('white')}
            className={`py-4 rounded-[1.8rem] text-xs font-black transition-all ${theme === 'white' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-500 hover:text-slate-300'}`}
          >
            LIGHT
          </button>

          <button 
            onClick={() => navigate("/designa")} 
            className="py-4 rounded-[1.8rem] bg-white/10 text-xs font-black text-white hover:bg-blue-600 transition-all uppercase"
          >
            Design A
          </button>
        </div>
      </div>

      {/* 2. 알림 설정 (원본 내용 복구) */}
      <div className="space-y-4">
        <SectionTitle>Notifications</SectionTitle>
        <div className="p-2 bg-white/5 rounded-[2.5rem] border border-white/5 space-y-1">
          {[
            { label: "운동 루틴 알림", desc: "정해진 시간에 운동 시작 알람을 받습니다." },
            { label: "식사 기록 리마인드", desc: "매 끼니 식단 기록을 잊지 않도록 알려줍니다." },
            { label: "주간 분석 리포트", desc: "한 주간의 변화를 요약해서 보내드립니다." }
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between p-5 hover:bg-white/5 rounded-[1.8rem] transition-colors group">
              <div>
                <p className="text-sm font-bold text-slate-200">{item.label}</p>
                <p className="text-[11px] text-slate-500">{item.desc}</p>
              </div>
              <div className="w-10 h-5 bg-slate-700 rounded-full relative cursor-pointer">
                <div className="absolute right-1 top-1 w-3 h-3 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. 목표 설정 (원본 내용 복구) */}
      <div className="space-y-4">
        <SectionTitle>Goal Settings</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-6 bg-white/5 rounded-[2.5rem] border border-white/5 hover:border-white/10 transition-colors">
            <p className="text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-tighter">현재 목표</p>
            <p className="text-xl font-black text-blue-500 italic">체지방 -3kg</p>
          </div>
          <div className="p-6 bg-white/5 rounded-[2.5rem] border border-white/5 hover:border-white/10 transition-colors">
            <p className="text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-tighter">일일 권장 칼로리</p>
            <p className="text-xl font-black text-white italic">2,100 kcal</p>
          </div>
        </div>
      </div>

      {/* 4. 계정 및 데이터 관리 (원본 내용 복구) */}
      <div className="space-y-4">
        <SectionTitle>Data Management</SectionTitle>
        <div className="p-2 bg-white/5 rounded-[2.5rem] border border-white/5">
          <button className="w-full text-left p-5 hover:bg-red-500/10 rounded-[1.8rem] transition-colors group">
            <p className="text-sm font-bold text-red-500/80 group-hover:text-red-500 uppercase tracking-tighter">모든 기록 초기화</p>
            <p className="text-[11px] text-slate-600 italic">주의: 삭제된 데이터는 복구할 수 없습니다.</p>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;