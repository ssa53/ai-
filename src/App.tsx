/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, Download, RefreshCw, Type as TypeIcon, Hash, Image as ImageIcon, Loader2, ChevronRight } from "lucide-react";
import { toPng } from 'html-to-image';
import confetti from 'canvas-confetti';
import { CardNewsData } from './types';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default function App() {
  const [topic, setTopic] = useState('');
  const [count, setCount] = useState(5);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CardNewsData | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const generateContent = async () => {
    if (!topic) return;
    setLoading(true);
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Generate a "Top ${count}" list about "${topic}" in Korean. 
        The output should be a JSON object with a 'mainTitle' and an 'items' array.
        Each item in 'items' should have 'number', 'title' (short and catchy), and 'description' (a brief explanation).
        Make it sound professional yet engaging, like a popular social media post.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              mainTitle: { type: Type.STRING },
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    number: { type: Type.NUMBER },
                    title: { type: Type.STRING },
                    description: { type: Type.STRING }
                  },
                  required: ["number", "title", "description"]
                }
              }
            },
            required: ["mainTitle", "items"]
          }
        }
      });

      const result = JSON.parse(response.text);
      setData(result);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (error) {
      console.error("Generation failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const downloadImage = async () => {
    if (cardRef.current === null) return;
    try {
      const dataUrl = await toPng(cardRef.current, { cacheBust: true });
      const link = document.createElement('a');
      link.download = `card-news-${topic.replace(/\s+/g, '-')}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans p-4 md:p-8">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left Side: Controls */}
        <div className="space-y-6">
          <header className="space-y-2">
            <div className="flex items-center gap-2 text-indigo-600 font-bold text-xl">
              <Sparkles className="w-6 h-6" />
              <h1>AI 카드뉴스 생성기</h1>
            </div>
            <p className="text-slate-500">주제와 개수만 입력하면 AI가 멋진 카드뉴스를 만들어줍니다.</p>
          </header>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <TypeIcon className="w-4 h-4" /> 주제 입력
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="예: 부자가 되기 위한 습관, 서울 맛집 등"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Hash className="w-4 h-4" /> 항목 개수
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="3"
                  max="10"
                  value={count}
                  onChange={(e) => setCount(parseInt(e.target.value))}
                  className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <span className="font-bold text-indigo-600 w-8">{count}개</span>
              </div>
            </div>

            <button
              onClick={generateContent}
              disabled={loading || !topic}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-200 active:scale-[0.98]"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <RefreshCw className="w-5 h-5" />
              )}
              {loading ? '생성 중...' : '카드뉴스 생성하기'}
            </button>
          </div>

          {data && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100"
            >
              <h3 className="font-bold text-indigo-900 mb-2 flex items-center gap-2">
                <ImageIcon className="w-5 h-5" /> 미리보기 및 다운로드
              </h3>
              <p className="text-indigo-700 text-sm mb-4">우측의 미리보기를 확인하고 아래 버튼을 눌러 이미지로 저장하세요.</p>
              <button
                onClick={downloadImage}
                className="w-full bg-white hover:bg-slate-50 text-indigo-600 font-bold py-3 rounded-xl border-2 border-indigo-200 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              >
                <Download className="w-5 h-5" /> 이미지 다운로드 (.PNG)
              </button>
            </motion.div>
          )}
        </div>

        {/* Right Side: Preview */}
        <div className="flex justify-center items-start">
          <AnimatePresence mode="wait">
            {data ? (
              <motion.div
                key="preview"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="sticky top-8"
              >
                {/* The Card News UI */}
                <div 
                  ref={cardRef}
                  className="w-[400px] min-h-[600px] bg-white instagram-shadow overflow-hidden flex flex-col font-sans"
                  style={{ backgroundColor: '#ffffff' }}
                >
                  {/* Header Decoration */}
                  <div className="h-2 bg-indigo-600 w-full" />
                  
                  <div className="p-6 flex-1 flex flex-col card-news-gradient">
                    {/* Title Section */}
                    <div className="mb-8 text-center space-y-2">
                      <div className="inline-block bg-indigo-600 text-white text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest mb-2">
                        Top {data.items.length} List
                      </div>
                      <h2 className="text-3xl font-black text-slate-900 leading-tight break-keep">
                        {data.mainTitle}
                      </h2>
                    </div>

                    {/* Items List */}
                    <div className="space-y-3">
                      {data.items.map((item, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          className="flex items-stretch gap-3 group"
                        >
                          <div className="w-10 h-10 bg-indigo-600 text-white flex items-center justify-center font-black text-xl rounded-lg shrink-0 shadow-md">
                            {item.number}
                          </div>
                          <div className="bg-white/80 backdrop-blur-sm p-3 rounded-lg border border-indigo-100 flex-1 shadow-sm group-hover:bg-white transition-colors">
                            <h4 className="font-bold text-slate-900 text-sm mb-1">{item.title}</h4>
                            <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                              {item.description}
                            </p>
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    {/* Footer */}
                    <div className="mt-auto pt-8 flex justify-between items-center border-t border-indigo-100/50">
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center">
                          <Sparkles className="w-3 h-3 text-white" />
                        </div>
                        <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-tighter">AI Card News</span>
                      </div>
                      <div className="text-[9px] text-slate-400 font-medium">
                        generated by Google Gemini
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="w-[400px] h-[600px] border-4 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center text-slate-400 p-8 text-center"
              >
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                  <ImageIcon className="w-10 h-10" />
                </div>
                <h3 className="font-bold text-slate-500 mb-2">미리보기가 여기에 표시됩니다</h3>
                <p className="text-sm">주제를 입력하고 생성 버튼을 누르면 인스타그램 스타일의 카드뉴스가 나타납니다.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
