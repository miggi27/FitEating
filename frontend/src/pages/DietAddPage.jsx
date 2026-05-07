import React, { useState, useEffect } from "react";
import { Camera, Trash2, Loader2, Star, Heart, X, Calculator } from "lucide-react";
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from "axios";
import { API_BASE_URL } from "../api/config";

const DietAddPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mealType = searchParams.get('type') || '간식';
  const token = localStorage.getItem('token');

  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [foods, setFoods] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [isFavSet, setIsFavSet] = useState(false);

  // 1. 데이터 복원: 수정 모드 진입 시 사진과 기존 리스트 무조건 로드
  useEffect(() => {
    const initPage = async () => {
      try {
        // 즐겨찾기 목록 로드
        const favRes = await axios.get(`${API_BASE_URL}/diet/favorites`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setFavorites(favRes.data || []);

        // 기존 기록 로드 (수정 시 사진 복원 핵심)
        const res = await axios.get(`${API_BASE_URL}/diet/daily-summary`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const currentLogs = res.data.logs.filter(l => l.meal_type === mealType);
        
        if (currentLogs.length > 0) {
          setFoods(currentLogs.map(f => ({
            ...f,
            weight: f.weight || 100,
            calories: f.calories || 0,
            carbs: f.carbs || 0,
            protein: f.protein || 0,
            fat: f.fat || 0
          })));
          // 서버에 저장된 사진 경로가 있다면 프리뷰에 고정
          if (currentLogs[0].image_url) {
            setPreview(currentLogs[0].image_url);
          }
        }
      } catch (err) { console.error("데이터 복원 실패", err); }
    };
    initPage();
  }, [token, mealType]);

  // 2. 간식 로직: 빈칸 항상 하나 유지 (사용자님이 원하신 독립적 추가 방식)
  useEffect(() => {
    if (mealType === '간식') {
      const hasEmptyRow = foods.some(f => !f.food_name || f.food_name.trim() === "");
      if (!hasEmptyRow) {
        setFoods(prev => [...prev, { 
          id: `empty-${Date.now()}`, 
          food_name: "", 
          calories: 0, carbs: 0, protein: 0, fat: 0, 
          weight: 100 
        }]);
      }
    }
  }, [foods, mealType]);

  const safeTotalKcal = foods.reduce((sum, f) => {
    const kcal = parseFloat(f.calories) || 0;
    const weight = parseFloat(f.weight) || 0;
    return sum + (kcal * weight / 100);
  }, 0);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await axios.post(`${API_BASE_URL}/diet/analyze`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const mappedFoods = res.data.map((item, i) => ({
        id: Date.now() + i,
        food_name: item.food_name || "알 수 없는 음식",
        weight: 100,
        calories: Number(item.calories) || 0,
        carbs: Number(item.carbs) || 0,
        protein: Number(item.protein) || 0,
        fat: Number(item.fat) || 0
      }));

      // 사진 분석 시 기존 빈칸은 유지하고 분석된 음식들만 추가
      setFoods(prev => {
        const cleanPrev = prev.filter(f => f.food_name && f.food_name.trim() !== "");
        return [...cleanPrev, ...mappedFoods];
      });
    } catch (err) { alert("분석 실패"); } finally { setLoading(false); }
  };

  const handleFinalSave = async () => {
    const finalFoods = foods.filter(f => f.food_name && f.food_name.trim() !== "");
    if (finalFoods.length === 0) return alert("저장할 음식이 없습니다!");
    
    try {
      // 이미지 URL도 포함하여 전송 (수정 시 사진 유지)
      await axios.post(`${API_BASE_URL}/diet/record-many`, {
        meal_type: mealType,
        items: finalFoods,
        image_url: preview, // 현재 보고 있는 사진 경로 유지
        save_as_favorite: isFavSet
      }, { headers: { Authorization: `Bearer ${token}` } });
      
      navigate('/diet');
    } catch (err) { alert("저장 실패 ㅡ.ㅡ;"); }
  };

  return (
    <div className="min-h-screen bg-[#0c0c0e] text-white font-sans overflow-y-auto pb-32">
      {/* 헤더 */}
      <div className="flex justify-between items-center p-4 border-b border-white/5">
        <X onClick={() => navigate(-1)} className="text-slate-500 cursor-pointer" size={20} />
        <h2 className="text-xs font-black text-blue-500 italic uppercase tracking-widest">{mealType} 상세 수정</h2>
        <div className="w-5"></div>
      </div>

      <div className="p-4 space-y-6">
        {/* 사진 영역: 수정 시에도 기존 사진이 보여야 함 */}
        <div className="relative aspect-video bg-[#16161a] rounded-[2rem] border border-white/5 overflow-hidden shadow-2xl">
          {preview ? <img src={preview} className="w-full h-full object-cover" alt="식사 사진" /> : 
            <div className="h-full flex items-center justify-center text-slate-800 text-[10px] font-black uppercase tracking-widest italic">No Image Captured</div>
          }
          {loading && <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-20"><Loader2 className="animate-spin text-blue-500" /></div>}
          
          <div className="absolute bottom-3 right-3 flex gap-2">
            <button onClick={() => setIsFavSet(!isFavSet)} className={`p-3 rounded-2xl transition-all ${isFavSet ? 'bg-red-500 shadow-lg' : 'bg-white/5 backdrop-blur-md border border-white/10'}`}>
              <Heart size={18} className={isFavSet ? "fill-white" : "text-white"} />
            </button>
            <label className="p-3 bg-blue-600 rounded-2xl cursor-pointer active:scale-95 transition-all">
              <Camera size={18} />
              <input type="file" className="hidden" accept="image/*" onChange={handleUpload} />
            </label>
          </div>
        </div>

        {/* 분석/수정 리스트 */}
        {foods.length > 0 && (
          <div className="bg-[#16161a] rounded-3xl border border-white/5 overflow-hidden">
            <div className="grid grid-cols-12 px-4 py-2 text-[8px] font-black text-slate-600 border-b border-white/5 uppercase bg-white/5">
              <span className="col-span-4 text-blue-500">Food Name</span>
              <span className="col-span-5 text-center">C / P / F / Kcal</span>
              <span className="col-span-3 text-right">Gram</span>
            </div>
            {foods.map((f, i) => (
              <div key={f.id} className="grid grid-cols-12 px-4 py-4 items-center border-b border-white/5 last:border-0">
                <input 
                  className="col-span-4 bg-transparent text-xs font-bold text-white outline-none border-b border-white/10 focus:border-blue-500" 
                  placeholder="음식명 직접입력"
                  value={f.food_name} 
                  onChange={e => { const n = [...foods]; n[i].food_name = e.target.value; setFoods(n); }} 
                />
                <div className="col-span-5 flex justify-around text-[9px] font-black italic">
                  <span className="text-blue-400">{Math.round(f.carbs)}</span>
                  <span className="text-orange-400">{Math.round(f.protein)}</span>
                  <span className="text-yellow-400">{Math.round(f.fat)}</span>
                  <span className="text-white font-bold underline decoration-blue-500/50">{Math.round((f.calories * f.weight) / 100)}</span>
                </div>
                <div className="col-span-3 flex items-center justify-end">
                  <input type="number" className="w-10 bg-transparent text-right text-xs font-black text-blue-500 outline-none" value={f.weight} onChange={e => { const n = [...foods]; n[i].weight = e.target.value; setFoods(n); }} />
                  <Trash2 size={12} className="ml-2 text-slate-700 cursor-pointer hover:text-red-500" onClick={() => setFoods(foods.filter(it => it.id !== f.id))} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 칼로리 요약 & 저장 버튼 */}
        {foods.length > 0 && (
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-zinc-900 to-[#16161a] p-5 rounded-2xl border border-white/5 flex items-center justify-between shadow-xl">
              <div className="flex items-center gap-2">
                <Calculator size={18} className="text-blue-500 opacity-80" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Energy</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black italic text-blue-500">{Math.round(safeTotalKcal)}</span>
                <span className="text-xs font-bold text-slate-500">KCAL</span>
              </div>
            </div>

            <button 
              onClick={handleFinalSave}
              className="w-full py-5 bg-blue-600 text-white font-black uppercase text-[12px] tracking-[0.2em] rounded-2xl shadow-lg active:scale-95 transition-all"
            >
              식단 상세 저장 완료
            </button>
          </div>
        )}

        {/* 즐겨찾기 섹션 (탄단지 정보 포함하여 가시성 강화) */}
        <div className="space-y-3 pt-4 border-t border-white/5">
          <p className="text-[10px] font-black text-slate-600 uppercase ml-2 tracking-widest flex items-center gap-2">
            <Star size={12} className="text-yellow-600" /> My Favorites
          </p>
          {favorites.map((fav, i) => (
            <div 
              key={i} 
              onClick={() => { setFoods(prev => [...prev.filter(f => f.food_name !== ""), ...fav.items]); }} 
              className="bg-[#16161a] p-5 rounded-3xl border border-white/10 flex justify-between items-center cursor-pointer hover:border-blue-500/50 transition-all active:scale-98"
            >
              <div className="flex-1">
                <p className="text-xs font-black text-blue-400 uppercase italic">{fav.name}</p>
                <p className="text-[9px] text-slate-500 mt-1">{fav.items.map(it=>it.food_name).join(", ")}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-black text-white italic">{fav.total_kcal} <span className="text-[8px] opacity-50">kcal</span></p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DietAddPage;