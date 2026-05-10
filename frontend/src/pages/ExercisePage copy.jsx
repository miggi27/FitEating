import React, { useState, useRef, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import ExerciseAnalyzer from "../features/exercise/ExerciseAnalyzer";
import FeedbackDetail from "./FeedbackDetail";
import { ScanLine, Upload, Camera } from "lucide-react";
import squatImg from "../assets/squat.jpg";
import deadliftImg from "../assets/deadlift.jpg";
import benchpressImg from "../assets/benchpress.jpg";
import { API_BASE_URL } from "../api/config";

const CAMERA_GUIDE = {
  "SQUAT": "측면에서 촬영하세요. 무릎·허리 라인이 한눈에 보이게 옆에서 찍어야 무릎 안쪽 꺾임과 척추 각도를 판정할 수 있습니다.",
  "DEAD": "측면에서 촬영하세요. 바·허리·무릎이 한 라인에 들어오도록 옆면을 잡으면 척추 중립 여부를 판정하기 좋습니다.",
  "BENCH": "정면에서 촬영하세요. 카메라를 발 아래쪽에 두고 바가 정면으로 보이도록 배치하면 그립 너비와 허리 아치를 판정하기 좋습니다.",
};

const ExercisePage = ({ theme }) => {
  // 🟢 1. 이제 상태(useState) 대신 URL 파라미터를 사용합니다.
  const { exId, mode } = useParams(); // /exercise/:exId/:mode (예: /exercise/squat/detail)
  const navigate = useNavigate();
  const location = useLocation(); // 짐 가방 확인용

  // URL 값을 대문자로 변환하여 기존 로직에 대응
  const selectedExercise = exId?.toUpperCase(); 
  const showDetail = mode === "detail";

  const [isStarted, setIsStarted] = useState(false);
  const [analysisResult, setAnalysisResult] = useState({ counter: 0, angle: 0 });
  // 🟢 짐 가방에 데이터가 있으면 그걸 쓰고, 없으면 null (방어 코드)
  const [finalResult, setFinalResult] = useState(location.state?.result || null);
  const analyzerRef = useRef(null);

  const isDark = theme === "dark";

  useEffect(() => {
    // 1. 주소창의 짐 가방에 결과가 있고, 현재 finalResult가 비어있다면?
    if (location.state?.result && !finalResult) {
      console.log("짐 가방에서 데이터를 찾았습니다!", location.state.result);
      setFinalResult(location.state.result);
    }
  }, [location.state, finalResult]); // 짐 가방이 바뀌거나 결과값이 바뀔 때마다 체크

  // 🟢 2. 모든 이동은 navigate로 처리 (네비바가 이걸 보고 경로를 그립니다)
  const handleSelect = (ex) => {
    navigate(`/exercise/${ex.toLowerCase()}`);
  };

  const handleComplete = (data) => {
    // setFinalResult(data);
    navigate(`/exercise/${exId}/detail`, { state: { result: data } });
  };

  const handleReset = () => {
    setIsStarted(false);
    setFinalResult(null);
    setAnalysisResult({ counter: 0, angle: 0 });
    navigate("/exercise"); // 운동 선택 화면으로
  };

  const handleBackToGuide = () => {
    setIsStarted(false);
    navigate(`/exercise/${exId}`); // 상세에서 가이드로 back
  };

  return (
    <div className={`w-full h-full relative ${isDark ? "bg-[#0f0f12]" : "bg-slate-50"} overflow-hidden flex flex-col`}>
      
      <div className="flex-1 relative">
        {!selectedExercise ? (
          /* [선택 창] */
          <div className="absolute inset-0 overflow-y-auto"> 
            <div className="min-h-full flex flex-col items-center justify-start md:justify-center p-6 py-12">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-6xl">
                {["SQUAT", "DEAD", "BENCH"].map((ex) => (
                  <div 
                    key={ex} 
                    onClick={() => handleSelect(ex)} // 🟢 handleSelect 호출
                    className="relative aspect-square border border-white/10 rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:scale-[1.05] transition-all shadow-lg overflow-hidden group bg-slate-900"
                  >
                    {ex === "SQUAT" && <img src={squatImg} alt="squat" className="absolute inset-0 w-full h-full object-cover opacity-30 group-hover:opacity-80 transition-opacity" />}
                    {ex === "DEAD" && <img src={deadliftImg} alt="deadlift" className="absolute inset-0 w-full h-full object-cover opacity-30 group-hover:opacity-80 transition-opacity" />}
                    {ex === "BENCH" && <img src={benchpressImg} alt="benchpress" className="absolute inset-0 w-full h-full object-cover opacity-30 group-hover:opacity-80 transition-opacity" />}
                    <div className="relative z-10 flex flex-col items-center">
                      <ScanLine size={48} className="text-blue-500 mb-4" />
                      <span className="text-2xl font-black text-white uppercase">{ex}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : showDetail ? (
          /* [상세 페이지] */
          <div className="absolute inset-0 overflow-y-auto p-6 pb-24">
            <div className="max-w-6xl mx-auto">
              <FeedbackDetail result={finalResult} exerciseName={selectedExercise} theme={theme} onReset={handleReset} />
            </div>
          </div>
        ) : (
          /* [분석 화면] */
          <div className="absolute inset-0 bg-black">
            <ExerciseAnalyzer 
              ref={analyzerRef} 
              exercise={selectedExercise} 
              onResultUpdate={(data) => {
                setAnalysisResult(data);
                if (data && data.capture_url) setFinalResult(data);
              }}
              onAnalysisComplete={handleComplete} // 🟢 handleComplete 호출
              isStarted={isStarted}
            />
            
            {/* 가이드 오버레이 */}
            {!isStarted && (
              <div className="absolute inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 text-center">
                <div className="max-w-xl w-full">
                  <h2 className="text-white text-3xl font-black mb-6 italic">{selectedExercise} 가이드</h2>
                  <div className="bg-white/10 p-8 rounded-[30px] border border-white/20 mb-8">
                    <p className="text-white/80 text-lg leading-relaxed">{CAMERA_GUIDE[selectedExercise]}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => setIsStarted(true)} className="py-5 bg-blue-600 text-white rounded-2xl font-black flex flex-col items-center gap-2 hover:bg-blue-500 transition-all shadow-xl">
                      <Camera size={24} /> 실시간 카메라
                    </button>
                    <label className="py-5 bg-white/10 text-white rounded-2xl font-black flex flex-col items-center gap-2 hover:bg-white/20 transition-all cursor-pointer border border-white/20">
                      <Upload size={24} /> 영상 업로드
                      <input type="file" className="hidden" onChange={(e) => { analyzerRef.current.handleFileUpload(e); setIsStarted(true); }} />
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* 실시간 UI (카운트/각도) */}
            {isStarted && (
              <div className="absolute inset-0 z-20 pointer-events-none p-10 flex flex-col justify-end">
                <div className="flex justify-between items-end mb-4">
                  <div className="flex flex-col">
                    <span className="text-blue-400 font-bold text-sm tracking-widest uppercase mb-2">Count</span>
                    <span className="text-[12rem] font-black text-white italic leading-[0.8] drop-shadow-2xl">
                      {String(analysisResult.counter || 0).padStart(2, '0')}
                    </span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-slate-400 font-bold text-sm tracking-widest uppercase mb-2">Angle</span>
                    <span className="text-7xl font-black text-white drop-shadow-lg">{Math.round(analysisResult.angle)}°</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ExercisePage;