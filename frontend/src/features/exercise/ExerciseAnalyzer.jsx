import React, { useRef, useEffect, useImperativeHandle, forwardRef, useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../../api/config';

const Pose = window.Pose;

const ExerciseAnalyzer = forwardRef(({ exercise, onResultUpdate, onAnalysisComplete }, ref) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const poseInstance = useRef(null);
  const latestData = useRef(null);
  const workoutImage = useRef(null); // 운동 확인용 사진 저장소
  
  // 🔥 실시간 피드백을 프레임마다 유지하기 위한 Ref
  const feedbackRef = useRef(null);

  useImperativeHandle(ref, () => ({
    handleFileUpload: (e) => {
      const file = e.target.files[0];
      if (!file || !videoRef.current) return;
      videoRef.current.src = URL.createObjectURL(file);
      videoRef.current.onloadedmetadata = () => videoRef.current.play();
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
    
    // 캔버스 크기 맞춤 (영상이 꽉 차게 보이도록 설정)
    if (videoRef.current.videoWidth > 0 && canvas.width !== videoRef.current.videoWidth) {
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
    }

    // 1. 영상 그리기
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

    // 2. 🔥 실시간 피드백 덧칠하기 (이게 핵심: 서버 응답 전에도 이전 원을 계속 그림)
    if (feedbackRef.current) {
      feedbackRef.current.points.forEach(p => drawError(ctx, p.x * canvas.width, p.y * canvas.height, feedbackRef.current.msg));
    }

    if (results.poseLandmarks) {
      const landmarks = results.poseLandmarks.flatMap((l) => [l.x, l.y, l.z, l.visibility]);
      try {
        const res = await axios.post(`${API_BASE_URL}/exercise/analyze`, { landmarks, exercise_type: exercise });
        const data = res.data;

        // 🔥 추가: 서버에서 온 피드백 데이터를 Ref에 저장
        // 서버 응답 데이터 구조가 { feedback: { points: [...], msg: "..." } } 식이라고 가정
        // 🔥 백엔드의 'feedback_points'를 프론트엔드의 'feedbackRef'에 연결
        if (data.feedback_points && data.feedback_points.length > 0) {
          feedbackRef.current = {
            points: data.feedback_points,
            msg: data.overlay_message || "자세 주의!"
          };
        } else {
          feedbackRef.current = null; // 에러 없으면 지우기
        }

        if (!workoutImage.current && (data.counter > 0 || videoRef.current.currentTime > 2)) {
          workoutImage.current = canvas.toDataURL("image/jpeg", 0.4); // 용량 최소화 (0.4)
        }
        
        latestData.current = data; // 마지막 결과값 업데이트
        onResultUpdate(data);
        
        // 영상이 끝나면 이 'data'가 그대로 FeedbackDetail로 넘어감
        if (videoRef.current.ended) {
          onAnalysisComplete(data);
        }

        onResultUpdate(data);
      } catch (err) { console.error(err); }
    }
  }

  const handleFinalize = () => {
    if (latestData.current) {
      // 💡 마지막 결과 데이터에 '운동 확인용 사진'을 강제로 포함시켜 보냄
      const finalResult = {
        ...latestData.current,
        capture_url: workoutImage.current || latestData.current.capture_url
      };
      onAnalysisComplete(finalResult);
    }
  };

  function drawError(ctx, x, y, msg) {
    ctx.save();
    ctx.beginPath(); ctx.arc(x, y, 40, 0, 2 * Math.PI);
    ctx.fillStyle = "rgba(255, 0, 0, 0.4)"; ctx.fill();
    ctx.strokeStyle = "white"; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = "white"; ctx.font = "bold 20px sans-serif";
    ctx.textAlign = "center"; ctx.fillText(msg, x, y + 60);
    ctx.restore();
  }

  const onFrame = async () => {
    if (videoRef.current && !videoRef.current.paused && !videoRef.current.ended && videoRef.current.readyState >= 2) {
      await poseInstance.current.send({ image: videoRef.current });
      requestAnimationFrame(onFrame);
    }
  };

  return (
  <div className="w-full h-full flex items-center justify-center bg-black overflow-hidden">
    <canvas 
      ref={canvasRef} 
      // object-cover 대신 아래 스타일 적용
      className="h-full w-auto object-contain" 
      style={{ 
        maxHeight: '100%', 
        maxWidth: '100%',
        margin: '0 auto' // 가로 중앙 정렬
      }}
    />
    <video 
      ref={videoRef} 
      onPlay={onFrame} 
      onEnded={handleFinalize} 
      className="hidden" 
      muted 
      playsInline 
    />
  </div>
);
});

export default ExerciseAnalyzer;