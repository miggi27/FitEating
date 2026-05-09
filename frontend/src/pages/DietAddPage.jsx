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
  const [searchResults, setSearchResults] = useState([]); // 검색 결과 임시 저장
  // 1. 검색 결과 리스트를 담을 상태 추가
  const [dropdownList, setDropdownList] = useState({ index: null, results: [] });

  const generateId = () => `row-${Math.random().toString(36).substr(2, 9)}`;

  // 1. 기존 데이터를 서버에서 가져오는 함수 정의
  const fetchExistingData = async (type, group) => {
    const token = localStorage.getItem('token');
    try {
      const res = await axios.get(`${API_BASE_URL}/diet/daily-summary`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // 전체 데이터 중 현재 수정하려는 타입(아침/점심/저녁) 또는 그룹(간식)만 필터링
      const allLogs = res.data.logs || [];
      let targetItems = [];

      if (type === '간식' && group) {
        // 간식은 group_id가 일치하는 것들만 모음
        targetItems = allLogs.filter(l => l.meal_type === '간식' && l.entry_group_id === group);
      } else {
        // 아침, 점심, 저녁은 해당 타입만 모음
        targetItems = allLogs.filter(l => l.meal_type === type);
      }

      // 서버에 데이터가 있다면 입력창(foods)에 넣어줌
      if (targetItems.length > 0) {
        const formatted = targetItems.map(item => ({
          food_name: item.food_name,
          calories: item.calories,
          carbs: item.carbs,
          protein: item.protein,
          fat: item.fat,
          weight: item.weight
        }));
        setFoods(formatted);
      }
    } catch (err) {
      console.error("기존 데이터 로드 실패", err);
    }
  };

  // 데이터 로드 시
  useEffect(() => {
    const fetchFavs = async () => {
      const res = await axios.get(`${API_BASE_URL}/diet/favorites`, { headers: { Authorization: `Bearer ${token}` } });
      setFavorites(res.data);
    };
    fetchFavs();
  }, [token]);

  // 즐겨찾기 세트 클릭 시: 사진 + 음식 리스트 + 그람수 통째로 복원
  const applyMealSet = (selectedSet) => {
    if (!window.confirm("선택한 세트로 식단을 교체할까요?")) return;
    
    const restored = selectedSet.items.map(item => ({
      ...item,
      id: generateId()
    }));
    
    setFoods(restored); // 음식 리스트 & 그람수 복원
    setPreview(selectedSet.image_url); // 사진 복원
  };

  // 즐겨찾기 목록 가져오기, 수정시 기존 식단 기록 가져오기
  // useEffect(() => {
  //   const initPage = async () => {
  //     try {
  //       const favRes = await axios.get(`${API_BASE_URL}/diet/favorites`, { headers: { Authorization: `Bearer ${token}` } });
  //       setFavorites(favRes.data || []);

  //       const res = await axios.get(`${API_BASE_URL}/diet/daily-summary`, { headers: { Authorization: `Bearer ${token}` } });
  //       const currentLogs = res.data.logs.filter(l => l.meal_type === mealType);
        
  //       if (currentLogs.length > 0) {
  //         // 수정 시 사진 복원 핵심 로직
  //         if (currentLogs[0].image_url) setPreview(currentLogs[0].image_url);
  //         setFoods(currentLogs.map(f => ({ ...f, id: f.id || generateId(), weight: f.weight || 100 })));
  //       }
  //     } catch (err) { console.error("로드 실패", err); }
  //   };
  //   initPage();
  // }, [token, mealType]);

  // 2. 페이지가 열릴 때 실행되는 로직
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const type = params.get('type');
    const group = params.get('group');
    const mode = params.get('mode');

    if (mode === 'new') {
      // 🟢 '새로운 간식 추가' 버튼으로 온 경우: 빈 입력창으로 시작
      setFoods([{ food_name: '', calories: 0, carbs: 0, protein: 0, fat: 0, weight: 100 }]);
    } else {
      // 🟢 기존 데이터를 수정하러 온 경우: 위에서 만든 함수 실행
      fetchExistingData(type, group);
    }
  }, []);

  // 음식을 추가할수 있도록 자동 줄 추가 로직
  useEffect(() => {
    const lastRow = foods[foods.length - 1];
    if (!lastRow || (lastRow.food_name && lastRow.food_name.trim() !== "")) {
      setFoods(prev => [...prev, { id: generateId(), food_name: "", calories: 0, carbs: 0, protein: 0, fat: 0, weight: 100 }]);
    }
  }, [foods]);

  // 분석 보내기
  const handleUpload = async (e) => {
    // 1. 선택한 파일 가져오기
    const file = e.target.files[0];
    if (!file) return;
    // 2. 미리보기 생성 (임시 주소 blob:...)
    // 여기서 만든 주소가 새로고침하면 사라지는 그 주소입니다!
    setPreview(URL.createObjectURL(file));
    setLoading(true); // 로딩 스피너 시작
    try {
      // 3. 서버로 보낼 '택배 박스(FormData)' 만들기
      const formData = new FormData();
      formData.append("file", file); // 박스에 'file'이라는 이름으로 담기
      // 4. FastAPI 서버로 전송 (이미지 분석 요청)
      const res = await axios.post(`${API_BASE_URL}/diet/analyze`, formData, { headers: { Authorization: `Bearer ${token}` } });
      // 5. 서버가 분석해서 보내준 음식 데이터 가공
      // 예: [{food_name: "사과", calories: 52}, ...]
      // 리액트가 식별할 고유 ID 부여   // 기본 수량 100g 설정
      const mapped = res.data.map((item, i) => ({ ...item, id: generateId() + i, weight: 100 }));
      // 6. 기존 리스트에 분석된 음식 추가 (빈 줄은 제거)
      setFoods(prev => [...prev.filter(f => f.food_name !== ""), ...mapped]);
    } catch (err) { alert("분석 실패"); } finally { setLoading(false); } // 성공하든 실패하든 로딩 종료
  };

  // 사용자가 입력한 모든 음식 리스트와 이미지 주소를 묶어서 서버로 보내는 역할
  const handleFinalSave = async () => {
    // 1. 유효성 검사: 음식 이름이 있는 것만 골라냅니다 (빈 줄 제외)
    const finalFoods = foods.filter(f => f.food_name && f.food_name.trim() !== "");
    try {
      // 2. 서버에 데이터 전송
      await axios.post(`${API_BASE_URL}/diet/record-many`, {
      meal_type: mealType,   // 아침, 점심, 저녁 등 구분
      items: finalFoods,     // 필터링된 음식 배열
      image_url: preview,    // 현재 미리보기 주소 (여기서 blob이 저장됨)
      save_as_favorite: isFavSet // 즐겨찾기 등록 여부 (Heart 아이콘 상태)
    }, { 
      headers: { Authorization: `Bearer ${token}` } // "나 로그인한 사용자야"라고 증명
    });
      // 3. 저장이 성공하면 식단 메인 페이지로 이동
      navigate('/diet');
    } catch (err) { alert("저장 실패"); }
  };

  // reduce 함수를 써서 배열의 모든 값을 하나로 합칩니다.
  // 기본 칼로리는 100g 기준이라고 가정하고, 사용자가 입력한 weight를 곱해 계산합니다.
  // 공식: (100g당 칼로리 * 현재 입력한 그람수) / 100
  const totalKcal = foods.reduce((sum, f) => sum + ((f.calories * (f.weight || 100)) / 100), 0);

  // 영양 정보 검색 - 음식 추가시 영양 성분을 DB에서 찾아오는 역할
  // const fetchNutrition = async (index, name) => {
  //   if (!name.trim()) return;

  //   try {
  //     // 1. 백엔드에 음식 이름으로 영양 정보 검색 요청
  //     const res = await axios.get(`${API_BASE_URL}/diet/search-nutrition`, {
  //       params: { name: name },
  //       headers: { Authorization: `Bearer ${token}` }
  //     });

  //     // 2. 서버 응답 데이터 확인 (targetData 추출)
  //     const data = res.data;
  //     let targetData = null;

  //     if (Array.isArray(data) && data.length > 0) {
  //       // 결과가 리스트로 오면 정확히 일치하는 것 찾기
  //       const exactMatch = data.find(f => f.food_name === name);
  //       targetData = exactMatch || data[0];
  //     } else if (data && data.food_name) {
  //       // 결과가 객체 하나로 오면 바로 사용
  //       targetData = data;
  //     }

  //     // 3. 데이터가 존재할 때만 화면 업데이트
  //     if (targetData) {
  //       const newFoods = [...foods];
  //       newFoods[index] = {
  //         ...newFoods[index], // 기존 ID 유지
  //         food_name: targetData.food_name,
  //         calories: targetData.kcal || targetData.calories || 0,
  //         carbs: targetData.carbs || 0,
  //         protein: targetData.protein || 0,
  //         fat: targetData.fat || 0,
  //         weight: newFoods[index].weight || 100 // 기존 입력한 무게 유지
  //       };
  //       setFoods(newFoods);
  //     }
  //   } catch (err) {
  //     console.error("영양 정보 검색 실패", err);
  //   }
  // };

  // 1. 검색어 입력 시 목록을 가져오는 함수
  const fetchNutrition = async (index, name) => {
    if (!name.trim()) {
      setDropdownList({ index: null, results: [] });
      return;
    }
    
    try {
      const res = await axios.get(`${API_BASE_URL}/diet/search-nutrition`, {
        params: { name: name },
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.data && res.data.length > 0) {
        // 검색 결과가 있으면 해당 줄(index)에 드롭다운 표시
        setDropdownList({ index, results: res.data });
      } else {
        setDropdownList({ index: null, results: [] });
      }
    } catch (err) {
      console.error("검색 실패", err);
    }
  };

  // 2. 드롭다운에서 음식을 클릭했을 때 실행되는 함수
  const selectFood = (index, foodData) => {
    const newFoods = [...foods];
    newFoods[index] = {
      ...newFoods[index],
      food_name: foodData.food_name,
      calories: foodData.kcal,
      carbs: foodData.carbs,
      protein: foodData.protein,
      fat: foodData.fat,
      weight: 100 // 기본 무게 설정
    };
    setFoods(newFoods);
    setDropdownList({ index: null, results: [] }); // 드롭다운 닫기
  };

  // 1. 그람수 변경 핸들러
  const handleWeightChange = (index, value) => {
    const newFoods = [...foods];
    // 입력값(value)은 문자열로 들어오기 때문에 Number()를 써서 숫자로 바꿔줍니다.
    newFoods[index].weight = Number(value); // 숫자로 변환하여 저장
    setFoods(newFoods); // 바뀐 무게가 적용되면 totalKcal도 자동으로 재계산됨
  };

  const addFavoriteToFoods = (fav) => {
    setFoods(prev => [
      ...prev.filter(f => f.food_name !== ""), // 빈 줄 제거
      { ...fav, id: generateId(), weight: 100 }
    ]);
    setShowFavs(false); // 창 닫기
  };

  // 2. 저장 함수 수정 (말줄임표 제거 및 필드명 매칭)
const handleSave = async () => {
  const token = localStorage.getItem('token');
  const params = new URLSearchParams(window.location.search);
  const type = params.get('type');
  const groupId = params.get('group');

  // 음식 이름이 있는 것만 필터링
  const finalFoods = foods.filter(f => f.food_name && f.food_name.trim() !== "");

  if (finalFoods.length === 0) {
    alert("기록할 음식을 입력해주세요.");
    return;
  }

  const payload = {
    meal_type: type,
    group_id: groupId,
    items: finalFoods.map(f => ({
      food_name: f.food_name,
      calories: f.calories, // 🟢 f.kcal 대신 f.calories 사용
      carbs: f.carbs,
      protein: f.protein,
      fat: f.fat,
      weight: f.weight
    })),
    image_url: preview, // 사진 주소 포함
    save_as_favorite: isFavSet
  };

  try {
    await axios.post(`${API_BASE_URL}/diet/record-many`, payload, {
      headers: { Authorization: `Bearer ${token}` }
    });
    navigate('/diet');
  } catch (err) {
    console.error("저장 실패:", err);
    alert("식단 저장 중 오류가 발생했습니다.");
  }
};

  return (
    <div className="h-screen bg-[#0c0c0e] text-white overflow-y-auto pb-40">
      <div className="flex justify-between items-center p-4 border-b border-white/5">
        <X onClick={() => navigate(-1)} className="text-slate-500 cursor-pointer" size={20} />
        <h2 className="text-xs font-black text-blue-500 italic uppercase tracking-widest">{mealType} 상세 수정</h2>
        <div className="w-5"></div>
      </div>
      
      {/* --- 음식 사진 표시 --- */}
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

        {/* --- 음식명, 탄단지칼, 그람수 표시 --- */}
        <div className="bg-[#16161a] rounded-3xl border border-white/5">
          <div className="grid grid-cols-12 px-4 py-2 text-[8px] font-black text-slate-600 border-b border-white/5 uppercase bg-white/5">
            <span className="col-span-4 text-blue-500">Food Name</span>
            <span className="col-span-5 text-center">C / P / F / Kcal</span>
            <span className="col-span-3 text-right">Gram</span>
          </div>
          {foods.map((f, i) => (
            <div key={f.id} className="grid grid-cols-12 px-4 py-4 items-center border-b border-white/5 last:border-0">

              {/* <input className="col-span-4 bg-transparent text-xs font-bold text-white outline-none" value={f.food_name} onChange={e => { const n = [...foods]; n[i].food_name = e.target.value; setFoods(n); }} 
              // 엔터를 누르거나 입력창을 벗어날 때 검색 실행
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  fetchNutrition(i, f.food_name);
                }
              }}
              onBlur={() => fetchNutrition(i, f.food_name)} 
              placeholder="음식 이름 입력..."
              /> */}

              <div className="col-span-4 relative"> {/* relative 추가 */}
                <input 
                  className="w-full bg-transparent text-xs font-bold text-white outline-none" 
                  value={f.food_name} 
                  onChange={e => { 
                    const n = [...foods]; 
                    n[i].food_name = e.target.value; 
                    setFoods(n); 
                    fetchNutrition(i, e.target.value); // 입력할 때마다 검색
                  }} 
                  placeholder="음식 이름 입력..."
                />
                
                {/* 드롭다운 UI: 현재 수정 중인 줄(i)일 때만 표시 */}
                {dropdownList.index === i && dropdownList.results.length > 0 && (
                  <div className="absolute left-0 top-full z-[999] w-full bg-[#1c1c22] border border-blue-500/30 rounded-xl mt-2 shadow-[0_10px_40px_rgba(0,0,0,0.2)] max-h-60 overflow-y-auto">
                    {dropdownList.results.map((item, idx) => (
                      <div 
                        key={idx}
                        className="px-4 py-3 hover:bg-blue-600 active:bg-blue-700 cursor-pointer text-[11px] border-b border-white/5 last:border-0"
                        onClick={() => selectFood(i, item)}
                      >
                        <div className="font-bold text-white">{item.food_name}</div>
                        <div className="text-[9px] text-slate-400">
                          {Math.round(item.kcal)}kcal | 탄:{Math.round(item.carbs)} 단:{Math.round(item.protein)} 지:{Math.round(item.fat)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="col-span-5 flex justify-around text-[9px] font-black italic">
                {/* --- 탄단지칼 계산 --- */}
                <span className="text-blue-400">{Math.round((Number(f.carbs) * Number(f.weight || 100)) / 100)}</span>
                <span className="text-orange-400">{Math.round((Number(f.protein) * Number(f.weight || 100)) / 100)}</span>
                <span className="text-yellow-400">{Math.round((Number(f.fat) * Number(f.weight || 100)) / 100)}</span>
                <span className="text-white underline decoration-blue-500/50">{Math.round((Number(f.calories) * Number(f.weight || 100)) / 100)}</span>
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

        {/* --- 총합 칼로리 표시 --- */}
        <div className="space-y-4">
          <div className="bg-zinc-900 p-5 rounded-2xl border border-white/5 flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Energy</span>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black italic text-blue-500">{Math.round(totalKcal)}</span>
              <span className="text-xs font-bold text-slate-500">KCAL</span>
            </div>
          </div>
          {/* --- 음식 세트 저장 버튼 --- */}
          <button 
            onClick={handleSave} 
            className="w-full py-5 bg-blue-600 text-white font-black uppercase text-[12px] tracking-[0.2em] rounded-2xl active:scale-95 transition-all"
          >
            식단 상세 저장 완료
          </button>
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

        {/* --- 즐겨찾기 --- */}
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