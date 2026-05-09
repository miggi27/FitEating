import React, { useState, useEffect } from "react";
import { Camera, Trash2, Loader2, Star, Heart, X } from "lucide-react";
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
  const [dropdownList, setDropdownList] = useState({ index: null, results: [] });

  const generateId = () => `row-${Math.random().toString(36).substr(2, 9)}`;

  // 메모리 누수 방지
  useEffect(() => {
    return () => {
      if (preview && preview.startsWith('blob:')) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  // 데이터 로드
  useEffect(() => {
    const initPage = async () => {
      try {
        const favRes = await axios.get(`${API_BASE_URL}/diet/favorites`, { 
          headers: { Authorization: `Bearer ${token}` } 
        });
        setFavorites(favRes.data || { meal: [], snack: [] });

        const type = searchParams.get('type');
        const group = searchParams.get('group');
        const mode = searchParams.get('mode');

        if (mode !== 'new') {
          const res = await axios.get(`${API_BASE_URL}/diet/daily-summary`, { 
            headers: { Authorization: `Bearer ${token}` } 
          });
          const allLogs = res.data.logs || [];
          let targetItems = [];

          if (type === '간식' && group) {
            targetItems = allLogs.filter(l => l.meal_type === '간식' && l.entry_group_id === group);
          } else {
            targetItems = allLogs.filter(l => l.meal_type === type);
          }

          if (targetItems.length > 0) {
            if (targetItems[0].image_url) setPreview(targetItems[0].image_url);
            setFoods(targetItems.map(item => ({
              id: generateId(),
              food_name: item.food_name,
              calories: item.calories,
              carbs: item.carbs,
              protein: item.protein,
              fat: item.fat,
              weight: item.weight || 100
            })));
          }
        }
      } catch (err) { console.error(err); }
    };
    initPage();
  }, [token, searchParams]);

  // 빈 줄 자동 추가
  useEffect(() => {
    const lastRow = foods[foods.length - 1];
    if (!lastRow || (lastRow.food_name && lastRow.food_name.trim() !== "")) {
      setFoods(prev => [...prev, { 
        id: generateId(), food_name: "", calories: 0, carbs: 0, protein: 0, fat: 0, weight: 100 
      }]);
    }
  }, [foods]);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (preview && preview.startsWith('blob:')) URL.revokeObjectURL(preview);
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await axios.post(`${API_BASE_URL}/diet/analyze`, formData, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      const mapped = res.data.map((item, i) => ({ ...item, id: generateId() + i, weight: 100 }));
      setFoods(prev => [...prev.filter(f => f.food_name !== ""), ...mapped]);
    } catch (err) { alert("분석 실패"); } finally { setLoading(false); }
  };

  const fetchNutrition = async (index, name) => {
    if (!name.trim()) { setDropdownList({ index: null, results: [] }); return; }
    try {
      const res = await axios.get(`${API_BASE_URL}/diet/search-nutrition`, { 
        params: { name }, headers: { Authorization: `Bearer ${token}` } 
      });
      setDropdownList({ index, results: res.data || [] });
    } catch (err) { console.error(err); }
  };

  const selectFood = (index, foodData) => {
    const newFoods = [...foods];
    newFoods[index] = {
      ...newFoods[index],
      food_name: foodData.food_name,
      calories: foodData.kcal,
      carbs: foodData.carbs,
      protein: foodData.protein,
      fat: foodData.fat,
      weight: 100
    };
    setFoods(newFoods);
    setDropdownList({ index: null, results: [] });
  };

  const applyMealSet = (selectedSet) => {
    if (!window.confirm("선택한 세트로 식단을 교체할까요?")) return;
    setFoods(selectedSet.items.map(item => ({ ...item, id: generateId() })));
    setPreview(selectedSet.image_url);
  };

  const handleSave = async () => {
    const finalFoods = foods.filter(f => f.food_name && f.food_name.trim() !== "");
    if (finalFoods.length === 0) return alert("음식을 입력해주세요.");
    try {
      await axios.post(`${API_BASE_URL}/diet/record-many`, {
        meal_type: mealType,
        group_id: searchParams.get('group'),
        items: finalFoods,
        image_url: preview,
        save_as_favorite: isFavSet
      }, { headers: { Authorization: `Bearer ${token}` } });
      navigate('/diet');
    } catch (err) { alert("저장 실패"); }
  };

  const totalKcal = foods.reduce((sum, f) => sum + ((Number(f.calories) * (Number(f.weight) || 100)) / 100), 0);

  return (
    // 💡 해결 1: overflow-y-scroll과 scrollbar-gutter를 강제하여 스크롤바 유무에 상관없이 "폭"을 고정
    <div className="fixed inset-0 bg-[#0c0c0e] text-white overflow-y-scroll" style={{ scrollbarGutter: 'stable' }}>
      
      <div className="w-full max-w-6xl mx-auto min-h-screen flex flex-col">
        
        {/* 상단 헤더: max-width 내에서 좌우 여백 고정 */}
        <header className="w-full flex justify-between items-center p-6 border-b border-white/5 sticky top-0 bg-[#0c0c0e]/80 backdrop-blur-md z-[100]">
          <X onClick={() => navigate(-1)} className="text-slate-500 cursor-pointer hover:text-white transition-colors" size={24} />
          <h2 className="text-xs font-black text-blue-500 italic uppercase tracking-[0.3em]">{mealType} 상세 수정</h2>
          <div className="w-6"></div>
        </header>

        {/* 메인 컨텐츠 영역 */}
        <main className="flex-1 p-6 lg:p-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            
            {/* 좌측 섹션 (사진/에너지) - 고정 폭 유지 및 반응형 대응 */}
            <div className="lg:col-span-5 w-full space-y-6">
              <div className="relative aspect-square bg-[#16161a] rounded-[2.5rem] lg:rounded-[3rem] border border-white/5 overflow-hidden shadow-2xl">
                {preview ? (
                  <img src={preview} className="w-full h-full object-cover" alt="food" onError={(e) => e.target.src="/default_food.png"} />
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-800 text-[10px] font-black uppercase italic tracking-tighter">Image Needed</div>
                )}
                
                {loading && (
                  <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-20">
                    <Loader2 className="animate-spin text-blue-500 mb-3" size={32} />
                    <p className="text-[10px] font-black text-blue-500 tracking-widest">ANALYZING</p>
                  </div>
                )}

                {/* 사진 위 버튼 레이아웃 - 모바일에서 안 겹치게 조정 */}
                <div className="absolute bottom-4 right-4 lg:bottom-8 lg:right-8 flex gap-3 lg:gap-4">
                  <button 
                    onClick={() => setIsFavSet(!isFavSet)} 
                    className={`p-4 lg:p-5 rounded-2xl lg:rounded-3xl border transition-all ${isFavSet ? 'bg-red-500 border-red-400' : 'bg-black/60 border-white/10 backdrop-blur-md'}`}
                  >
                    <Heart size={20} fill={isFavSet ? "white" : "none"} />
                  </button>
                  <label className="p-4 lg:p-5 bg-blue-600 border border-blue-400 rounded-2xl lg:rounded-3xl cursor-pointer shadow-xl shadow-blue-600/30 active:scale-95">
                    <Camera size={20} />
                    <input type="file" className="hidden" accept="image/*" onChange={handleUpload} />
                  </label>
                </div>
              </div>

              {/* 💡 핵심 수정: 칼로리 요약 창 - 숨지 않고 반응하도록 설정 */}
              <div className="bg-[#16161a] p-8 lg:p-10 rounded-[2.5rem] lg:rounded-[3rem] border border-white/5 shadow-inner">
                <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-4">Total Energy Intake</p>
                <div className="flex items-baseline flex-wrap gap-2">
                  {/* 폰트 크기를 vw 단위나 반응형 클래스로 조절해서 창이 작아져도 삐져나가지 않게 함 */}
                  <span className="text-5xl md:text-6xl lg:text-7xl font-black italic text-blue-500 tracking-tighter transition-all">
                    {Math.round(totalKcal)}
                  </span>
                  <span className="text-sm lg:text-lg font-bold text-slate-500 italic uppercase">kcal</span>
                </div>
                
                {/* 모바일 전용 영양소 요약 (창이 작아졌을 때를 대비한 보너스) */}
                <div className="flex gap-4 mt-6 pt-6 border-t border-white/5 lg:hidden">
                  <div className="flex flex-col">
                    <span className="text-[8px] text-slate-600 font-bold uppercase">Carbs</span>
                    <span className="text-xs font-black text-blue-400">{Math.round(foods.reduce((s, f) => s + (f.carbs * f.weight / 100), 0))}g</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[8px] text-slate-600 font-bold uppercase">Prot</span>
                    <span className="text-xs font-black text-orange-400">{Math.round(foods.reduce((s, f) => s + (f.protein * f.weight / 100), 0))}g</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[8px] text-slate-600 font-bold uppercase">Fat</span>
                    <span className="text-xs font-black text-yellow-400">{Math.round(foods.reduce((s, f) => s + (f.fat * f.weight / 100), 0))}g</span>
                  </div>
                </div>
              </div>
            </div>




            {/* 우측 섹션 (음식 리스트/즐겨찾기) - 고정 폭 유지 */}
            <div className="lg:col-span-7 w-full space-y-10">
              <div className="bg-[#16161a] rounded-[2.5rem] border border-white/5 overflow-hidden">
                <div className="grid grid-cols-12 px-8 py-5 text-[10px] font-black text-slate-600 border-b border-white/5 uppercase bg-white/[0.02]">
                  <span className="col-span-5 text-blue-500">Nutrition / Name</span>
                  <span className="col-span-4 text-center">C / P / F / Kcal</span>
                  <span className="col-span-3 text-right">Weight</span>
                </div>
                
                <div className="divide-y divide-white/5 max-h-[400px] overflow-y-auto">
                  {foods.map((f, i) => (
                    <div key={f.id} className="grid grid-cols-12 px-8 py-6 items-center hover:bg-white/[0.01] group transition-colors">
                      <div className="col-span-5 relative">
                        <input className="w-full bg-transparent text-base font-bold text-white outline-none" value={f.food_name} onChange={e => { const n = [...foods]; n[i].food_name = e.target.value; setFoods(n); fetchNutrition(i, e.target.value); }} placeholder="음식명..." />
                        {dropdownList.index === i && dropdownList.results.length > 0 && (
                          <div className="absolute left-0 top-full z-[150] w-full bg-[#1c1c22] border border-blue-500/30 rounded-2xl mt-2 shadow-2xl overflow-hidden backdrop-blur-xl">
                            {dropdownList.results.map((item, idx) => (
                              <div key={`drop-${idx}`} className="px-5 py-4 hover:bg-blue-600 cursor-pointer border-b border-white/5 last:border-0" onClick={() => selectFood(i, item)}>
                                <div className="text-xs font-bold text-white">{item.food_name}</div>
                                <div className="text-[10px] text-slate-500 mt-1">{Math.round(item.kcal)}kcal</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="col-span-4 flex justify-around text-[11px] font-black italic tracking-tighter">
                        <span className="text-blue-400">{Math.round((f.carbs * f.weight) / 100)}</span>
                        <span className="text-orange-400">{Math.round((f.protein * f.weight) / 100)}</span>
                        <span className="text-yellow-400">{Math.round((f.fat * f.weight) / 100)}</span>
                        <span className="text-white underline decoration-blue-500/30">{Math.round((f.calories * f.weight) / 100)}</span>
                      </div>
                      <div className="col-span-3 flex items-center justify-end gap-4">
                        <input type="number" className="w-12 bg-transparent text-right text-sm font-black text-blue-500 outline-none" value={f.weight} onChange={e => { const n = [...foods]; n[i].weight = Number(e.target.value); setFoods(n); }} />
                        <Trash2 size={18} className="text-slate-800 hover:text-red-500 cursor-pointer transition-colors" onClick={() => setFoods(foods.filter(it => it.id !== f.id))} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button onClick={handleSave} className="w-full py-7 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase text-sm tracking-[0.4em] rounded-[2rem] shadow-2xl shadow-blue-600/20 transition-all active:scale-[0.98]">
                Complete Recording
              </button>

              {/* 즐겨찾기 - 절대 흔들리지 않게 고정 폭 설정 */}
              <section className="pt-6 w-full">
                <div className="flex gap-8 border-b border-white/5 mb-8 overflow-x-auto no-scrollbar">
                  {['meal', 'snack'].map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)} className={`pb-4 text-[11px] font-black uppercase tracking-[0.2em] transition-all whitespace-nowrap ${activeTab === tab ? "text-blue-500 border-b-2 border-blue-500" : "text-slate-600"}`}>
                      {tab === 'meal' ? 'Meal Sets' : 'Snack Sets'}
                    </button>
                  ))}
                </div>
                {/* 💡 해결 2: min-height와 grid-cols 고정을 통해 데이터가 적어도 영역이 안 무너지게 함 */}
                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-4 gap-6 min-h-[150px]">
                  {favorites[activeTab] && favorites[activeTab].length > 0 ? (
                    favorites[activeTab].map((set, idx) => (
                      <div key={`fav-${idx}`} onClick={() => applyMealSet(set)} className="group cursor-pointer">
                        <div className="aspect-square rounded-[2rem] overflow-hidden bg-zinc-900 border border-white/10 group-hover:border-blue-500/50 transition-all shadow-lg">
                          <img src={set.image_url || "/default_food.png"} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="fav" />
                        </div>
                        <p className="text-[10px] font-bold text-slate-600 mt-4 truncate text-center group-hover:text-white transition-colors">{set.items.map(i => i.food_name).join(", ")}</p>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full py-16 text-center border-2 border-dashed border-white/5 rounded-[3rem]">
                      <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest">No favorites registered</p>
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default DietAddPage;