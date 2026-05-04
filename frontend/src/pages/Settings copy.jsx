import React from 'react';

const Settings = ({ theme, setTheme }) => {
  return (
    <div className="p-8">
      <h2 className="text-2xl font-black italic uppercase mb-6">Settings</h2>
      <div className="space-y-4">
        <p className="text-sm font-bold opacity-50">THEME MODE</p>
        <div className="flex gap-4">
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
        </div>
      </div>
    </div>
  );
};

export default Settings;