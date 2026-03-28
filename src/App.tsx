/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, Download, RefreshCw, Type as TypeIcon, Hash, Image as ImageIcon, Loader2, ShoppingBag, ExternalLink, Copy, Check } from "lucide-react";
import { toPng, toBlob } from 'html-to-image';
import confetti from 'canvas-confetti';
import { CardNewsData } from './types';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default function App() {
  const [topic, setTopic] = useState('');
  const [count, setCount] = useState(5);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CardNewsData | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const generateContent = async () => {
    if (!topic) return;
    setLoading(true);
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: `"${topic}"와 관련된 한국에서 가장 인기 있고 평점이 높은 실제 상품들을 검색해 주세요.
        
        지침:
        1. 반드시 한국어로 답변하세요 (mainTitle, title, description, reason 모두 한국어).
        2. 구체적인 브랜드명이나 상품명을 사용하세요 (예: "서울우유 비요뜨", "3M 스카치브라이트 막대걸레").
        3. 실제 사용자 리뷰와 판매량을 바탕으로 "Top ${count}" 리스트를 생성하세요.
        4. **[이미지 검색 - 절대 필수]**: 
           - Google Search 도구를 사용하여 각 상품의 '실제 제품 사진'을 찾으세요.
           - 검색어 예: '[상품명] 실제 제품 사진', '[상품명] 쿠팡 썸네일'
           - **검색 결과(Grounding Metadata)에서 이미지 URL(.jpg, .png, .webp 등)을 반드시 추출하세요.**
           - 쿠팡('coupangcdn.com') 이미지를 최우선으로 하되, 없다면 네이버 쇼핑, 다나와, 공식몰 등 어디서든 **실제 제품이 찍힌 사진 URL**을 가져오세요.
           - **절대 빈 값이나 픽토그램, 풍경 사진을 반환하지 마세요.** 사용자는 100% 확률로 실제 제품 사진이 나오기를 원합니다.
           - 'imageUrl' 필드는 반드시 유효한 이미지 URL이어야 하며, 'http'는 'https'로 바꾸세요.
        5. 설명(description)은 실제 리뷰를 바탕으로 왜 인기 있는지 아주 짧게 요약하세요.
        
        중요: "Related Products" 리스트에는 반드시 Top 1 상품을 포함시켜 일관성을 유지하세요.
        
        출력은 다음 구조의 JSON이어야 합니다:
        1. 'mainTitle': 시선을 끄는 제목.
        2. 'items': 'number', 'title' (구체적 상품명), 'description' (리뷰 기반 요약), 'imageUrl' (쿠팡 상품 썸네일 이미지 URL)을 포함하는 객체 배열.
        3. 'relatedProducts': 'name'과 'reason'을 포함하는 3개의 객체 배열. Top 1 상품을 반드시 포함.
        
        카드 뉴스 형식에 맞게 설명은 매우 간결하게(최대 35자) 작성하세요.`,
        config: {
          tools: [{ googleSearch: {} }],
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
                    description: { type: Type.STRING },
                    imageUrl: { type: Type.STRING }
                  },
                  required: ["number", "title", "description", "imageUrl"]
                }
              },
              relatedProducts: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    reason: { type: Type.STRING }
                  },
                  required: ["name", "reason"]
                }
              }
            },
            required: ["mainTitle", "items", "relatedProducts"]
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
    setLoading(true);
    try {
      // Ensure images are loaded
      await new Promise(resolve => setTimeout(resolve, 800));

      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 3,
        backgroundColor: '#ffffff',
        skipFonts: true,
      });
      
      const link = document.createElement('a');
      link.download = `card-news-${topic.replace(/\s+/g, '-')}.png`;
      link.href = dataUrl;
      link.click();
      
      confetti({
        particleCount: 50,
        spread: 40,
        origin: { y: 0.8 }
      });
    } catch (err) {
      console.error('Download failed:', err);
      // Fallback to toBlob if toPng fails
      try {
        const blob = await toBlob(cardRef.current!, { cacheBust: true, pixelRatio: 2 });
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.download = `card-news-${topic.replace(/\s+/g, '-')}.png`;
          link.href = url;
          link.click();
          setTimeout(() => URL.revokeObjectURL(url), 100);
        }
      } catch (fallbackErr) {
        alert('이미지 생성 중 보안 오류가 발생했습니다. 브라우저를 새로고침하거나 잠시 후 다시 시도해 주세요.');
      }
    } finally {
      setLoading(false);
    }
  };

  const openCoupangSearch = (productName: string) => {
    const url = `https://www.coupang.com/np/search?q=${encodeURIComponent(productName)}`;
    window.open(url, '_blank');
  };

  const openCoupangPartners = (productName: string) => {
    // Coupang Partners search URL pattern
    const url = `https://partners.coupang.com/#/search/products?q=${encodeURIComponent(productName)}`;
    window.open(url, '_blank');
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans p-4 md:p-8">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Controls (4 columns) */}
        <div className="lg:col-span-4 space-y-6">
          <header className="space-y-2">
            <div className="flex items-center gap-2 text-indigo-600 font-bold text-xl">
              <Sparkles className="w-6 h-6" />
              <h1>AI 카드뉴스 & 파트너스</h1>
            </div>
            <p className="text-slate-500 text-sm">주제 입력 시 카드뉴스와 연관 상품을 함께 추천합니다.</p>
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
                placeholder="예: 홈트레이닝 필수템, 자취생 꿀템 등"
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
              {loading ? '생성 중...' : '카드뉴스 & 상품 생성'}
            </button>
          </div>

          {data && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100"
            >
              <h3 className="font-bold text-indigo-900 mb-2 flex items-center gap-2">
                <ImageIcon className="w-5 h-5" /> 이미지 저장
              </h3>
              <button
                onClick={downloadImage}
                className="w-full bg-white hover:bg-slate-50 text-indigo-600 font-bold py-3 rounded-xl border-2 border-indigo-200 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              >
                <Download className="w-5 h-5" /> PNG 다운로드
              </button>
            </motion.div>
          )}
        </div>

        {/* Middle: Preview (4 columns) */}
        <div className="lg:col-span-4 flex flex-col items-center">
          <h3 className="text-sm font-bold text-slate-400 mb-4 uppercase tracking-widest">Preview (1:1 Ratio)</h3>
          <AnimatePresence mode="wait">
            {data ? (
              <motion.div
                key="preview"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="sticky top-8"
              >
                {/* 1:1 Aspect Ratio Container (400x400) */}
                <div 
                  ref={cardRef}
                  className="w-[400px] h-[400px] bg-white instagram-shadow overflow-hidden flex flex-col font-sans relative"
                >
                  <div className="h-2 bg-indigo-600 w-full shrink-0" />
                  <div className="p-1.5 flex-1 flex flex-col card-news-gradient overflow-hidden">
                    <div className="mb-1 text-center space-y-0 shrink-0">
                      <div className="inline-block bg-indigo-600 text-white text-[7px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest mb-0.5">
                        Top {data.items.length} List
                      </div>
                      <h2 className="text-lg font-black text-slate-900 leading-tight break-keep">
                        {data.mainTitle}
                      </h2>
                    </div>
 
                    <div className="flex-1 flex flex-col justify-between space-y-0.5 overflow-hidden py-0.5">
                      {data.items.map((item, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className="flex items-center gap-3 bg-white/95 backdrop-blur-sm p-2.5 rounded-2xl border border-indigo-50 shadow-md shrink min-h-0"
                        >
                          <div className="w-7 h-7 bg-indigo-600 text-white flex items-center justify-center font-black text-sm rounded-xl shrink-0 shadow-sm">
                            {item.number}
                          </div>
                          
                          {item.imageUrl ? (
                            <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-slate-100 bg-white shadow-sm relative">
                              <img 
                                // 1st Attempt: wsrv.nl proxy
                                src={`https://wsrv.nl/?url=${encodeURIComponent(item.imageUrl)}&w=300&h=300&fit=cover&n=-1`}
                                alt={item.title} 
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                                crossOrigin="anonymous" 
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  // 2nd Attempt: images.weserv.nl (fallback proxy)
                                  if (target.src.includes('wsrv.nl')) {
                                    target.src = `https://images.weserv.nl/?url=${encodeURIComponent(item.imageUrl)}&w=300&h=300&fit=cover`;
                                  } 
                                  // 3rd Attempt: Direct URL (last resort)
                                  else if (target.src.includes('weserv.nl')) {
                                    target.src = item.imageUrl;
                                  }
                                  // Final Fallback: Shopping Bag (only if everything fails)
                                  else {
                                    target.src = "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&h=200&fit=crop&q=80";
                                  }
                                }}
                              />
                            </div>
                          ) : (
                            <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200">
                              <ShoppingBag className="w-6 h-6 text-slate-300" />
                            </div>
                          )}

                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-slate-900 text-[13px] truncate leading-tight break-keep">{item.title}</h4>
                            <p className="text-[10px] text-slate-500 leading-tight font-medium line-clamp-2 mt-0.5">
                              {item.description}
                            </p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
 
                    <div className="mt-1 pt-1 flex justify-between items-center border-t border-indigo-100/50 shrink-0">
                      <div className="flex items-center gap-1">
                        <div className="w-3.5 h-3.5 bg-indigo-600 rounded-full flex items-center justify-center">
                          <Sparkles className="w-1.5 h-1.5 text-white" />
                        </div>
                        <span className="text-[8px] font-bold text-indigo-600 uppercase tracking-tighter">AI Card News</span>
                      </div>
                      <div className="text-[7px] text-slate-400 font-medium">
                        generated by Gemini
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="w-[400px] h-[400px] border-4 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center text-slate-400 p-8 text-center bg-white">
                <ImageIcon className="w-12 h-12 mb-4 opacity-10" />
                <p className="text-sm font-medium">카드뉴스 미리보기 (1:1)</p>
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Side: Coupang Partners (4 columns) */}
        <div className="lg:col-span-4 space-y-6">
          <h3 className="text-sm font-bold text-slate-400 mb-4 uppercase tracking-widest">Coupang Partners</h3>
          <AnimatePresence>
            {data ? (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100">
                  <div className="flex items-center gap-2 text-orange-600 font-bold mb-3">
                    <ShoppingBag className="w-5 h-5" />
                    <h4>추천 연관 상품</h4>
                  </div>
                  <div className="space-y-3">
                    {data.relatedProducts.map((product, idx) => (
                      <div key={idx} className="bg-white p-4 rounded-xl shadow-sm border border-orange-100 space-y-3">
                        <div>
                          <h5 className="font-bold text-slate-900 text-sm mb-1">{product.name}</h5>
                          <p className="text-xs text-slate-500 leading-relaxed">{product.reason}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-2">
                          <button
                            onClick={() => openCoupangSearch(product.name)}
                            className="flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold rounded-lg transition-colors"
                          >
                            <ExternalLink className="w-3 h-3" /> 쿠팡 검색
                          </button>
                          <button
                            onClick={() => openCoupangPartners(product.name)}
                            className="flex items-center justify-center gap-1.5 py-2 px-3 bg-orange-500 hover:bg-orange-600 text-white text-[11px] font-bold rounded-lg transition-colors shadow-sm"
                          >
                            <ShoppingBag className="w-3 h-3" /> 링크 만들기
                          </button>
                        </div>
                        <button
                          onClick={() => copyToClipboard(product.name, idx)}
                          className="w-full flex items-center justify-center gap-1.5 py-2 text-slate-400 hover:text-indigo-600 text-[10px] font-medium transition-colors border-t border-slate-50"
                        >
                          {copiedIndex === idx ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          {copiedIndex === idx ? '복사됨!' : '상품명 복사'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="bg-slate-800 p-5 rounded-2xl text-white space-y-3">
                  <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tip</h5>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    '링크 만들기' 버튼을 누르면 쿠팡 파트너스 대시보드로 이동합니다. 복사한 상품명을 검색창에 붙여넣어 본인만의 수익 링크를 생성하세요!
                  </p>
                </div>
              </motion.div>
            ) : (
              <div className="bg-white p-8 rounded-3xl border-2 border-slate-100 flex flex-col items-center justify-center text-center text-slate-400">
                <ShoppingBag className="w-12 h-12 mb-4 opacity-10" />
                <p className="text-sm">주제를 입력하면 수익 창출을 위한<br/>연관 상품을 추천해 드립니다.</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
