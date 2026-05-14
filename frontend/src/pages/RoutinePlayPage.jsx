import React, { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ExerciseAnalyzer from "../features/exercise/ExerciseAnalyzer";
import FeedbackDetail from "./RoutineLogPage";
import { ChevronLeft, Upload, Activity } from "lucide-react";

const ExercisePage = ({ theme }) => {
  const { exId } = useParams();
  const navigate = useNavigate();
  
  // 상태 관리
  const [isStarted, setIsStarted] = useState(false);
  const [analysisResult, setAnalysisResult] = useState({ counter: 0, angle: 0 });
  const [finalData, setFinalData] = useState(null); 
  const analyzerRef = useRef(null);

  const isDark = theme === 'dark' || theme === 'design';

  // 💡 무한 로딩 해결 포인트: 데이터가 들어오면 즉시 결과창으로 전환
  const handleAnalysisComplete = (data) => {
    if (data) {
      console.log("분석 완료 데이터 수신:", data);
      setFinalData(data);
    }
  };

  return (
    <div className={`fixed inset-0 ${isDark ? "bg-[#0c0c0e]" : "bg-slate-50"} text-white flex flex-col`}>
      
      {/* 🟢 DietPage와 100% 일치하는 헤더 폭 (max-w-6xl) */}
      {/* <header className={`w-full max-w-6xl mx-auto flex justify-between items-center p-6 border-b ${isDark ? 'border-white/5 bg-[#0c0c0e]/80' : 'border-slate-200 bg-white/80'} backdrop-blur-md z-[100] sticky top-0`}>
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <ChevronLeft size={24} className={isDark ? "text-white" : "text-black"} />
        </button>
        <h2 className="text-[10px] font-black text-blue-500 italic uppercase tracking-[0.3em]">{exId} Analysis</h2>
        <div className="w-10"></div>
      </header> */}
      <header className={`w-full h-[50px] max-w-6xl mx-auto flex justify-between items-center px-6 border-b ${isDark ? 'border-white/5 bg-[#0c0c0e]' : 'border-slate-200 bg-white'} z-[100]`}>
        <button onClick={() => navigate(-1)} className="p-1 hover:bg-white/10 rounded-full transition-colors">
          <ChevronLeft size={20} className={isDark ? "text-white" : "text-black"} />
        </button>
        <h2 className="text-[10px] font-black text-blue-500 italic uppercase tracking-[0.3em]">{exId} Analysis</h2>
        <div className="w-8"></div>
      </header>

      {/* 🟢 메인 컨텐츠 영역: DietPage와 폭 일치 */}
      <main className="w-full max-w-6xl mx-auto relative overflow-hidden" style={{ height: 'calc(100vh - 150px)' }}>
        {!finalData ? (
          <div className="w-full h-full relative bg-black overflow-hidden">
            {/* 1. 분석기 컴포넌트 (ref로 파일 핸들링 연결) */}
            <ExerciseAnalyzer 
              ref={analyzerRef}
              exercise={exId}
              onResultUpdate={setAnalysisResult}
              onAnalysisComplete={handleAnalysisComplete}
            />

            {/* 2. 업로드 전 가이드 (스마트폰 가림 현상 해결) */}
            {!isStarted && (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                <div className="text-center px-6">
                  <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-blue-500/30">
                    <Upload size={32} className="text-blue-500" />
                  </div>
                  <h3 className="text-2xl font-black text-white mb-2">{exId} 분석 대기 중</h3>
                  <p className="text-slate-400 text-sm mb-8">영상을 업로드하면 분석이 즉시 시작됩니다.</p>
                  
                  <label className="inline-block px-10 py-5 bg-blue-600 text-white rounded-2xl font-black cursor-pointer hover:bg-blue-500 transition-all shadow-xl shadow-blue-600/20 active:scale-95">
                    영상 업로드하기
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="video/*" 
                      onChange={(e) => {
                        if (analyzerRef.current) {
                          analyzerRef.current.handleFileUpload(e);
                          setIsStarted(true);
                        }
                      }} 
                    />
                  </label>
                </div>
              </div>
            )}

            {/* 3. 실시간 분석 UI (영상 위 오버레이) */}
            {isStarted && (
              <div className="absolute bottom-8 left-8 right-8 z-40 pointer-events-none flex justify-between items-end">
                <div className="flex flex-col">
                  <span className="text-blue-500 text-[10px] font-black uppercase tracking-widest mb-2">Count</span>
                  <span className="text-5xl font-black text-white italic leading-none drop-shadow-2xl">
                    {String(analysisResult.counter || 0).padStart(2, '0')}
                  </span>
                </div>
                <div className="text-right pb-4">
                  <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Angle</span>
                  <span className="text-3xl font-black text-white drop-shadow-lg">{Math.round(analysisResult.angle)}°</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* 4. 분석 결과 표시 (무한 로딩 해결 포인트) */
          <div className="h-full overflow-y-auto px-6 py-10">
            <FeedbackDetail 
              result={finalData} 
              exerciseName={exId} 
              theme={theme}
              onReset={() => { setFinalData(null); setIsStarted(false); }}
            />
          </div>
        )}
      </main>
      <footer className="h-[100px] w-full bg-transparent flex-shrink-0" />
    </div>
  );
};

export default ExercisePage;