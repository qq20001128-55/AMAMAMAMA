import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { collection, query, orderBy, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { cn } from '../lib/utils';
import { X, ChevronLeft } from 'lucide-react';
import { SectionTitle } from './SectionTitle';

interface PortfolioProps {
  onBack: () => void;
}

export default function Portfolio({ onBack }: PortfolioProps) {
  const [categories, setCategories] = useState<any[]>([]);
  const [artworks, setArtworks] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const catSnap = await getDocs(query(collection(db, 'portfolioCategories'), orderBy('order', 'asc')));
        setCategories(catSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        let artSnap;
        try {
          artSnap = await getDocs(query(collection(db, 'artworks'), orderBy('createdAt', 'desc')));
        } catch (err) {
          console.warn('Failed to order artworks by createdAt, falling back to unordered fetch:', err);
          artSnap = await getDocs(collection(db, 'artworks'));
        }
        setArtworks(artSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error('Fetch portfolio error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredArtworks = activeCategory === 'all' 
    ? artworks 
    : artworks.filter(a => a.categoryId === activeCategory);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-20 text-center">
        <div className="w-8 h-8 border-4 border-[#53565b] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="tracking-widest text-gray-500">載入中...</p>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-7xl mx-auto px-6 py-10"
    >
      <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-[#53565b] mb-8 transition-colors tracking-widest">
        <ChevronLeft size={20} />
        <span>返回大廳</span>
      </button>

      <div className="flex justify-between items-end mb-12">
        <SectionTitle className="!mb-0">作品集</SectionTitle>
        <p className="text-gray-400 text-sm uppercase tracking-widest">Selected Works</p>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-4 mb-12">
        <button
          onClick={() => setActiveCategory('all')}
          className={cn(
            "px-6 py-2 tracking-widest text-sm transition-colors",
            activeCategory === 'all' ? "bg-[#53565b] text-[#fafafa]" : "border-2 border-[#53565b] hover:bg-gray-100"
          )}
        >
          全部
        </button>
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={cn(
              "px-6 py-2 tracking-widest text-sm transition-colors",
              activeCategory === cat.id ? "bg-[#53565b] text-[#fafafa]" : "border-2 border-[#53565b] hover:bg-gray-100"
            )}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Artworks Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredArtworks.map(art => (
          <motion.div 
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-50px" }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.5 }}
            key={art.id} 
            className="relative aspect-[3/4] cursor-pointer group overflow-hidden border-2 border-transparent hover:border-[#53565b] transition-colors"
            onClick={() => setLightboxImage(art.imageUrl)}
          >
            <img loading="lazy" 
              src={art.imageUrl} 
              alt={art.title}
              crossOrigin="anonymous"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 pointer-events-none" />
          </motion.div>
        ))}
      </div>

      {filteredArtworks.length === 0 && (
        <div className="text-center py-20 text-gray-400 tracking-widest border-2 border-dashed border-gray-200">
          此分類尚無作品。
        </div>
      )}

      {/* Lightbox Modal */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-10 bg-black/60 backdrop-blur-sm"
          onClick={() => setLightboxImage(null)}
        >
          <button 
            className="absolute top-6 right-6 text-[#53565b] hover:text-gray-500 transition-colors z-10"
            onClick={() => setLightboxImage(null)}
          >
            <X size={32} />
          </button>
          <div className="relative max-w-full max-h-full" onClick={(e) => e.stopPropagation()}>
            <img loading="lazy" 
              src={lightboxImage} 
              alt="Full size artwork"
              crossOrigin="anonymous"
              className="max-w-full max-h-[90vh] object-contain shadow-2xl border-4 border-[#53565b]"
            />
          </div>
        </div>
      )}
    </motion.div>
  );
}
