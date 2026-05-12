import React from "react";
import { Link, useLocation } from "react-router-dom";
// 아이콘 추가: ClipboardList(계획), PlayCircle(실행)
import { ClipboardList, PlayCircle, BookText, Utensils, Settings as SettingsIcon } from "lucide-react";

const Navbar = ({ s }) => {
  const location = useLocation();

  const NavButton = ({ to, icon, label }) => {
    const active = location.pathname === to;
    return (
      <Link to={to} className="flex flex-col items-center justify-center flex-1 transition-all">
        <div className={`${active ? s.navActive : s.navInactive}`}>{icon}</div>
        <span className={`text-[9px] font-black uppercase mt-1 ${active ? s.navActive : s.navInactive}`}>
          {label}
        </span>
      </Link>
    );
  };

  return (
    <nav className={`h-20 ${s.nav} border-t ${s.border} flex items-center justify-around px-4 z-[100] shadow-lg`}>
      <NavButton to="/blog" icon={<BookText size={22} />} label="Blog" />
      
      {/* 1. 루틴 계획 (새로 추가될 중량/세트 관리 페이지) */}
      <NavButton to="/routine/plan" icon={<ClipboardList size={22} />} label="Routine Plan" />
      
      {/* 2. 루틴 시작 (기존 AI 카메라 분석 페이지) */}
      <NavButton to="/routine/play" icon={<PlayCircle size={22} />} label="Routine Play" />
      
      <NavButton to="/diet" icon={<Utensils size={22} />} label="Diet" />
      <NavButton to="/settings" icon={<SettingsIcon size={22} />} label="Set" />
    </nav>
  );
};

export default Navbar;