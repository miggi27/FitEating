// src/App.jsx
import React, { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import TopNavbar from "./components/TopNavbar";
import Navbar from "./components/Navbar";
import ExercisePage from "./pages/ExercisePage";
import DietPage from "./pages/DietPage";
import BlogPage from "./pages/BlogPage";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import { AuthProvider } from "./context/AuthContext";

import DesignMain from "./pages/designa/DesignMain";
import DietAddPage from './pages/DietAddPage';

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

const AppContent = () => {
  const [theme, setTheme] = useState("dark");
  const s = themeStyles[theme];

  return (
    <Routes>
      {/* 1. 디자인 모드 (기존 유지) */}
      <Route path="/designa/*" element={<DesignMain />} />

      {/* 2. 로그인/회원가입 (내비바 없는 깨끗한 화면) */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* 3. 메인 서비스 영역 */}
      <Route
        path="*"
        element={
          <div className={`fixed inset-0 ${s.bg} ${s.text} flex flex-col overflow-hidden`}>
            {/* 🟢 상단 네비바 고정 */}
            <TopNavbar s={s} />
            <main className="flex-1 relative overflow-hidden flex justify-center">
              <Routes>
                <Route path="/" element={<Navigate to="/exercise" replace />} />
                <Route path="/exercise" element={<ExercisePage theme={theme} />} />
                <Route path="/exercise/:exId" element={<ExercisePage theme={theme} />} />
                <Route path="/exercise/:exId/:mode" element={<ExercisePage theme={theme} />} />
                <Route path="/diet" element={<DietPage theme={theme} />} />
                <Route path="/diet/add" element={<DietAddPage />} />
                <Route path="/blog" element={<BlogPage theme={theme} />} />
                <Route path="/settings" element={<Settings theme={theme} setTheme={setTheme} />} />
              </Routes>
            </main>
            {/* 하단 네비바 고정 */}
            <Navbar s={s} />
          </div>
        }
      />
    </Routes>
  );
};

const App = () => {
  return (
    <AuthProvider> {/* 🟢 전역 상태 주머니로 감싸기 */}
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;