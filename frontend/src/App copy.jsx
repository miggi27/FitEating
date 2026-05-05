// src/App.jsx
import React, { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import ExercisePage from "./pages/ExercisePage";
import DietPage from "./pages/DietPage";
import BlogPage from "./pages/BlogPage";
import Settings from "./pages/Settings";
import { AuthProvider } from "./context/AuthContext";

// 🟢 디자인 담당자의 작업 구역 임포트
import DesignMain from "./pages/designa/DesignMain";

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

const App = () => {
  const [theme, setTheme] = useState("dark");
  const s = themeStyles[theme];

  return (
    <BrowserRouter>
      <Routes>
        {/* 1. 🟢 디자인 모드 전용 경로 (기본 레이아웃과 Navbar를 무시함) */}
        <Route path="/designa/*" element={<DesignMain />} />

        {/* 2. 기존 서비스 영역 (Layout 유지) */}
        <Route
          path="*"
          element={
            <div className={`fixed inset-0 ${s.bg} ${s.text} flex flex-col overflow-hidden`}>
              <main className="flex-1 relative overflow-hidden flex justify-center">
                <Routes>
                  <Route path="/" element={<Navigate to="/exercise" replace />} />
                  <Route path="/exercise" element={<ExercisePage themeStyles={s} theme={theme} />} />
                  <Route path="/diet" element={<DietPage theme={theme} />} />
                  <Route path="/blog" element={<BlogPage theme={theme} />} />
                  <Route path="/settings" element={<Settings theme={theme} setTheme={setTheme} />} />
                </Routes>
              </main>
              <Navbar s={s} />
            </div>
          }
        />
      </Routes>
    </BrowserRouter>
  );
};

export default App;