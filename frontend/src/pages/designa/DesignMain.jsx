// src/pages/designa/DesignMain.jsx
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import DesignExercise from './DesignExercise'; // 복사한 파일

const DesignMain = () => {
  return (
    <div className="design-mode-root w-full h-full bg-white text-black">
      {/* 디자인 담당자가 여기 전용 네비바를 만들 수도 있겠죠? */}
      <Routes>
        <Route path="/exercise" element={<DesignExercise />} />
        <Route path="/" element={<div>디자인 모드 메인 (이동할 메뉴를 선택하세요)</div>} />
      </Routes>
    </div>
  );
};

export default DesignMain;