import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, ChevronRight, Info, Moon, Sun, Palette } from 'lucide-react';


const ExerciseSelectPage = ({ theme, setTheme }) => {
  const navigate = useNavigate();

  const handleSelect = (exId) => {
    // 💡 여기서 주소를 정확히 쏴줘야 Navbar가 읽습니다.
    navigate(`/exercise/${exId}`);
  };
  
  // 1. 부위별 데이터 (Streamlit_Upload4 로직 기반)
  const categories = {
    "가슴": ["벤치프레스", "인클라인 벤치프레스", "머신플라이"],
    "등": ["바벨 로우", "데드리프트", "랫풀다운"],
    "하체": ["스쿼트", "런지", "스모 데드리프트"],
    "어깨": ["오버헤드 프레스", "사이드 레터럴 레이즈", "프론트 레이즈"],
    "복근": ["플랭크", "크런치", "레그 레이즈"],
  };

  // 2. 가이드 데이터 (기존의 상세한 피드백 문구 유지)
  const exerciseDetails = {
    "스쿼트": { guide: "측면에서 촬영하세요. 무릎·허리 라인이 한눈에 보이게 옆에서 찍어야 무릎 안쪽 꺾임과 척추 각도를 판정할 수 있습니다.", img: "/assets/guides/squat.jpg" },
    "벤치프레스": { guide: "정면에서 촬영하세요. 카메라를 발 아래쪽에 두고 바가 정면으로 보이도록 배치하면 그립 너비와 허리 아치를 판정하기 좋습니다.", img: "/assets/guides/bench.jpg" },
    "바벨 로우": { guide: "측면에서 촬영하세요. 어깨-골반-무릎이 한 라인에 보여야 척추 중립과 힙 힌지 각도를 판정할 수 있습니다.", img: "/assets/guides/row.jpg" },
    // ... 나머지 18종 운동 상세 데이터
  };

  const [selectedCat, setSelectedCat] = useState("가슴");
  const [selectedEx, setSelectedEx] = useState(categories["가슴"][0]);

  // 테마에 따른 배경색 설정 (DietPage와 동일한 폭 및 색감)
  const isDark = theme === 'dark' || theme === 'design';
  const bgClass = isDark ? "bg-[#0c0c0e]" : "bg-slate-50";
  const cardClass = isDark ? "bg-[#16161a] border-white/5" : "bg-white border-slate-200 shadow-sm";
  const textClass = isDark ? "text-white" : "text-slate-900";

  const getGuideImage = (exerciseName) => {
    try {
      // 💡 assets 폴더 내의 이미지를 동적으로 가져옴
      // return require(`../assets/guide_images/${exerciseName}.png`);
      // 만약 Vite를 사용 중이라면 아래 방식을 권장합니다:
      return new URL(`../assets/guide_images/${exerciseName}.png`, import.meta.url).href;
    } catch (err) {
      return "/assets/default_guide.png"; // 이미지 없을 때 기본값
    }
  };

  return (
    <div className={`fixed inset-0 ${bgClass} ${textClass} overflow-y-scroll`} style={{ scrollbarGutter: 'stable' }}>
      <div className="w-full max-w-6xl mx-auto min-h-screen flex flex-col">
        
        {/* 상단 헤더: DietPage와 완벽 일치 */}
        <header className={`w-full flex justify-between items-center p-6 border-b ${isDark ? 'border-white/5 bg-[#0c0c0e]/80' : 'border-slate-200 bg-white/80'} backdrop-blur-md z-[100] sticky top-0`}>
          <div className="flex gap-2">
            <button onClick={() => setTheme('dark')} className="p-1"><Moon size={16} className={theme === 'dark' ? 'text-blue-500' : 'text-slate-400'} /></button>
            <button onClick={() => setTheme('light')} className="p-1"><Sun size={16} className={theme === 'light' ? 'text-blue-500' : 'text-slate-400'} /></button>
            <button onClick={() => setTheme('design')} className="p-1"><Palette size={16} className={theme === 'design' ? 'text-blue-500' : 'text-slate-400'} /></button>
          </div>
          <h2 className="text-[10px] font-black text-blue-500 italic uppercase tracking-[0.3em]">AI Exercise Selection</h2>
          <div className="w-6"></div>
        </header>

        <main className="flex-1 p-6 lg:p-10 space-y-10">
          
          {/* --- [부위 선택 섹션] --- */}
          <section className={`${cardClass} rounded-[3rem] p-10 relative overflow-hidden`}>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-6">Select Target Body Part</p>
            <div className="flex flex-wrap gap-3">
              {Object.keys(categories).map(cat => (
                <button
                  key={cat}
                  onClick={() => { setSelectedCat(cat); setSelectedEx(categories[cat][0]); }}
                  className={`px-8 py-3 rounded-full font-black text-sm transition-all ${selectedCat === cat ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'bg-white/5 text-slate-500 hover:bg-white/10'}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </section>

          {/* --- [세부 운동 선택 & 가이드 2컬럼] --- */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* 좌측: 세부 운동 리스트 */}
            <div className="space-y-4">
              <div className="flex items-center gap-4 mb-6">
                <span className="text-[10px] font-black text-slate-700 uppercase tracking-[0.3em]">Exercise List</span>
                <div className="h-[1px] flex-1 bg-white/5"></div>
              </div>
              <div className="grid gap-4">
                {categories[selectedCat].map(ex => (
                  <button
                    key={ex}
                    onClick={() => setSelectedEx(ex)}
                    className={`w-full p-6 rounded-[2rem] border transition-all flex justify-between items-center ${selectedEx === ex ? 'border-blue-500 bg-blue-500/5' : 'border-white/5 bg-[#16161a] hover:border-white/20'}`}
                  >
                    <span className={`text-lg font-black ${selectedEx === ex ? 'text-blue-500' : 'text-white'}`}>{ex}</span>
                    <ChevronRight size={20} className={selectedEx === ex ? 'text-blue-500' : 'text-slate-700'} />
                  </button>
                ))}
              </div>
            </div>

            {/* 우측: 상세 가이드 & 사진 */}
            <div className="space-y-4">
              <div className="flex items-center gap-4 mb-6">
                <span className="text-[10px] font-black text-slate-700 uppercase tracking-[0.3em]">Posture Guide</span>
                <div className="h-[1px] flex-1 bg-white/5"></div>
              </div>
              <div className={`${cardClass} rounded-[2.5rem] p-8 space-y-6`}>
                {/* 가이드 이미지 영역 */}
                <div className="aspect-video bg-black rounded-[1.5rem] overflow-hidden border border-white/10 relative group">
                  <img src={getGuideImage(selectedEx)} alt={selectedEx} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                  <div className="absolute bottom-6 left-6 right-6">
                    <p className="text-white font-black text-xl mb-1">{selectedEx} 권장 자세</p>
                    <p className="text-blue-400 text-xs font-bold uppercase tracking-widest">Recommended Setup</p>
                  </div>
                </div>

                {/* 가이드 텍스트 (Streamlit 상세 로직 보존) */}
                <div className="flex gap-4 p-5 rounded-2xl bg-white/5 border border-white/5">
                  <Info className="text-blue-500 shrink-0" size={20} />
                  <p className="text-sm leading-relaxed text-slate-400 font-medium">
                    {exerciseDetails[selectedEx]?.guide || "상세 가이드를 준비 중입니다."}
                  </p>
                </div>

                {/* 분석 시작 버튼 */}
                <button 
                  // onClick={() => navigate(`/exercise/analysis?type=${selectedEx}`)}
                  onClick={() => navigate(`/exercise/${selectedEx}`)}
                  className="w-full py-6 rounded-2xl bg-blue-600 text-white hover:bg-blue-500 shadow-xl shadow-blue-600/20 flex items-center justify-center gap-3 font-black uppercase text-sm tracking-[0.2em] transition-all hover:scale-[1.02] active:scale-95"
                >
                  <Play size={20} fill="currentColor" />
                  Start AI Analysis
                </button>
              </div>
            </div>
          </section>
        </main>

        <footer className="py-20 text-center">
          <p className="text-[10px] font-black text-slate-800 uppercase tracking-[0.5em]">Powered by 2800+ Lines of Logic</p>
        </footer>
      </div>
    </div>
  );
};

export default ExerciseSelectPage;