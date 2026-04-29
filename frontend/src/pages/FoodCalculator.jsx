import React, { useState } from "react";
import { Camera, Utensils, Trash2, Calculator, Loader2, CheckCircle } from "lucide-react";
import axios from "axios";

const FoodCalculator = () => {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [foods, setFoods] = useState([]);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setLoading(true);
    setFoods([]);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const host = window.location.hostname;
      const res = await axios.post(`http://${host}:8000/api/v1/diet/analyze`, formData);
      const rawData = res.data || [];
      const detectedData = Array.isArray(rawData) ? rawData : [rawData];
      const formattedFoods = detectedData.map((item, index) => ({
        id: Date.now() + index,
        name: item.food_name || "알 수 없는 음식",
        weight: 100, 
        kcalPer100g: item.calories || 0,
        feedback: item.feedback || "분석된 영양 정보를 확인하세요."
      }));
      setFoods(formattedFoods);
    } catch (err) {
      alert("분석 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const updateFood = (id, field, value) => {
    setFoods(prev => prev.map(f => f.id === id ? { ...f, [field]: value } : f));
  };

  const removeFood = (id) => {
    setFoods(prev => prev.filter(f => f.id !== id));
  };

  const totalKcal = foods.reduce((sum, f) => sum + (Number(f.kcalPer100g) * Number(f.weight) / 100), 0);

  return (
    /* 💡 전체 페이지가 스크롤 되도록 설정, 내부 개별 스크롤은 금지 */
    <div className="min-h-screen bg-[#0c0c0e] text-white p-4 pb-20 overflow-x-hidden">
      
      {/* 1. 이미지 프리뷰 */}
      <div className="relative w-full aspect-video bg-[#16161a] rounded-3xl border border-white/5 overflow-hidden shadow-2xl mb-6">
        {preview ? (
          <img src={preview} alt="food" className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-700">
            <Utensils size={32} className="mb-2 opacity-20" />
            <p className="text-[10px] font-black uppercase tracking-widest">Ready to scan</p>
          </div>
        )}
        {loading && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-50">
            <Loader2 className="animate-spin text-blue-500 mb-2" size={32} />
            <p className="text-[10px] font-black tracking-widest">ANALYZING...</p>
          </div>
        )}
        <label className="absolute bottom-4 right-4 p-4 bg-blue-600 rounded-2xl cursor-pointer shadow-2xl active:scale-90 transition-transform">
          <Camera size={20} className="text-white" />
          <input type="file" className="hidden" accept="image/*" onChange={handleUpload} />
        </label>
      </div>

      {/* 2. 음식 리스트 영역 (스크롤 없이 꽉 채움) */}
      <div className="mb-6">
        {foods.length > 0 ? (
          <div className="bg-[#16161a] rounded-3xl border border-white/5 overflow-hidden">
            <div className="flex px-5 py-3 bg-white/5 text-[9px] font-black text-slate-500 border-b border-white/5">
              <span className="flex-1">FOOD NAME</span>
              <span className="w-12 text-center mr-2">GRAM</span>
              <span className="w-12 text-right mr-8">KCAL</span>
            </div>
            {/* 💡 max-h를 빼서 리스트가 길어지면 길어지는 대로 박스가 늘어나게 함 */}
            <div>
              {foods.map((food) => (
                <div key={food.id} className="flex items-center px-5 py-4 border-b border-white/5 last:border-0">
                  <input 
                    value={food.name} 
                    onChange={(e) => updateFood(food.id, 'name', e.target.value)}
                    className="flex-1 bg-transparent text-sm font-bold text-white outline-none focus:text-blue-400 min-w-0"
                  />
                  <input 
                    type="number"
                    value={food.weight} 
                    onChange={(e) => updateFood(food.id, 'weight', e.target.value)}
                    className="w-12 bg-white/5 text-blue-500 text-xs font-black text-center py-2 rounded outline-none border border-white/5 mx-2"
                  />
                  <span className="w-12 text-right text-sm font-black italic text-slate-200">
                    {Math.round((food.kcalPer100g * food.weight) / 100)}
                  </span>
                  <button onClick={() => removeFood(food.id)} className="ml-4 text-slate-600 active:text-red-500">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          !loading && <div className="py-10 text-center border-2 border-dashed border-white/5 rounded-3xl text-slate-700 text-[10px] font-black uppercase">List is empty</div>
        )}
      </div>

      {/* 3. 하단 섹션 (리스트 바로 뒤에 자연스럽게 배치) */}
      {foods.length > 0 && (
        <div className="flex flex-col gap-4">
          {/* 총 칼로리 카드 */}
          <div className="bg-blue-600 p-6 rounded-[2rem] shadow-2xl relative overflow-hidden shrink-0">
            <div className="relative z-10">
              <p className="text-[10px] font-black text-blue-100 uppercase opacity-70 mb-1">Total Kcal</p>
              <div className="flex items-baseline gap-1">
                <span className="text-5xl font-black italic tracking-tighter">{Math.round(totalKcal)}</span>
                <span className="text-lg font-bold opacity-80">kcal</span>
              </div>
            </div>
            <Calculator size={60} className="absolute -bottom-2 -right-2 opacity-10" />
          </div>

          {/* AI 피드백 박스 */}
          <div className="bg-[#16161a] p-5 rounded-[2rem] border border-white/5 flex gap-4 shadow-xl">
            <CheckCircle size={20} className="text-blue-500 shrink-0 mt-1" />
            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Dietary Feedback</p>
              <p className="text-[14px] text-slate-300 leading-snug font-medium break-keep">
                {foods[0]?.feedback}
              </p>
            </div>
          </div>

          <button className="w-full py-5 bg-white text-black font-black uppercase text-xs rounded-2xl active:scale-95 transition-transform mt-2">
            Save Food Diary
          </button>
        </div>
      )}
    </div>
  );
};

export default FoodCalculator;