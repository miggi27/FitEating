import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// 💡 URL 파라미터로 들어오는 값을 어떻게 보여줄지 정의
const ROUTE_CONFIG = {
  // "exercise": { name: "운동 분석", link: "/Exercise" },
  // "diet": { name: "식단 기록", link: "/diet" },
  // "Dashboard": { name: "대시보드", link: "/Dashboard" },
  // "blog": { name: "히스토리", link: "/blog" },
  
  // 운동 ID 매핑 (URL에 포함된 영문을 한글로 변환)
  // "SQUAT": { name: "스쿼트", link: null },
  // "BENCH": { name: "벤치프레스", link: null },
  // "DEAD": { name: "데드리프트", link: null },
  
  // 마지막 단계 표시
  // "ANALYSIS": { name: "실시간 분석", link: null }
};

const TopNavbar = ({ s }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // 현재 전체 경로 배열화 (예: ["exercise", "SQUAT", "ANALYSIS"])
  const pathnames = location.pathname.split("/").filter((x) => x);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav className={`w-full h-14 ${s.header} border-b ${s.border} flex items-center justify-between px-6 backdrop-blur-md z-[100]`}>
      
      {/* 왼쪽: 탐색기형 경로 (Breadcrumb) */}
      <div className="flex items-center gap-2 text-sm font-bold tracking-tighter overflow-x-auto whitespace-nowrap scrollbar-hide max-w-[80%]">
        <Link to="/Dashboard" className="hover:text-blue-500 transition-colors uppercase flex-shrink-0 text-blue-500">
          FIT-EATING
        </Link>
        
        {pathnames.map((name, index) => {
          // 💡 핵심: 주소창의 암호(%EC...)를 다시 한글로 해독합니다.
          const decodedName = decodeURIComponent(name);
          // 1. 매핑된 한글 이름 찾기 (없으면 대문자 변환)
          const config = ROUTE_CONFIG[decodedName];
          const displayName = config ? config.name : decodedName.toUpperCase();
          
          // 2. '운동 분석'인 경우에만 선택 페이지 링크 부여
          let targetLink = null;
          if (name === "exercise") {
            targetLink = "/Exercise";
          } else if (config && config.link) {
            targetLink = config.link;
          }

          const isLast = index === pathnames.length - 1;

          return (
            <React.Fragment key={index}>
              <span className="text-slate-600 opacity-50">/</span>
              {isLast ? (
                // 마지막 경로는 파란색 강조
                <span className="text-blue-500 font-black uppercase">{displayName}</span>
              ) : (
                // 중간 경로
                <Link 
                  to={targetLink || "#"} 
                  className={`transition-colors font-medium uppercase ${targetLink ? 'hover:text-blue-500 text-slate-400' : 'text-slate-500 cursor-default'}`}
                  onClick={(e) => !targetLink && e.preventDefault()}
                >
                  {displayName}
                </Link>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* 오른쪽: 로그아웃 버튼 등 기존 디자인 유지 */}
      <div className="flex items-center gap-4">
        {user && (
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-[11px] font-bold text-slate-500">{user.username}님</span>
            <button onClick={handleLogout} className="text-[10px] font-black uppercase px-3 py-1.5 bg-white/5 hover:bg-red-500/20 hover:text-red-500 border border-white/10 rounded-lg transition-all">
              Logout
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};

export default TopNavbar;