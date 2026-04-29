// src/pages/FoodCalculator.jsx
import React, { useState } from "react";
import { Camera, Upload, Utensils, Info } from "lucide-react";
import axios from "axios";

const FoodCalculator = () => {
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setPreview(URL.createObjectURL(file));
    setLoading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await axios.post(`http://${window.location.hostname}:8000/api/v1/diet/analyze`, formData);
      setResult(res.data);
    } catch (err) {
      console.error("분석 실패", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col gap-6">
      {/* 이미지 분석 영역 */}
      <div className="relative aspect-video bg-[#16161a] rounded-3xl border border-white/10 overflow-hidden flex items-center justify-center">
        {preview ? (
          <img src={preview} alt="food" className="w-full h-full object-cover" />
        ) : (
          <div className="text-center">
            <Utensils size={48} className="text-slate-700 mx-auto mb-2" />
            <p className="text-slate-500 text-sm">식단 사진을 업로드하세요</p>
          </div>
        )}
        
        {loading && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        )}

        <label className="absolute bottom-4 right-4 p-4 bg-blue-600 rounded-full cursor-pointer hover:scale-110 transition-transform shadow-xl">
          <Camera size={24} className="text-white" />
          <input type="file" className="hidden" accept="image/*" onChange={handleUpload} />
        </label>
      </div>

      {/* 분석 결과 카드 */}
      {result && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[#16161a] p-5 rounded-2xl border border-white/5">
            <p className="text-[10px] font-black text-blue-500 uppercase mb-1">Food Name</p>
            <p className="text-2xl font-black italic">{result.food_name}</p>
          </div>
          <div className="bg-[#16161a] p-5 rounded-2xl border border-white/5">
            <p className="text-[10px] font-black text-orange-500 uppercase mb-1">Calories</p>
            <p className="text-2xl font-black italic">{result.calories} <span className="text-sm">kcal</span></p>
          </div>
          
          <div className="col-span-2 bg-blue-600/10 p-5 rounded-2xl border border-blue-500/20">
            <div className="flex items-center gap-2 mb-2">
              <Info size={16} className="text-blue-500" />
              <p className="text-xs font-bold text-blue-400">AI Nutrient Feedback</p>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">{result.feedback}</p>
          </div>
        </div>
      )}

      {/* 블로그 저장 버튼 */}
      {result && (
        <button className="mt-auto w-full py-4 bg-white text-black font-black uppercase tracking-tighter rounded-xl hover:bg-blue-500 hover:text-white transition-all">
          Save to Blog
        </button>
      )}
    </div>
  );
};

export default FoodCalculator;