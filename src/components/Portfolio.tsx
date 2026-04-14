import React from 'react';
import { motion } from 'motion/react';
import { ChevronLeft } from 'lucide-react';

interface PortfolioProps {
  onBack: () => void;
}

const WORKS = [
  { id: 1, title: 'Void', category: 'Full Body', url: 'https://picsum.photos/seed/monochrome1/800/1000' },
  { id: 2, title: 'Silence', category: 'Avatar', url: 'https://picsum.photos/seed/monochrome2/800/800' },
  { id: 3, title: 'Echo', category: 'Illustration', url: 'https://picsum.photos/seed/monochrome3/1000/800' },
  { id: 4, title: 'Shadow', category: 'Half Body', url: 'https://picsum.photos/seed/monochrome4/800/1000' },
  { id: 5, title: 'Light', category: 'Illustration', url: 'https://picsum.photos/seed/monochrome5/1000/1200' },
  { id: 6, title: 'Lines', category: 'Avatar', url: 'https://picsum.photos/seed/monochrome6/800/800' },
];

export default function Portfolio({ onBack }: PortfolioProps) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-7xl mx-auto px-6 py-10"
    >
      <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-black mb-8 transition-colors">
        <ChevronLeft size={20} />
        <span>返回首頁</span>
      </button>

      <div className="flex justify-between items-end mb-12">
        <h2 className="text-4xl font-bold tracking-tight">作品集</h2>
        <p className="text-gray-400 text-sm uppercase tracking-widest">Selected Works</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {WORKS.map((work, index) => (
          <motion.div 
            key={work.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="group cursor-pointer"
          >
            <div className="relative aspect-[4/5] overflow-hidden bg-gray-100 mb-4">
              <img 
                src={work.url} 
                alt={work.title} 
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700 ease-in-out" 
              />
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </div>
            <div className="flex justify-between items-center">
              <h3 className="font-bold uppercase tracking-widest text-sm">{work.title}</h3>
              <span className="text-xs text-gray-400">{work.category}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
