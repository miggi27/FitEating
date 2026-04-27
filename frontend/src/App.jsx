import React, { useState, useRef } from "react";
import axios from "axios";
import { Dumbbell, BookText, Utensils, Settings as SettingsIcon, ScanLine, RotateCcw, Upload } from "lucide-react";
import ExerciseAnalyzer from "./features/exercise/ExerciseAnalyzer";
import BlogPage from "./pages/BlogPage";
import FoodCalculator from "./pages/FoodCalculator";
import Settings from "./pages/Settings";
import squatImg from "./assets/squat.jpg";

const App = () => {
  const [currentTab, setCurrentTab] = useState("exercise");
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [analysisResult, setAnalysisResult] = useState({ counter: 0, angle: 0, exercise_class: 'ready' });
  const analyzerRef = useRef(null);

  // [중요] 서버 카운트 초기화 함수
  const resetServerCounter = async () => {
    try {
      const host = window.location.hostname;
      await axios.post(`http://${host}:8000/api/v1/exercise/reset`);
      console.log("서버 카운트 초기화 완료");
    } catch (err) {
      console.error("서버 리셋 실패:", err);
    }
  };

  const NavButton = ({ icon, label, active, onClick }) => (
    <button onClick={onClick} className="flex flex-col items-center justify-center flex-1 transition-all">
      <div className={`${active ? "text-blue-500" : "text-slate-800"} transition-all duration-300`}>{icon}</div>
      <span className={`text-[9px] font-black uppercase tracking-tighter mt-1 ${active ? "text-blue-500" : "text-slate-900"}`}>{label}</span>
    </button>
  );

  // 피드백 문구가 바뀔 때마다 읽어주는 함수
  const speak = (text) => {
    // 이전 음성 취소 (겹치지 않게)
    window.speechSynthesis.cancel();
    
    const speech = new SpeechSynthesisUtterance(text);
    speech.lang = "ko-KR"; // 한국어 설정
    speech.rate = 1.1;    // 속도 (살짝 빠르게)
    speech.pitch = 1.0;   // 음높이
    window.speechSynthesis.speak(speech);
  };

  // 피드백 상태가 바뀔 때마다 실행 (useEffect 활용)
  React.useEffect(() => {
    let message = "";
    if (analysisResult.angle > 150 && analysisResult.exercise_class !== 'down') message = "아래로";
    else if (analysisResult.angle > 110 && analysisResult.exercise_class === 'down') message = "조금 더";
    else if (analysisResult.angle <= 110) message = "위로";
    else if (analysisResult.exercise_class === 'up') message = "완벽합니다";

    if (message) speak(message);
  }, [analysisResult.exercise_class, (analysisResult.angle <= 110)]); 
  // 상태나 특정 각도 진입 시에만 읽도록 설정

  return (
    <div className="fixed inset-0 bg-[#0a0a0c] text-slate-200 flex flex-col overflow-hidden">
      <header className="h-16 flex items-center px-6 border-b border-white/5 bg-[#0a0a0c] z-50 shrink-0">
        <h1 className="text-xl font-black tracking-tighter text-blue-500 italic uppercase">
          FIT-EATING {selectedExercise && <span className="text-slate-600 ml-3 font-medium opacity-50">| {selectedExercise}</span>}
        </h1>
      </header>

      <main className="flex-1 relative overflow-hidden bg-[#050505]">
        {currentTab === "exercise" ? (
          <div className="h-full w-full relative">
            {!selectedExercise ? (
              <div className="p-6 grid grid-cols-3 gap-4">
                {/* 운동 선택 그리드 내부의 스쿼트 버튼 */}
                <div 
                  onClick={() => setSelectedExercise("SQUAT")}
                  className="relative aspect-square bg-[#16161a] border border-white/10 rounded-[2.5rem] flex flex-col items-center justify-center cursor-pointer hover:border-blue-500/50 transition-all shadow-2xl group overflow-hidden"
                >
                  {/* [배경 이미지 추가] */}
                  {/* <img 
                    src="/images/squat.jpg" // public/images/squat.jpg에 저장했을 때
                    alt="squat"
                    className="absolute inset-0 w-full h-full object-cover opacity-30 group-hover:opacity-50 transition-opacity" 
                  /> */}
                  <img 
                    src={squatImg} 
                    alt="squat"
                    className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-90 transition-opacity" 
                  />

                  {/* [기존 아이콘과 텍스트] 이미지 위에 보이도록 z-index(relative) 적용 */}
                  <div className="relative z-10 flex flex-col items-center">
                    <ScanLine size={32} className="text-blue-500 mb-2 group-hover:scale-110 transition-transform" />
                    <span className="text-[11px] font-black text-white tracking-tighter uppercase">Squat</span>
                  </div>
                </div>
                <div className="aspect-square bg-[#16161a]/30 border border-white/5 rounded-[2.5rem] flex items-center justify-center opacity-20"><Dumbbell /></div>
                <div className="aspect-square bg-[#16161a]/30 border border-white/5 rounded-[2.5rem] flex items-center justify-center opacity-20"><Dumbbell /></div>
              </div>
            ) : (
              <div className="absolute inset-0 w-full h-full">
                <ExerciseAnalyzer 
                  ref={analyzerRef} 
                  exercise={selectedExercise}
                  onResultUpdate={(data) => setAnalysisResult(data)} 
                />

                <div className="relative z-10 h-full w-full flex flex-col p-4 pointer-events-none">
                  <div className="flex justify-between items-start pointer-events-auto opacity-70">
                    <button 
                      onClick={() => { 
                        setSelectedExercise(null); 
                        setAnalysisResult({counter:0, angle:0, exercise_class:'ready'});
                        resetServerCounter(); // 여기서 비동기 함수 호출
                      }}
                      className="p-2 bg-black/40 backdrop-blur-md rounded-xl border border-white/10 text-white"
                    >
                      <RotateCcw size={18} />
                    </button>
                    
                    <label className="bg-blue-600/40 backdrop-blur-md px-3 py-1.5 rounded-xl text-[10px] font-bold border border-white/10 cursor-pointer text-white">
                      <Upload size={12} className="inline mr-1" /> UPLOAD
                      <input type="file" className="hidden" accept="video/*" onChange={(e) => analyzerRef.current.handleFileUpload(e)} />
                    </label>
                  </div>

                  <div className="flex-1 flex justify-between items-center px-4 opacity-80">
                    <div className="text-left drop-shadow-lg">
                      <p className="text-[8px] font-black text-blue-500 uppercase tracking-widest mb-[-4px]">Count</p>
                      <span className="text-[14vw] sm:text-[60px] font-black text-white italic leading-none">
                        {String(analysisResult.counter).padStart(2, '0')}
                      </span>
                    </div>
                    <div className="text-right drop-shadow-lg">
                      <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-0">Angle</p>
                      <span className="text-[7vw] sm:text-[28px] font-black text-white leading-none">
                        {Math.round(analysisResult.angle)}°
                      </span>
                    </div>
                  </div>

                  {/* [자세 교정 피드백] 핵심 로직 반영 */}
                  <div className="mt-auto pointer-events-auto w-full flex justify-center pb-6 opacity-80">
                    <div className="bg-black/40 backdrop-blur-md px-5 py-2 rounded-full border border-blue-500/30">
                      <p className="text-[11px] font-bold text-white tracking-tight">
                        {analysisResult.angle > 150 && analysisResult.exercise_class !== 'down' && "내려가기 시작하세요!"}
                        {analysisResult.angle > 110 && analysisResult.exercise_class === 'down' && "조금 더 깊게 앉으세요!"}
                        {analysisResult.angle <= 110 && "좋습니다! 이제 일어나세요."}
                        {analysisResult.exercise_class === 'up' && "완벽한 스쿼트입니다!"}
                        {analysisResult.exercise_class === 'ready' && analysisResult.angle <= 150 && "자세를 잡는 중..."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="h-full p-8 overflow-y-auto">
            {currentTab === "blog" && <BlogPage />}
            {currentTab === "food" && <FoodCalculator />}
            {currentTab === "settings" && <Settings />}
          </div>
        )}
      </main>

      <nav className="h-20 bg-[#0a0a0c] border-t border-white/5 flex items-center justify-around px-4 z-[100] shrink-0">
        <NavButton icon={<BookText size={22} />} label="Blog" active={currentTab === "blog"} onClick={() => {setCurrentTab("blog"); setSelectedExercise(null);}} />
        <NavButton icon={<Dumbbell size={22} />} label="Workout" active={currentTab === "exercise"} onClick={() => setCurrentTab("exercise")} />
        <NavButton icon={<Utensils size={22} />} label="Diet" active={currentTab === "food"} onClick={() => {setCurrentTab("food"); setSelectedExercise(null);}} />
        <NavButton icon={<SettingsIcon size={22} />} label="Set" active={currentTab === "settings"} onClick={() => {setCurrentTab("settings"); setSelectedExercise(null);}} />
      </nav>
    </div>
  );
};

export default App;