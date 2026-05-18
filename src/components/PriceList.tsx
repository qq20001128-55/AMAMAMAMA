import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
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
  imageUrl?: string;
  imageUrls?: string[];
  order: number;
}

const PriceImageCarousel = ({ images, title }: { images: string[], title: string }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [expand, setExpand] = useState(false);

  if (images.length === 0) {
    return <div className="w-full h-48 flex items-center justify-center text-gray-300 tracking-widest text-sm bg-[var(--box-bg-color,#1a1a1a)] border border-[var(--border-color,#374151)]">無圖片</div>;
  }

  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const handlePrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div className="relative group w-full bg-[var(--box-bg-color,#1a1a1a)] border border-[var(--border-color,#374151)] p-2 overflow-hidden shadow-xl">
       <div 
         className="cursor-pointer flex items-center justify-center min-h-[300px] relative overflow-hidden"
         onClick={() => setExpand(true)}
       >
         <AnimatePresence mode="wait">
            <motion.img
              key={currentIndex}
              src={images[currentIndex]}
              alt={`${title} ${currentIndex + 1}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="w-full h-auto object-contain max-h-[70vh]"
              crossOrigin="anonymous"
            />
         </AnimatePresence>

         {/* Mobile Swipe Overlay */}
         <div 
           className="absolute inset-0 z-10 md:hidden"
           onTouchStart={(e) => {
             const touch = e.touches[0];
             const startX = touch.clientX;
             const handleTouchEnd = (ee: TouchEvent) => {
               const endX = ee.changedTouches[0].clientX;
               if (startX - endX > 50) handleNext();
               if (endX - startX > 50) handlePrev();
               document.removeEventListener('touchend', handleTouchEnd);
             };
             document.addEventListener('touchend', handleTouchEnd);
           }}
         />
       </div>

       {images.length > 1 && (
         <>
           {/* Desktop Arrows (shown on hover) */}
           <button 
             onClick={handlePrev}
             className="absolute left-6 top-1/2 -translate-y-1/2 z-20 bg-black/60 text-white p-3 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 hidden md:flex items-center justify-center hover:bg-[var(--theme-color,#d4af37)] hover:scale-110 active:scale-95"
           >
             <ChevronLeft size={24} />
           </button>
           <button 
             onClick={handleNext}
             className="absolute right-6 top-1/2 -translate-y-1/2 z-20 bg-black/60 text-white p-3 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 hidden md:flex items-center justify-center hover:bg-[var(--theme-color,#d4af37)] hover:scale-110 active:scale-95"
           >
             <ChevronRight size={24} />
           </button>

           {/* Indicators */}
           <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-20">
              {images.map((_, i) => (
                <button 
                  key={i} 
                  onClick={(e) => { e.stopPropagation(); setCurrentIndex(i); }}
                  className={`w-2 h-2 rounded-full transition-all ${i === currentIndex ? 'bg-[var(--theme-color,#d4af37)] w-6' : 'bg-white/40 hover:bg-white/60'}`} 
                />
              ))}
           </div>
         </>
       )}

       {/* Fullscreen Overlay */}
       <AnimatePresence>
         {expand && (
           <motion.div 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
             className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 md:p-12 cursor-default"
             onClick={() => setExpand(false)}
           >
             <button className="absolute top-8 right-8 text-white/50 hover:text-white transition-colors z-[110]">
               <X size={40} strokeWidth={1} />
             </button>

             <div className="relative w-full h-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                <motion.img 
                  key={currentIndex}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  src={images[currentIndex]} 
                  alt={title} 
                  className="max-w-full max-h-full object-contain shadow-2xl"
                  crossOrigin="anonymous" 
                />
                
                {images.length > 1 && (
                  <>
                    <button 
                      onClick={handlePrev}
                      className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/5 hover:bg-white/10 text-white p-6 rounded-full transition-all hidden md:block border border-white/10"
                    >
                      <ChevronLeft size={60} strokeWidth={1} />
                    </button>
                    <button 
                      onClick={handleNext}
                      className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/5 hover:bg-white/10 text-white p-6 rounded-full transition-all hidden md:block border border-white/10"
                    >
                      <ChevronRight size={60} strokeWidth={1} />
                    </button>
                    
                    {/* Fullscreen Mobile Swipe */}
                    <div 
                       className="absolute inset-0 z-10 md:hidden"
                       onTouchStart={(e) => {
                         const touch = e.touches[0];
                         const startX = touch.clientX;
                         const handleTouchEnd = (ee: TouchEvent) => {
                           const endX = ee.changedTouches[0].clientX;
                           if (startX - endX > 50) handleNext();
                           if (endX - startX > 50) handlePrev();
                           document.removeEventListener('touchend', handleTouchEnd);
                         };
                         document.addEventListener('touchend', handleTouchEnd);
                       }}
                     />
                  </>
                )}
             </div>
           </motion.div>
         )}
       </AnimatePresence>
    </div>
  );
};

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
        <p className="text-[var(--text-muted,#6b7280)] tracking-widest">龍契局各項委託之明細說明</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-[var(--theme-color,#d4af37)] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 text-[var(--text-muted,#9ca3af)] border border-dashed border-[var(--border-color,#374151)] tracking-widest">
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
                    : 'border-transparent text-[var(--text-muted,#9ca3af)] hover:text-[var(--theme-color,#d4af37)] hover:bg-[var(--box-bg-color,#1a1a1a)]'
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
                       <PriceImageCarousel 
                         images={activeItem.imageUrls || (activeItem.imageUrl ? [activeItem.imageUrl] : [])} 
                         title={activeItem.title} 
                       />
                    </div>

                    {/* Content Area */}
                    <div className="w-full space-y-8">
                      <div className="space-y-4">
                        <div className="w-full bg-[var(--box-bg-color,#1a1a1a)] border border-[var(--border-color,#1f2937)] p-4 neo-box shadow-sm">
                          <p className="text-xs text-[var(--text-muted,#9ca3af)] tracking-widest mb-4 font-bold border-b border-[var(--border-color,#374151)] pb-2 inline-block">委託對應流程</p>
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
                                        <div className="w-8 h-8 rounded-full border border-[var(--theme-color,#d4af37)]/30 bg-[var(--box-bg-color,#121212)] flex items-center justify-center mb-2 shadow-sm transition-all duration-300 group-hover:border-[var(--theme-color,#d4af37)]">
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
                          <p className="text-xs text-[var(--text-muted,#9ca3af)] tracking-widest mb-2">委託內容</p>
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
