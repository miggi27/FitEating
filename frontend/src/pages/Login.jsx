import React, { useState } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom"; // 🟢 Link 추가
import { API_BASE_URL } from "../api/config";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const params = new URLSearchParams();
      params.append('username', username);
      params.append('password', password);

      const res = await axios.post(`${API_BASE_URL}/auth/login`, params);
      alert("로그인 성공!"); 
      login(res.data.access_token, res.data.username);
      navigate("/"); 
    } catch (err) {
      console.error(err);
      alert("로그인 실패! 아이디나 비밀번호를 확인하세요.");
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20 p-8 bg-white rounded-3xl shadow-2xl border border-slate-100">
      <h2 className="text-3xl font-black mb-8 text-center italic text-slate-800">LOGIN</h2>
      
      <form onSubmit={handleLogin} className="space-y-4">
        <input 
          className="w-full p-4 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-500 transition-all" 
          placeholder="아이디" 
          value={username} 
          onChange={e => setUsername(e.target.value)} 
        />
        <input 
          className="w-full p-4 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-500 transition-all" 
          type="password" 
          placeholder="비밀번호" 
          value={password} 
          onChange={e => setPassword(e.target.value)} 
        />
        <button 
          type="submit" 
          className="w-full bg-green-500 text-white p-4 rounded-2xl font-bold text-lg hover:bg-green-600 hover:shadow-lg hover:shadow-green-200 transition-all active:scale-[0.98]"
        >
          로그인
        </button>
      </form>

      {/* 🟢 회원가입 유도 구역 */}
      <div className="mt-8 pt-6 border-t border-slate-100 text-center">
        <p className="text-slate-500 text-sm mb-4">계정이 없으신가요?</p>
        <Link 
          to="/signup" 
          className="inline-block w-full p-4 border-2 border-slate-100 rounded-2xl font-bold text-slate-600 hover:bg-slate-50 hover:border-slate-200 transition-all"
        >
          회원가입 하러가기
        </Link>
      </div>
    </div>
  );
};

export default Login;