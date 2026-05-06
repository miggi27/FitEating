// Dashboard.jsx (예시)
import React, { useEffect, useState } from 'react';
import axios from 'axios';

const Dashboard = () => {
  const [summary, setSummary] = useState({ total: { kcal: 0, carbs: 0, protein: 0, fat: 0 }, logs: [] });

  useEffect(() => {
    // API 호출해서 오늘 데이터 가져오기
    const fetchSummary = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/diet/daily-summary`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setSummary(res.data);
      } catch (err) { console.error("데이터 로드 실패"); }
    };
    fetchSummary();
  }, []);

  return (
    <div className="p-6 bg-slate-50 rounded-3xl shadow-inner">
      <h3 className="text-xl font-bold mb-4">🔥 오늘 섭취량</h3>
      <div className="grid grid-cols-4 gap-4 text-center">
        <div className="bg-white p-3 rounded-2xl shadow-sm">
          <p className="text-xs text-slate-500">칼로리</p>
          <p className="text-lg font-black text-orange-500">{summary.total.kcal}kcal</p>
        </div>
        <div className="bg-white p-3 rounded-2xl shadow-sm">
          <p className="text-xs text-slate-500">탄수화물</p>
          <p className="text-lg font-bold">{summary.total.carbs}g</p>
        </div>
        <div className="bg-white p-3 rounded-2xl shadow-sm">
          <p className="text-xs text-slate-500">단백질</p>
          <p className="text-lg font-bold text-blue-500">{summary.total.protein}g</p>
        </div>
        <div className="bg-white p-3 rounded-2xl shadow-sm">
          <p className="text-xs text-slate-500">지방</p>
          <p className="text-lg font-bold text-red-500">{summary.total.fat}g</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;