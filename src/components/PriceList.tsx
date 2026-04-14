import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import useEmblaCarousel from 'embla-carousel-react';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { SectionTitle } from './SectionTitle';

interface PriceListItem {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  order: number;
}

interface PriceListProps {
  onBack: () => void;
}

export default function PriceList({ onBack }: PriceListProps) {
  const [items, setItems] = useState<PriceListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });

  useEffect(() => {
    fetchPriceList();
  }, []);

  const fetchPriceList = async () => {
    try {
      const q = query(collection(db, 'priceList'), orderBy('order', 'asc'));
      const snap = await getDocs(q);
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data() } as PriceListItem)));
    } catch (err) {
      console.error('Fetch price list error:', err);
    } finally {
      setLoading(false);
    }
  };

  const scrollPrev = () => emblaApi && emblaApi.scrollPrev();
  const scrollNext = () => emblaApi && emblaApi.scrollNext();

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-5xl mx-auto px-6 py-10"
    >
      <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-[#53565b] mb-8 transition-colors tracking-widest">
        <ChevronLeft size={20} />
        <span>返回大廳</span>
      </button>

      <div className="text-center mb-12">
        <SectionTitle>價目表</SectionTitle>
        <p className="text-gray-500 tracking-widest">龍契局各項委託之代價與說明</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#53565b] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 text-gray-400 border-2 border-dashed border-gray-200 tracking-widest">
          目前尚無價目資訊。
        </div>
      ) : (
        <div className="relative">
          <div className="overflow-hidden" ref={emblaRef}>
            <div className="flex touch-pan-y">
              {items.map((item) => (
                <div key={item.id} className="flex-[0_0_100%] min-w-0 sm:flex-[0_0_80%] md:flex-[0_0_60%] lg:flex-[0_0_50%] pl-4">
                  <div className="window-box-octagon h-full flex flex-col">
                    <div className="w-full aspect-[4/3] bg-gray-100 mb-6 border-2 border-[#53565b] overflow-hidden relative group">
                      {item.imageUrl ? (
                        <img 
                          src={item.imageUrl} 
                          alt={item.title} 
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">無圖片</div>
                      )}
                    </div>
                    <h3 className="text-2xl font-black tracking-widest mb-4 border-b-2 border-[#53565b] pb-2 inline-block">{item.title}</h3>
                    <div className="text-sm tracking-widest leading-loose text-gray-600 whitespace-pre-wrap flex-1">
                      {item.description}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <button 
            onClick={scrollPrev}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 md:-translate-x-12 w-12 h-12 bg-[#fafafa] border-2 border-[#53565b] flex items-center justify-center hover:bg-[#53565b] hover:text-[#fafafa] transition-colors z-10"
          >
            <ChevronLeft size={24} />
          </button>
          <button 
            onClick={scrollNext}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 md:translate-x-12 w-12 h-12 bg-[#fafafa] border-2 border-[#53565b] flex items-center justify-center hover:bg-[#53565b] hover:text-[#fafafa] transition-colors z-10"
          >
            <ChevronRight size={24} />
          </button>
        </div>
      )}
    </motion.div>
  );
}
