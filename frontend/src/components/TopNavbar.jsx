// src/components/TopNavbar.jsx
import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const TopNavbar = ({ s }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth(); // 전역 상태에서 유저 정보와 로그아웃 함수 가져오기

  // 주소창의 경로를 쪼개서 배열로 만듭니다. (예: /exercise/squat -> ['exercise', 'squat'])
  const pathnames = location.pathname.split("/").filter((x) => x);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav className={`w-full h-14 ${s.header} border-b ${s.border} flex items-center justify-between px-6 backdrop-blur-md z-[100]`}>
      
      {/* 왼쪽: 탐색기형 경로 (Breadcrumb) */}
      <div className="flex items-center gap-2 text-sm font-bold tracking-tighter overflow-x-auto whitespace-nowrap scrollbar-hide max-w-[70%]">
      <Link to="/Dashboard" className="hover:text-blue-500 transition-colors uppercase flex-shrink-0">FIT-EATING</Link>
      
      {pathnames.map((name, index) => {
          const routeTo = `/${pathnames.slice(0, index + 1).join("/")}`;
          const isLast = index === pathnames.length - 1;

          return (
            <React.Fragment key={name}>
              <span className="text-slate-600">/</span>
              {isLast ? (
                <span className="text-blue-500 uppercase">{name}</span>
              ) : (
                <Link to={routeTo} className="hover:text-blue-500 transition-colors uppercase text-slate-400">
                  {name}
                </Link>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* 오른쪽: 로그인/로그아웃 상태 */}
      <div className="flex items-center gap-4">
        {user ? (
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-slate-400">{user.username}님</span>
            <button 
              onClick={handleLogout}
              className="text-[10px] font-black uppercase px-3 py-1.5 bg-white/5 hover:bg-red-500/20 hover:text-red-500 border border-white/10 rounded-lg transition-all"
            >
              Logout
            </button>
          </div>
        ) : (
          <Link 
            to="/login" 
            className="text-[10px] font-black uppercase px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-all"
          >
            Login
          </Link>
        )}
      </div>
    </nav>
  );
};

export default TopNavbar;