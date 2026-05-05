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

  // 1. 페이지 로드 시 즐겨찾기 목록 가져오기
  useEffect(() => {
    const fetchFavs = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/diet/favorites`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setFavorites(res.data || []);
      } catch (err) {
        setFavorites([]);
      }
    };
    fetchFavs();
  }, [token]);

  // 안전한 총 칼로리 계산 (NaN 방지)
  const safeTotalKcal = foods.reduce((sum, f) => {
    const kcal = parseFloat(f.calories) || 0;
    const weight = parseFloat(f.weight) || 0;
    return sum + (kcal * weight / 100);
  }, 0);

  // 2. 사진 분석
  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await axios.post(`${API_BASE_URL}/diet/analyze`, formData, { headers: { Authorization: `Bearer ${token}` } });
      setFoods(res.data.map((item, i) => ({
        id: Date.now() + i,
        food_name: item.food_name || "음식명",
        weight: 100,
        calories: item.calories || 0,
        carbs: item.carbs || 0, protein: item.protein || 0, fat: item.fat || 0
      })));
    } catch (err) { alert("분석 실패"); } finally { setLoading(false); }
  };

  // 3. 최종 저장 (기존 기록 삭제 후 새 저장 + 즐겨찾기 등록 포함)
  const handleFinalSave = async () => {
    if (foods.length === 0) return alert("저장할 음식이 없습니다!");
    try {
      await axios.post(`${API_BASE_URL}/diet/record-many`, {
        meal_type: mealType,
        items: foods,
        save_as_favorite: isFavSet // 하트 체크 시 즐겨찾기 세트로 저장
      }, { headers: { Authorization: `Bearer ${token}` } });
      
      alert(isFavSet ? "✅ 즐겨찾기 세트 등록 및 기록 완료!" : "✅ 기록 완료!");
      navigate('/diet');
    } catch (err) { alert("저장 실패 ㅡ.ㅡ;"); }
  };

  return (
    // 전체 페이지 스크롤 가능하게 overflow-y-auto 적용
    <div className="min-h-screen bg-[#0c0c0e] text-white font-sans overflow-y-auto pb-32">
      
      {/* 헤더 */}
      <div className="flex justify-between items-center p-4 border-b border-white/5">
        <X onClick={() => navigate(-1)} className="text-slate-500 cursor-pointer" size={20} />
        <h2 className="text-xs font-black text-blue-500 italic uppercase tracking-widest">{mealType} SCANNER</h2>
        <div className="w-5"></div>
      </div>

      <div className="p-4 space-y-6">
        
        {/* 사진 영역 */}
        <div className="relative aspect-video bg-[#16161a] rounded-[2rem] border border-white/5 overflow-hidden shadow-2xl">
          {preview ? <img src={preview} className="w-full h-full object-cover" /> : <div className="h-full flex items-center justify-center text-slate-800 text-[10px] font-black uppercase tracking-widest">Wait for Photo</div>}
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

        {/* 1. 분석된 음식 리스트 */}
        {foods.length > 0 && (
          <div className="bg-[#16161a] rounded-3xl border border-white/5 overflow-hidden">
            <div className="grid grid-cols-12 px-4 py-2 text-[8px] font-black text-slate-600 border-b border-white/5 uppercase bg-white/5">
              <span className="col-span-4">Food</span>
              <span className="col-span-5 text-center">C/P/F/Kcal</span>
              <span className="col-span-3 text-right">Gram</span>
            </div>
            {foods.map((f, i) => (
              <div key={f.id} className="grid grid-cols-12 px-4 py-4 items-center border-b border-white/5 last:border-0">
                <input className="col-span-4 bg-transparent text-xs font-bold text-blue-400 outline-none" value={f.food_name} onChange={e => { const n = [...foods]; n[i].food_name = e.target.value; setFoods(n); }} />
                <div className="col-span-5 flex justify-around text-[9px] font-black text-slate-500 italic">
                  <span>{Math.round(f.carbs) || 0}</span><span>{Math.round(f.protein) || 0}</span><span>{Math.round(f.fat) || 0}</span><span className="text-white">{Math.round((f.calories * f.weight) / 100) || 0}</span>
                </div>
                <div className="col-span-3 flex items-center justify-end">
                  <input type="number" className="w-10 bg-transparent text-right text-xs font-black text-blue-500 outline-none" value={f.weight} onChange={e => { const n = [...foods]; n[i].weight = e.target.value; setFoods(n); }} />
                  <Trash2 size={12} className="ml-2 text-slate-800" onClick={() => setFoods(foods.filter(it => it.id !== f.id))} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 2. 총 칼로리 표시 (리스트 바로 아래) */}
        {foods.length > 0 && (
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-5 rounded-2xl flex items-center justify-between shadow-xl">
            <div className="flex items-center gap-2">
              <Calculator size={18} className="text-blue-300 opacity-50" />
              <span className="text-[10px] font-black text-blue-100 uppercase tracking-widest">Total Energy</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black italic">{Math.round(safeTotalKcal)}</span>
              <span className="text-xs font-bold opacity-70">KCAL</span>
            </div>
          </div>
        )}

        {/* 3. 저장하기 버튼 (칼로리 아래) */}
        {foods.length > 0 && (
          <button 
            onClick={handleFinalSave}
            className="w-full py-5 bg-white text-black font-black uppercase text-[12px] tracking-[0.2em] rounded-2xl shadow-xl active:scale-95 transition-all"
          >
            {isFavSet ? "Save & Register Favorite" : "Complete Record"}
          </button>
        )}

        {/* 4. 즐겨찾기 목록 (맨 아래 배치) */}
        <div className="space-y-3 pt-4 border-t border-white/5">
          <p className="text-[10px] font-black text-slate-600 uppercase ml-2 tracking-widest flex items-center gap-2">
            <Star size={12} className="text-yellow-600" /> Favorite Sets
          </p>
          {favorites.length > 0 ? favorites.map((fav, i) => (
            <div key={i} onClick={() => { setFoods(fav.items); setPreview(null); }} className="bg-[#16161a] p-5 rounded-3xl border border-white/10 flex justify-between items-center cursor-pointer hover:bg-white/5 transition-all shadow-lg active:scale-98">
              <div>
                <p className="text-xs font-black text-slate-300">{fav.name}</p>
                <p className="text-[9px] text-slate-600 mt-1 uppercase tracking-tight">{fav.items.map(it=>it.food_name).join(", ")} | {fav.total_kcal} kcal</p>
              </div>
              <Star size={14} className="text-yellow-600 fill-yellow-600 opacity-30" />
            </div>
          )) : (
            <div className="py-12 text-center border-2 border-dashed border-white/5 rounded-3xl text-slate-800 text-[10px] font-black uppercase tracking-widest">
              No Favorites Yet
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default DietAddPage;