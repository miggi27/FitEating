// src/App.jsx
import React, { useState } from 'react';
import ExerciseAnalyzer from './components/ExerciseAnalyzer'; // 기존 분석 페이지
import BlogPage from './components/BlogPage';
import FoodCalculator from './components/FoodCalculator';
import Settings from './components/Settings';

const App = () => {
  const [currentTab, setCurrentTab] = useState('exercise'); // 메뉴 선택 상태
  const [mode, setMode] = useState('gym'); // gym vs home 모드 전환

  return (
    <div className="min-h-screen bg-gray-900 text-white pb-24">
      {/* 1. 상단 모드 전환 헤더 (운동 탭일 때만 표시) */}
      {currentTab === 'exercise' && (
        <header className="p-4 sticky top-0 bg-gray-900/80 backdrop-blur-md z-10">
          <div className="flex bg-gray-800 rounded-xl p-1 w-full max-w-sm mx-auto">
            <button 
              onClick={() => setMode('gym')}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition ${mode === 'gym' ? 'bg-blue-600' : ''}`}
            >
              🏋️ 헬스장 모드
            </button>
            <button 
              onClick={() => setMode('home')}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition ${mode === 'home' ? 'bg-blue-600' : ''}`}
            >
              🏠 홈트레이닝
            </button>
          </div>
        </header>
      )}

      {/* 2. 메인 컨텐츠 영역 */}
      <main className="p-4 max-w-4xl mx-auto">
        {currentTab === 'exercise' && (
          <div className="grid grid-cols-3 gap-3 md:gap-6">
            {/* 운동 카드들 (한 줄에 3개) */}
            <div onClick={() => {/* 분석페이지로 이동 */}} className="aspect-square bg-gray-800 rounded-2xl flex flex-col items-center justify-center border border-gray-700 hover:border-blue-500 cursor-pointer">
              <span className="text-3xl mb-2 text-blue-400">🦵</span>
              <span className="text-xs font-bold">스쿼트</span>
            </div>
            <div className="aspect-square bg-gray-800 rounded-2xl flex flex-col items-center justify-center opacity-50">
              <span className="text-3xl mb-2">💪</span>
              <span className="text-xs font-bold">벤치프레스</span>
            </div>
            <div className="aspect-square bg-gray-800 rounded-2xl flex flex-col items-center justify-center opacity-50">
              <span className="text-3xl mb-2">🧱</span>
              <span className="text-xs font-bold">데드리프트</span>
            </div>
            {/* 추가 운동들... */}
          </div>
        )}

        {currentTab === 'blog' && <BlogPage />}
        {currentTab === 'food' && <FoodCalculator />}
        {currentTab === 'settings' && <Settings />}
      </main>

      {/* 3. 하단 네비게이션 메뉴 (아이폰 고려 Safe Area 적용) */}
      <nav className="fixed bottom-6 left-4 right-4 bg-gray-800/90 border border-gray-700 h-16 rounded-3xl flex items-center justify-around shadow-2xl backdrop-blur-lg">
        <NavItem icon="📝" label="블로그" active={currentTab === 'blog'} onClick={() => setCurrentTab('blog')} />
        <NavItem icon="🏃" label="운동" active={currentTab === 'exercise'} onClick={() => setCurrentTab('exercise')} />
        <NavItem icon="🍎" label="음식" active={currentTab === 'food'} onClick={() => setCurrentTab('food')} />
        <NavItem icon="⚙️" label="설정" active={currentTab === 'settings'} onClick={() => setCurrentTab('settings')} />
      </nav>
    </div>
  );
};

const NavItem = ({ icon, label, active, onClick }) => (
  <button onClick={onClick} className={`flex flex-col items-center ${active ? 'text-blue-500 scale-110' : 'text-gray-400 opacity-70'} transition-all`}>
    <span className="text-xl">{icon}</span>
    <span className="text-[10px] font-bold mt-1">{label}</span>
  </button>
);

export default App;