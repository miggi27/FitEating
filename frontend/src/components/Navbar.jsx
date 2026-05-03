import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Dumbbell, BookText, Utensils, Settings as SettingsIcon } from "lucide-react";

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
      <NavButton to="/exercise" icon={<Dumbbell size={22} />} label="Workout" />
      <NavButton to="/diet" icon={<Utensils size={22} />} label="Diet" />
      <NavButton to="/settings" icon={<SettingsIcon size={22} />} label="Set" />
    </nav>
  );
};

export default Navbar;