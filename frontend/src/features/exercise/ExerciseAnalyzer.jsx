import React, { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import axios from 'axios';

const Pose = window.Pose;

const ExerciseAnalyzer = forwardRef(({ exercise, onResultUpdate }, ref) => {
  const videoRef = useRef(null);
  const poseInstance = useRef(null);

  // App.jsx에서 호출할 수 있는 파일 업로드 함수
  useImperativeHandle(ref, () => ({
    handleFileUpload: (e) => {
      const file = e.target.files[0];
      if (!file || !videoRef.current) return;
      
      // 기존 소스 해제 (메모리 관리)
      if (videoRef.current.src) {
        URL.revokeObjectURL(videoRef.current.src);
      }
      
      videoRef.current.src = URL.createObjectURL(file);
      videoRef.current.load(); // 영상 로드 강제
      videoRef.current.play().catch(err => console.error("재생 에러:", err));
    }
  }));

  useEffect(() => {
    if (!Pose) return;
    if (!poseInstance.current) {
      poseInstance.current = new Pose({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
      });
      poseInstance.current.setOptions({
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
      poseInstance.current.onResults(onResults);
    }
    
    // 컴포넌트 언마운트 시 정리
    return () => {
      if (videoRef.current && videoRef.current.src) {
        URL.revokeObjectURL(videoRef.current.src);
      }
    };
  }, []);

  async function onResults(results) {
    if (results.poseLandmarks) {
      const landmarks = results.poseLandmarks.flatMap((l) => [l.x, l.y, l.z, l.visibility]);
      
      try {
        // [근본 해결] 접속한 브라우저의 호스트(IP 혹은 localhost)를 그대로 가져옵니다.
        const currentHost = window.location.hostname; 
        const serverUrl = `http://${currentHost}:8000/api/v1/exercise/analyze`;

        const response = await axios.post(serverUrl, {
          landmarks: landmarks,
          exercise_type: exercise,
        });
        
        if (onResultUpdate) {
          onResultUpdate(response.data);
        }
      } catch (err) {
        console.error("백엔드 전송 실패:", err);
      }
    }
  }

  const onFrame = async () => {
    if (videoRef.current && poseInstance.current) {
      if (!videoRef.current.paused && !videoRef.current.ended) {
        await poseInstance.current.send({ image: videoRef.current });
        requestAnimationFrame(onFrame);
      }
    }
  };

  return (
    <div className="absolute inset-0 w-full h-full bg-black flex items-center justify-center">
      <video 
        ref={videoRef} 
        onPlay={onFrame}
        className="w-full h-full object-contain bg-black"
        muted
        playsInline  // 아이폰에서 전체화면으로 튕겨나가는 것 방지 (매우 중요)
        webkit-playsinline="true" // 구형 iOS 대응
        autoPlay
      />
    </div>
  );
});

export default ExerciseAnalyzer;