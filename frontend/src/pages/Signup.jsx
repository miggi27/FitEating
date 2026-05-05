import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../api/config";

const Signup = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: "", password: "", gender: "남",
    height: 170, weight: 70, lifestyle: "보통",
    workout_experience: "초보", workout_frequency: "주3회",
    fitness_level: "일반", goal: "다이어트"
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE_URL}/auth/signup`, formData);
      alert("회원가입 성공! 로그인해주세요.");
      navigate("/login");
    } catch (err) {
      alert("가입 실패: " + err.response?.data?.detail);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-xl">
      <h2 className="text-2xl font-bold mb-6 text-center">FitEating 가입</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input className="w-full p-2 border rounded" placeholder="아이디" 
               onChange={e => setFormData({...formData, username: e.target.value})} />
        <input className="w-full p-2 border rounded" type="password" placeholder="비밀번호" 
               onChange={e => setFormData({...formData, password: e.target.value})} />
        <div className="grid grid-cols-2 gap-4">
          <input className="p-2 border rounded" type="number" placeholder="키(cm)" 
                 onChange={e => setFormData({...formData, height: e.target.value})} />
          <input className="p-2 border rounded" type="number" placeholder="몸무게(kg)" 
                 onChange={e => setFormData({...formData, weight: e.target.value})} />
        </div>
        {/* ... 나머지 입력창들은 나중에 셀렉박스로 예쁘게 다듬으면 됩니다 ... */}
        <button type="submit" className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600">
          가입하기
        </button>
      </form>
    </div>
  );
};

export default Signup;