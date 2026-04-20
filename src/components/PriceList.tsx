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
      className="max-w-6xl mx-auto px-6 py-10"
    >
      <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-[#53565b] mb-8 transition-colors tracking-widest">
        <ChevronLeft size={20} />
        <span>返回大廳</span>
      </button>

      <div className="mb-12">
        <SectionTitle className="!text-left !mb-2">價目與內容</SectionTitle>
        <p className="text-gray-500 tracking-widest">龍契局各項委託之明細說明</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#53565b] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 text-gray-400 border border-dashed border-gray-200 tracking-widest">
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
                    ? 'border-[#53565b] text-[#53565b] bg-[#53565b]/5' 
                    : 'border-transparent text-gray-400 hover:text-[#53565b] hover:bg-gray-50'
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
                  className="space-y-8"
                >
                  <div className="flex flex-col lg:flex-row gap-8">
                    {/* Image Area */}
                    <div className="flex-1">
                      <div className="w-full aspect-[4/3] bg-gray-50 border border-gray-200 p-2 overflow-hidden group flex items-center justify-center">
                        {activeItem.imageUrl ? (
                          <img loading="lazy" 
                            src={activeItem.imageUrl} 
                            alt={activeItem.title} 
                            crossOrigin="anonymous"
                            className="w-full h-full object-contain transition-transform duration-700 group-hover:scale-[1.02]"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300 tracking-widest text-sm">無圖片</div>
                        )}
                      </div>
                    </div>

                    {/* Text Area */}
                    <div className="flex-1 space-y-8">
                      <div>
                        <h3 className="text-3xl font-black tracking-widest text-[#53565b] mb-2">{activeItem.title}</h3>
                        <p className="text-xl font-bold tracking-widest text-gray-800">標準價格：{activeItem.price || '未定'}</p>
                      </div>

                      <div className="space-y-4">
                        <div className="w-full bg-gray-50 border border-gray-100 p-4 neo-box shadow-sm">
                          <p className="text-xs text-gray-400 tracking-widest mb-4 font-bold border-b border-gray-200 pb-2 inline-block">委託對應流程</p>
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
                                        <div className="w-8 h-8 rounded-full border-2 border-gray-300 bg-white flex items-center justify-center mb-2 shadow-sm transition-all duration-300 group-hover:border-[#53565b]">
                                          <div className="w-2.5 h-2.5 rounded-full bg-gray-200 group-hover:bg-[#53565b] transition-all duration-300" />
                                        </div>
                                        <span className="text-[11px] tracking-widest text-[#53565b] text-center font-bold">
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
