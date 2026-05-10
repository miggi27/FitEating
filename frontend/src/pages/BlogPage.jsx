import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../api/config';
import { Calendar, Activity, Utensils, MessageSquare, ChevronRight } from 'lucide-react';

const BlogPage = ({ theme }) => {
  const [history, setHistory] = useState([]); // 일기 리스트 데이터
  const [isLoading, setIsLoading] = useState(true);

  // 임시 데이터 (나중에 백엔드 API 연결)
  useEffect(() => {
    const dummyData = [
      {
        id: 1,
        date: '2026.05.10',
        title: '오운완! 스쿼트 자세가 점점 좋아진다.',
        exercise_feedback: '무릎이 앞으로 쏠리는 현상이 개선되었습니다. 엉덩이를 뒤로 더 빼는 동작이 아주 좋습니다.',
        diet_summary: '2,100kcal (탄 200g, 단 150g, 지 60g)',
        ai_overall: '단백질 섭취량이 목표치를 달성했습니다. 근성장에 아주 유리한 하루였네요!',
        emoji: '🔥'
      },
      {
        id: 2,
        date: '2026.05.09',
        title: '식단 조절이 조금 힘들었던 토요일',
        exercise_feedback: '푸쉬업 시 가동 범위가 짧습니다. 조금 더 깊게 내려가 보세요.',
        diet_summary: '2,450kcal (탄 310g, 단 120g, 지 85g)',
        ai_overall: '나트륨 섭취가 다소 높습니다. 내일은 칼륨이 풍부한 채소를 더 챙겨 드세요.',
        emoji: '🍕'
      }
    ];
    setHistory(dummyData);
    setIsLoading(false);
  }, []);

  return (
    <div className="fixed inset-0 bg-[#0c0c0e] text-white overflow-y-scroll" style={{ scrollbarGutter: 'stable' }}>
      {/* 폭을 다른 페이지와 동일하게 max-w-6xl로 설정 */}
      <div className="w-full max-w-6xl mx-auto min-h-screen flex flex-col pb-40">
        
        {/* 상단 헤더 */}
        <header className="w-full flex justify-between items-center p-6 border-b border-white/5 sticky top-0 bg-[#0c0c0e]/80 backdrop-blur-md z-[100]">
          <div className="w-6"></div>
          <h2 className="text-[10px] font-black text-blue-500 italic uppercase tracking-[0.3em]">Fitness & Diet Journal</h2>
          <div className="w-6"></div>
        </header>

        <main className="p-6 lg:p-10 space-y-12">
          {/* 타이틀 섹션 */}
          <section className="space-y-2">
            <h1 className="text-4xl font-black italic tracking-tighter uppercase">My Daily Fitness Log</h1>
            <p className="text-slate-500 text-sm font-bold uppercase tracking-widest">과거의 나를 이기기 위한 기록</p>
          </section>

          {/* 일기 리스트 섹션 */}
          <section className="space-y-6">
            {history.map((post) => (
              <div 
                key={post.id} 
                className="group bg-[#16161a] border border-white/5 rounded-[3rem] p-8 hover:border-blue-500/30 transition-all cursor-pointer relative overflow-hidden"
              >
                {/* 날짜 및 이모지 */}
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-600/10 p-3 rounded-2xl">
                      <Calendar className="text-blue-500" size={18} />
                    </div>
                    <span className="text-sm font-black text-slate-400">{post.date}</span>
                  </div>
                  <span className="text-3xl">{post.emoji}</span>
                </div>

                {/* 제목 */}
                <h3 className="text-2xl font-black mb-6 group-hover:text-blue-500 transition-colors">{post.title}</h3>

                {/* 요약 컨텐츠 그리드 */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-6 border-t border-white/5">
                  
                  {/* 1. 운동 피드백 (영상 분석 결과 저장용) */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-orange-500">
                      <Activity size={14} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Exercise Feedback</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed italic line-clamp-2">
                      {post.exercise_feedback}
                    </p>
                  </div>

                  {/* 2. 식단 요약 */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-green-500">
                      <Utensils size={14} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Diet Summary</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed font-bold">
                      {post.diet_summary}
                    </p>
                  </div>

                  {/* 3. AI 총평 (Gemma 피드백 저장용) */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-blue-500">
                      <MessageSquare size={14} />
                      <span className="text-[10px] font-black uppercase tracking-widest">AI Trainer's Note</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed italic line-clamp-2 bg-blue-500/5 p-3 rounded-2xl border border-blue-500/10">
                      "{post.ai_overall}"
                    </p>
                  </div>
                </div>

                {/* 상세보기 화살표 */}
                <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                  <ChevronRight size={32} className="text-blue-500/50" />
                </div>
              </div>
            ))}
          </section>

          {/* 더 보기 버튼 */}
          <button className="w-full py-6 rounded-[2rem] border-2 border-dashed border-white/5 text-slate-600 font-black uppercase tracking-widest hover:border-blue-500/30 hover:text-blue-500 transition-all">
            Load More History
          </button>
        </main>
      </div>
    </div>
  );
};

export default BlogPage;