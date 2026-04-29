import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import { Dumbbell, BookText, Utensils, Settings as SettingsIcon, ScanLine, RotateCcw, Upload } from "lucide-react";
import ExerciseAnalyzer from "./features/exercise/ExerciseAnalyzer";
import BlogPage from "./pages/BlogPage";
import FoodCalculator from "./pages/FoodCalculator";
import Settings from "./pages/Settings";
import squatImg from "./assets/squat.jpg";
import FeedbackDetail from "./pages/FeedbackDetail";

const themeStyles = {
  dark: {
    bg: "bg-[#0a0a0c]", text: "text-slate-200", subText: "text-slate-500",
    header: "bg-[#0a0a0c]/80", border: "border-white/5", accent: "text-blue-500",
    nav: "bg-[#0a0a0c]", card: "bg-[#16161a]", navActive: "text-blue-500", navInactive: "text-slate-600"
  },
  white: {
    bg: "bg-slate-50", text: "text-slate-900", subText: "text-slate-500",
    header: "bg-white/80", border: "border-slate-200", accent: "text-blue-600",
    nav: "bg-white", card: "bg-white", navActive: "text-blue-600", navInactive: "text-slate-400"
  }
};

const CAMERA_GUIDE = {
  "SQUAT": "측면에서 촬영하세요. 무릎·허리 라인이 한눈에 보이게 옆에서 찍어야 무릎 안쪽 꺾임과 척추 각도를 판정할 수 있습니다.",
  "BENCH": "정면에서 촬영하세요. 카메라를 발 아래쪽에 두고 바가 정면으로 보이도록 배치하면 그립 너비와 허리 아치를 판정하기 좋습니다.",
  "DEAD": "측면에서 촬영하세요. 바·허리·무릎이 한 라인에 들어오도록 옆면을 잡으면 척추 중립 여부를 판정하기 좋습니다.",
};

const App = () => {
  const [theme, setTheme] = useState("dark");
  const [currentTab, setCurrentTab] = useState("exercise");
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [analysisResult, setAnalysisResult] = useState({ counter: 0, angle: 0, exercise_class: 'ready' });
  const [finalResult, setFinalResult] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const analyzerRef = useRef(null);

  const s = themeStyles[theme];

  const handleResultUpdate = (data) => {
    setAnalysisResult(data);
    // data 안에 { feedback_points: [{x: 100, y: 200}, ...] } 형태의 좌표가 넘어온다고 가정합니다.
    if (data.capture_url) {
      setFinalResult(data);
    }
  };

  const handleReset = () => {
    setShowDetail(false);
    setSelectedExercise(null);
    setFinalResult(null);
    setAnalysisResult({ counter: 0, angle: 0, exercise_class: 'ready' });
    resetServerCounter();
  };

  const handleSave = () => alert("로그에 저장되었습니다!");

  const NavButton = ({ icon, label, active, onClick }) => (
    <button onClick={onClick} className="flex flex-col items-center justify-center flex-1 transition-all">
      <div className={`${active ? s.navActive : s.navInactive}`}>{icon}</div>
      <span className={`text-[9px] font-black uppercase mt-1 ${active ? s.navActive : s.navInactive}`}>{label}</span>
    </button>
  );

  const resetServerCounter = async () => {
    try {
      const host = window.location.hostname;
      await axios.post(`http://${host}:8000/api/v1/exercise/reset`);
    } catch (err) { console.error("서버 리셋 실패:", err); }
  };

  const speak = (text) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const speech = new SpeechSynthesisUtterance(text);
    speech.lang = "ko-KR";
    window.speechSynthesis.speak(speech);
  };

  useEffect(() => {
    let message = "";
    if (analysisResult.angle > 150 && analysisResult.exercise_class !== 'down') message = "아래로";
    else if (analysisResult.angle > 110 && analysisResult.exercise_class === 'down') message = "조금 더";
    else if (analysisResult.angle <= 110) message = "위로";
    else if (analysisResult.exercise_class === 'up') message = "완벽합니다";
    if (message) speak(message);
  }, [analysisResult.exercise_class, analysisResult.angle]);

  return (
    <div className={`fixed inset-0 ${s.bg} ${s.text} flex flex-col overflow-hidden`}>
      <header className={`h-16 flex items-center px-6 border-b ${s.border} ${s.header} backdrop-blur-md z-50 shadow-sm`}>
        <h1 className={`text-xl font-black tracking-tighter ${s.accent} italic uppercase`}>
          FIT-EATING {selectedExercise && <span className={`${s.subText} ml-3 font-medium opacity-50 text-sm`}>| {selectedExercise}</span>}
        </h1>
      </header>

      <main className="flex-1 relative overflow-hidden flex justify-center">
        {currentTab === "exercise" ? (
          <div className="w-full h-full relative">
            {showDetail ? (
              <div className="absolute inset-0 z-[60] h-full overflow-y-auto p-8 bg-inherit">
                <div className="max-w-6xl mx-auto">
                  <FeedbackDetail result={finalResult} exerciseName={selectedExercise} theme={theme} onReset={handleReset} onSaveToBlog={handleSave} />
                </div>
              </div>
            ) : (
              <div className="h-full w-full">
                {!selectedExercise ? (
                  /* 1. 운동 선택 그리드 (반응형) */
                  <div className="p-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 relative z-10 overflow-y-auto h-full content-start">
                    {["SQUAT", "DEAD", "BENCH"].map((ex) => (
                      <div key={ex} onClick={() => setSelectedExercise(ex)} className={`relative aspect-square ${s.card} border ${s.border} rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:scale-[1.02] transition-all shadow-lg group overflow-hidden`}>
                        {ex === "SQUAT" && <img src={squatImg} alt="squat" className="absolute inset-0 w-full h-full object-cover opacity-20" />}
                        <div className="relative z-10 flex flex-col items-center">
                          <ScanLine size={40} className={`${s.accent} mb-3`} />
                          <span className="text-sm font-black uppercase tracking-widest">{ex === "DEAD" ? "Deadlift" : ex === "BENCH" ? "Bench Press" : "Squat"}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* 2. 운동 분석 모드 (영상 + 빨간 원) */
                  <div className="absolute inset-0 bg-black flex items-center justify-center">
                    <div className="relative w-full h-full flex items-center justify-center">
                      <ExerciseAnalyzer ref={analyzerRef} exercise={selectedExercise} onResultUpdate={handleResultUpdate} onAnalysisComplete={() => setShowDetail(true)} />
                      
                      {/* 실시간 UI 레이어 */}
                      <div className="absolute inset-0 z-20 pointer-events-none p-10">
                        <div className="max-w-7xl mx-auto h-full relative">
                          <div className="flex justify-between pointer-events-none">
                            <button onClick={handleReset} className="p-3 bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 text-white pointer-events-auto active:scale-90"><RotateCcw size={24} /></button>
                            <label className="bg-blue-600 px-5 py-2 rounded-2xl text-xs font-bold text-white pointer-events-auto cursor-pointer active:scale-95 shadow-lg">
                              <Upload size={16} className="inline mr-2" /> UPLOAD
                              <input type="file" className="hidden" onChange={(e) => analyzerRef.current.handleFileUpload(e)} />
                            </label>
                          </div>

                          <div className="absolute inset-0 flex flex-col justify-center">
                            <div className="flex justify-between items-center px-4">
                              <div className="text-left">
                                <p className="text-xs font-black text-blue-400 uppercase tracking-widest mb-2">Count</p>
                                <span className="text-9xl font-black text-white italic leading-none drop-shadow-2xl">{String(analysisResult.counter || 0).padStart(2, '0')}</span>
                              </div>
                              <div className="text-right">
                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Angle</p>
                                <span className="text-7xl font-black text-white leading-none drop-shadow-2xl">{Math.round(analysisResult.angle)}°</span>
                              </div>
                            </div>
                          </div>

                          <div className="absolute bottom-10 left-0 right-0 flex justify-center">
                            <div className="bg-black/60 backdrop-blur-xl px-10 py-4 rounded-full border border-blue-500/30">
                              <p className="text-2xl font-bold text-white text-center">
                                {analysisResult.angle > 150 ? "내려가세요!" : analysisResult.angle > 110 ? "조금 더!" : "좋습니다!"}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="h-full overflow-y-auto p-8 w-full max-w-6xl">
            {currentTab === "blog" && <BlogPage theme={theme} />}
            {currentTab === "food" && <FoodCalculator theme={theme} />}
            {currentTab === "settings" && <Settings theme={theme} setTheme={setTheme} />}
          </div>
        )}
      </main>

      <nav className={`h-20 ${s.nav} border-t ${s.border} flex items-center justify-around px-4 z-[100] shadow-lg`}>
        <NavButton icon={<BookText size={22} />} label="Blog" active={currentTab === "blog"} onClick={() => setCurrentTab("blog")} />
        <NavButton icon={<Dumbbell size={22} />} label="Workout" active={currentTab === "exercise"} onClick={() => setCurrentTab("exercise")} />
        <NavButton icon={<Utensils size={22} />} label="Diet" active={currentTab === "food"} onClick={() => setCurrentTab("food")} />
        <NavButton icon={<SettingsIcon size={22} />} label="Set" active={currentTab === "settings"} onClick={() => setCurrentTab("settings")} />
      </nav>
    </div>
  );
};

export default App;