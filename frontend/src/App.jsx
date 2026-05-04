import React, { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import ExercisePage from "./pages/ExercisePage";
import DietPage from "./pages/DietPage";
import BlogPage from "./pages/BlogPage";
import Settings from "./pages/Settings";

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
      <div className={`fixed inset-0 ${s.bg} ${s.text} flex flex-col overflow-hidden`}>
        {/* 페이지 본문 영역 */}
        <main className="flex-1 relative overflow-hidden flex justify-center">
          <Routes>
            <Route path="/" element={<Navigate to="/exercise" replace />} />
            <Route path="/exercise" element={<ExercisePage themeStyles={s} theme={theme} />} />
            <Route path="/diet" element={<DietPage theme={theme} />} />
            <Route path="/blog" element={<BlogPage theme={theme} />} />
            <Route path="/settings" element={<Settings theme={theme} setTheme={setTheme} />} />
          </Routes>
        </main>

        {/* 공통 하단 탭바 */}
        <Navbar s={s} />
      </div>
    </BrowserRouter>
  );
};

export default App;