import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft } from 'lucide-react';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { SectionTitle } from './SectionTitle';
import { WORKFLOW_OPTIONS, getWorkflowNodes } from '../lib/utils';

export interface PriceListItem {
  id: string;
  title: string;       // 項目
  price: string;       // 價格
  workflow: string;    // 流程
  description: string; // 內容
  imageUrl: string;
  order: number;
}

interface PriceListProps {
  onBack: () => void;
}

export default function PriceList({ onBack }: PriceListProps) {
  const [items, setItems] = useState<PriceListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeItem, setActiveItem] = useState<PriceListItem | null>(null);

  useEffect(() => {
    fetchPriceList();
  }, []);

  const fetchPriceList = async () => {
    try {
      const q = query(collection(db, 'priceList'), orderBy('order', 'asc'));
      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as PriceListItem));
      setItems(data);
      if (data.length > 0) setActiveItem(data[0]);
    } catch (err) {
      console.error('Fetch price list error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full max-w-full mx-auto px-6 lg:px-12 xl:px-24 py-10"
    >
      

      <div className="mb-12">
        <SectionTitle className="!text-left !mb-2">價目與內容</SectionTitle>
        <p className="text-gray-500 tracking-widest">龍契局各項委託之明細說明</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-[var(--theme-color,#d4af37)] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 text-gray-400 border border-dashed border-gray-700 tracking-widest">
          目前尚無價目資訊。
        </div>
      ) : (
        <div className="flex flex-col md:flex-row gap-12 items-start">
          
          {/* Left Menu */}
          <div className="w-full md:w-64 flex flex-col gap-2 shrink-0">
            {items.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveItem(item)}
                className={`text-left px-6 py-4 tracking-widest transition-all duration-300 font-bold border-l-4 ${
                  activeItem?.id === item.id 
                    ? 'border-[var(--theme-color,#d4af37)] text-[var(--theme-color,#d4af37)] bg-[var(--theme-color,#d4af37)]/5' 
                    : 'border-transparent text-gray-400 hover:text-[var(--theme-color,#d4af37)] hover:bg-[#1a1a1a]'
                }`}
              >
                {item.title}
              </button>
            ))}
          </div>

          {/* Right Content */}
          <div className="flex-1 w-full min-h-[500px] relative">
            <AnimatePresence mode="wait">
              {activeItem && (
                <motion.div
                  key={activeItem.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.4 }}
                  className="w-full space-y-8"
                >
                  <div className="flex flex-col gap-8">
                    {/* Header Area */}
                    <div>
                      <h3 className="text-3xl font-black tracking-widest text-[var(--theme-color,#d4af37)] mb-2">{activeItem.title}</h3>
                      <p className="text-xl font-bold tracking-widest text-gray-200">標準價格：{activeItem.price || '未定'}</p>
                    </div>

                    {/* Image Area */}
                    <div className="w-full">
                      <div className="w-full bg-[#1a1a1a] border border-gray-700 p-2 overflow-hidden group flex items-center justify-center">
                        {activeItem.imageUrl ? (
                          <img loading="lazy" 
                            src={activeItem.imageUrl} 
                            alt={activeItem.title} 
                            crossOrigin="anonymous"
                            className="w-full object-contain"
                          />
                        ) : (
                          <div className="w-full h-48 flex items-center justify-center text-gray-300 tracking-widest text-sm">無圖片</div>
                        )}
                      </div>
                    </div>

                    {/* Content Area */}
                    <div className="w-full space-y-8">
                      <div className="space-y-4">
                        <div className="w-full bg-[#1a1a1a] border border-gray-800 p-4 neo-box shadow-sm">
                          <p className="text-xs text-gray-400 tracking-widest mb-4 font-bold border-b border-gray-700 pb-2 inline-block">委託對應流程</p>
                          <div className="relative pt-2 pb-2 overflow-x-auto">
                            {(() => {
                              const nodes = getWorkflowNodes(activeItem.workflow);
                              return (
                                <div className="min-w-[400px] relative px-4">
                                  {/* Progress Line */}
                                  <div className="absolute top-[15px] left-10 right-10 h-0.5 bg-gray-300 -z-10" />
                                  <div className="flex justify-between relative z-0">
                                    {nodes.map((node, i) => (
                                      <div key={node.id} className="flex flex-col items-center group w-16">
                                        <div className="w-8 h-8 rounded-full border border-[var(--theme-color,#d4af37)]/30 bg-[#121212] flex items-center justify-center mb-2 shadow-sm transition-all duration-300 group-hover:border-[var(--theme-color,#d4af37)]">
                                          <div className="w-2.5 h-2.5 rounded-full bg-[var(--theme-color,#d4af37)]/20 group-hover:bg-[var(--theme-color,#d4af37)] transition-all duration-300" />
                                        </div>
                                        <span className="text-[11px] tracking-widest text-[var(--theme-color,#d4af37)] text-center font-bold">
                                          {node.label}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                        
                        <div>
                          <p className="text-xs text-gray-400 tracking-widest mb-2">委託內容</p>
                          <p className="text-sm tracking-widest leading-loose text-gray-600 whitespace-pre-wrap">
                            {activeItem.description || '無詳細說明'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
    </motion.div>
  );
}
