// src/pages/Settings.jsx
import React from 'react';
import { useNavigate } from "react-router-dom";

const Settings = ({ theme, setTheme }) => {
  const navigate = useNavigate();

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">설정</h2>      
      <div className="space-y-4">
        <p className="text-sm opacity-50">테마 설정</p>
        <div className="grid grid-cols-3 gap-3">
          <button 
            onClick={() => setTheme('dark')}
            className={`px-6 py-3 rounded-xl font-bold ${theme === 'dark' ? 'bg-blue-600 text-white' : 'bg-slate-800'}`}
          >
            DARK
          </button>
          <button 
            onClick={() => setTheme('white')}
            className={`px-6 py-3 rounded-xl font-bold ${theme === 'white' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-900'}`}
          >
            WHITE
          </button>
          <button 
            onClick={() => navigate("/designa")} 
            className="p-4 rounded-xl bg-blue-600 text-white font-bold"
          >
            Design A
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;