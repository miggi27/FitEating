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
  const [isFavSet, setIsFavSet] = useState(false);

  const [favorites, setFavorites] = useState({ meal: [], snack: [] });
  const [activeTab, setActiveTab] = useState(mealType === "간식" ? "snack" : "meal");
  const [favList, setFavList] = useState([]); // 즐겨찾기 목록 저장
  const [showFavs, setShowFavs] = useState(false); // 팝업/모달 제어
  const [feedback, setFeedback] = useState(""); // 피드백 문구

  const generateId = () => `row-${Math.random().toString(36).substr(2, 9)}`;

  // 데이터 로드 시
  useEffect(() => {
    const fetchFavs = async () => {
      const res = await axios.get(`${API_BASE_URL}/diet/favorites`, { headers: { Authorization: `Bearer ${token}` } });
      setFavorites(res.data);
    };
    fetchFavs();
  }, [token]);

  // 세트 클릭 시: 사진 + 음식 리스트 + 그람수 통째로 복원
  const applyMealSet = (selectedSet) => {
    if (!window.confirm("선택한 세트로 식단을 교체할까요?")) return;
    
    const restored = selectedSet.items.map(item => ({
      ...item,
      id: generateId()
    }));
    
    setFoods(restored); // 음식 리스트 & 그람수 복원
    setPreview(selectedSet.image_url); // 사진 복원
  };

  useEffect(() => {
    const initPage = async () => {
      try {
        const favRes = await axios.get(`${API_BASE_URL}/diet/favorites`, { headers: { Authorization: `Bearer ${token}` } });
        setFavorites(favRes.data || []);

        const res = await axios.get(`${API_BASE_URL}/diet/daily-summary`, { headers: { Authorization: `Bearer ${token}` } });
        const currentLogs = res.data.logs.filter(l => l.meal_type === mealType);
        
        if (currentLogs.length > 0) {
          // 수정 시 사진 복원 핵심 로직
          if (currentLogs[0].image_url) setPreview(currentLogs[0].image_url);
          setFoods(currentLogs.map(f => ({ ...f, id: f.id || generateId(), weight: f.weight || 100 })));
        }
      } catch (err) { console.error("로드 실패", err); }
    };
    initPage();
  }, [token, mealType]);

  useEffect(() => {
    const lastRow = foods[foods.length - 1];
    if (!lastRow || (lastRow.food_name && lastRow.food_name.trim() !== "")) {
      setFoods(prev => [...prev, { id: generateId(), food_name: "", calories: 0, carbs: 0, protein: 0, fat: 0, weight: 100 }]);
    }
  }, [foods]);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await axios.post(`${API_BASE_URL}/diet/analyze`, formData, { headers: { Authorization: `Bearer ${token}` } });
      const mapped = res.data.map((item, i) => ({ ...item, id: generateId() + i, weight: 100 }));
      setFoods(prev => [...prev.filter(f => f.food_name !== ""), ...mapped]);
    } catch (err) { alert("분석 실패"); } finally { setLoading(false); }
  };

  const handleFinalSave = async () => {
    const finalFoods = foods.filter(f => f.food_name && f.food_name.trim() !== "");
    try {
      await axios.post(`${API_BASE_URL}/diet/record-many`, {
        meal_type: mealType, items: finalFoods, image_url: preview, save_as_favorite: isFavSet
      }, { headers: { Authorization: `Bearer ${token}` } });
      navigate('/diet');
    } catch (err) { alert("저장 실패"); }
  };

  const totalKcal = foods.reduce((sum, f) => sum + ((f.calories * (f.weight || 100)) / 100), 0);

  const fetchNutrition = async (index, name) => {
    if (!name.trim()) return;
    
    try {
      const res = await axios.get(`${API_BASE_URL}/diet/search-nutrition`, {
        params: { name: name },
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.data) {
        const newFoods = [...foods];
        newFoods[index] = {
          ...newFoods[index],
          food_name: res.data.food_name,
          calories: res.data.kcal,
          carbs: res.data.carbs,
          protein: res.data.protein,
          fat: res.data.fat,
        };
        setFoods(newFoods);
      }
    } catch (err) {
      console.error("영양 정보 검색 실패", err);
    }
  };

  // 1. 그람수 변경 핸들러
  const handleWeightChange = (index, value) => {
    const newFoods = [...foods];
    newFoods[index].weight = Number(value); // 숫자로 변환하여 저장
    setFoods(newFoods);
  };

  const addFavoriteToFoods = (fav) => {
    setFoods(prev => [
      ...prev.filter(f => f.food_name !== ""), // 빈 줄 제거
      { ...fav, id: generateId(), weight: 100 }
    ]);
    setShowFavs(false); // 창 닫기
  };

  return (
    <div className="h-screen bg-[#0c0c0e] text-white overflow-y-auto pb-40">
      <div className="flex justify-between items-center p-4 border-b border-white/5">
        <X onClick={() => navigate(-1)} className="text-slate-500 cursor-pointer" size={20} />
        <h2 className="text-xs font-black text-blue-500 italic uppercase tracking-widest">{mealType} 상세 수정</h2>
        <div className="w-5"></div>
      </div>

      <div className="p-4 space-y-6">
        <div className="relative aspect-video bg-[#16161a] rounded-[2rem] border border-white/5 overflow-hidden shadow-2xl">
          {preview ? <img src={preview} className="w-full h-full object-cover" alt="preview" /> : 
            <div className="h-full flex items-center justify-center text-slate-800 text-[10px] font-black uppercase italic">No Image</div>}
          {loading && <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-20"><Loader2 className="animate-spin text-blue-500" /></div>}
          <div className="absolute bottom-3 right-3 flex gap-2">
            <button onClick={() => setIsFavSet(!isFavSet)} className={`p-3 rounded-2xl ${isFavSet ? 'bg-red-500' : 'bg-white/5'}`}><Heart size={18} /></button>
            <label className="p-3 bg-blue-600 rounded-2xl cursor-pointer"><Camera size={18} /><input type="file" className="hidden" accept="image/*" onChange={handleUpload} /></label>
          </div>
        </div>

        <div className="bg-[#16161a] rounded-3xl border border-white/5 overflow-hidden">
          <div className="grid grid-cols-12 px-4 py-2 text-[8px] font-black text-slate-600 border-b border-white/5 uppercase bg-white/5">
            <span className="col-span-4 text-blue-500">Food Name</span>
            <span className="col-span-5 text-center">C / P / F / Kcal</span>
            <span className="col-span-3 text-right">Gram</span>
          </div>
          {foods.map((f, i) => (
            <div key={f.id} className="grid grid-cols-12 px-4 py-4 items-center border-b border-white/5 last:border-0">
              <input className="col-span-4 bg-transparent text-xs font-bold text-white outline-none" value={f.food_name} onChange={e => { const n = [...foods]; n[i].food_name = e.target.value; setFoods(n); }} 
              // 엔터를 누르거나 입력창을 벗어날 때 검색 실행
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  fetchNutrition(i, f.food_name);
                }
              }}
              onBlur={() => fetchNutrition(i, f.food_name)} 
              placeholder="음식 이름 입력..."
              />
              <div className="col-span-5 flex justify-around text-[9px] font-black italic">
                <span className="text-blue-400">{Math.round(f.carbs)}</span>
                <span className="text-orange-400">{Math.round(f.protein)}</span>
                <span className="text-yellow-400">{Math.round(f.fat)}</span>
                <span className="text-white underline decoration-blue-500/50">{Math.round((f.calories * f.weight) / 100)}</span>
              </div>
              <div className="col-span-3 flex items-center justify-end">
                <input 
                  type="number" 
                  className="w-12 bg-transparent text-right text-xs font-black text-blue-500 outline-none" 
                  value={f.weight} 
                  onChange={e => handleWeightChange(i, e.target.value)} // 전용 함수 연결
                />
                <span className="text-[8px] text-slate-500 ml-1">g</span>
                <Trash2 size={12} className="ml-2 text-slate-700 cursor-pointer" onClick={() => setFoods(foods.filter(it => it.id !== f.id))} />
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <div className="bg-zinc-900 p-5 rounded-2xl border border-white/5 flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Energy</span>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black italic text-blue-500">{Math.round(totalKcal)}</span>
              <span className="text-xs font-bold text-slate-500">KCAL</span>
            </div>
          </div>
          <button onClick={handleFinalSave} className="w-full py-5 bg-blue-600 text-white font-black uppercase text-[12px] tracking-[0.2em] rounded-2xl active:scale-95 transition-all">식단 상세 저장 완료</button>
        </div>

        {/* --- AI 영양 피드백 구간 --- */}
        {totalKcal > 0 && (
          <div className="mx-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl mb-6">
            <div className="flex items-center gap-2 mb-1">
              <Star size={14} className="text-blue-500" />
              <span className="text-[10px] font-black text-blue-500 uppercase">AI Diet Feedback</span>
            </div>
            <p className="text-xs text-slate-300 font-medium">
              {totalKcal < 300 ? "에너지가 조금 낮아요. 견과류를 곁들여보세요!" : "균형 잡힌 식사입니다."}
            </p>
          </div>
        )}

        <div className="px-4 mb-6">
          <div className="flex gap-4 border-b border-white/5 mb-4">
            <button 
              onClick={() => setActiveTab("meal")}
              className={`pb-2 text-[10px] font-black uppercase ${activeTab === "meal" ? "text-blue-500 border-b-2 border-blue-500" : "text-slate-600"}`}
            >
              Meal Sets
            </button>
            <button 
              onClick={() => setActiveTab("snack")}
              className={`pb-2 text-[10px] font-black uppercase ${activeTab === "snack" ? "text-orange-500 border-b-2 border-orange-500" : "text-slate-600"}`}
            >
              Snack Sets
            </button>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-2">
            {favorites[activeTab]?.map((set, idx) => (
              <div key={idx} onClick={() => applyMealSet(set)} className="flex-none w-28 cursor-pointer">
                <div className="aspect-square rounded-2xl overflow-hidden bg-zinc-900 border border-white/10 mb-2">
                  <img src={set.image_url || "/default_food.png"} className="w-full h-full object-cover" />
                </div>
                <p className="text-[9px] font-bold text-center text-slate-400 truncate">
                  {set.items.map(i => i.food_name).join(", ")}
                </p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default DietAddPage;