import React, { useRef, useEffect, useImperativeHandle, forwardRef, useState } from 'react';
import axios from 'axios';

const Pose = window.Pose;

const ExerciseAnalyzer = forwardRef(({ exercise, onResultUpdate, onAnalysisComplete }, ref) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const poseInstance = useRef(null);
  const [guideMessage, setGuideMessage] = useState("");
  const latestData = useRef(null);

  useImperativeHandle(ref, () => ({
    handleFileUpload: (e) => {
      const file = e.target.files[0];
      if (!file || !videoRef.current) return;
      videoRef.current.src = URL.createObjectURL(file);
      videoRef.current.play();
    }
  }));

  useEffect(() => {
    if (!Pose) return;
    poseInstance.current = new Pose({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
    });
    poseInstance.current.setOptions({ modelComplexity: 1, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
    poseInstance.current.onResults(onResults);
  }, []);

  async function onResults(results) {
    if (!canvasRef.current || !videoRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;

    // 영상 그리기
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

    if (results.poseLandmarks) {
      const landmarks = results.poseLandmarks.flatMap((l) => [l.x, l.y, l.z, l.visibility]);
      try {
        const res = await axios.post(`http://${window.location.hostname}:8000/api/v1/exercise/analyze`, {
          landmarks, exercise_type: exercise
        });
        
        const data = res.data;
        latestData.current = data; // 마지막 데이터를 저장
        if (data.guide) setGuideMessage(data.guide);

        // 실시간 빨간 원
        if (data.error_key === "caved_in_knees") {
          const knee = results.poseLandmarks[26];
          drawError(ctx, knee.x * canvas.width, knee.y * canvas.height, "무릎 주의");
          // 상세페이지용 캡처 저장
          data.capture_url = canvas.toDataURL("image/jpeg", 0.5);
        }

        if (onResultUpdate) onResultUpdate(data);
      } catch (err) { console.error(err); }
    }
  }

  function drawError(ctx, x, y, msg) {
    ctx.beginPath(); ctx.arc(x, y, 45, 0, 2 * Math.PI);
    ctx.fillStyle = "rgba(255, 0, 0, 0.5)"; ctx.fill();
    ctx.strokeStyle = "white"; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = "white"; ctx.font = "bold 20px sans-serif";
    ctx.fillText(msg, x + 55, y);
  }

  const onFrame = async () => {
    if (videoRef.current && !videoRef.current.paused && !videoRef.current.ended) {
      await poseInstance.current.send({ image: videoRef.current });
      requestAnimationFrame(onFrame);
    }
  };

  const handleVideoEnded = () => {
    if (onAnalysisComplete) onAnalysisComplete(latestData.current);
  };

  return (
    <div className="relative w-full h-full bg-black flex flex-col items-center justify-center overflow-hidden">
      {guideMessage && (
        <div className="absolute top-6 z-50 bg-blue-600/90 text-white px-8 py-3 rounded-2xl font-bold shadow-lg">
          {guideMessage}
        </div>
      )}
      <canvas ref={canvasRef} className="w-full h-full object-contain" />
      <video ref={videoRef} onPlay={onFrame} onEnded={handleVideoEnded} className="hidden" muted playsInline />
    </div>
  );
});

export default ExerciseAnalyzer;