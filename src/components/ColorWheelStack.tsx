import React, { useState } from 'react';
import { cn } from '../lib/utils';
import { X, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ColorWheelProps {
  colorWheels: any[];
}

const polarToCartesian = (cx: number, cy: number, r: number, angleDef: number) => {
  const rad = (angleDef - 90) * Math.PI / 180.0;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad)
  };
};

const getWedgePath = (cx: number, cy: number, r: number, startAngle: number, endAngle: number) => {
  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, endAngle);
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 0 1 ${end.x} ${end.y} Z`;
};

export default function ColorWheelStack({ colorWheels }: ColorWheelProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [activeWheelId, setActiveWheelId] = useState<string | null>(null);
  const [activeWedgeIndex, setActiveWedgeIndex] = useState<number | null>(null);

  const cx = 150;
  const cy = 150;
  const r = 150;

  const handleWheelClick = (id: string) => {
    setActiveWheelId(id);
    setActiveWedgeIndex(null);
  };

  const handleWedgeClick = (e: React.MouseEvent, wheelId: string, index: number) => {
    if (activeWheelId === wheelId) {
      e.stopPropagation();
      setActiveWedgeIndex(index);
    }
  };

  const closeDeconstruction = () => {
    setActiveWheelId(null);
    setActiveWedgeIndex(null);
  };

  const closeWedge = () => {
    setActiveWedgeIndex(null);
  };

  // 0, 7 or 1, 6 are left/right etc.
  // indices: 
  // 0: 12 to 1:30 (top right) -> align right
  // 1: 1:30 to 3:00 (right) -> align right
  // 2: 3:00 to 4:30 (bottom right) -> align right
  // 3: 4:30 to 6:00 (bottom right) -> align right
  // 4: 6:00 to 7:30 (bottom left) -> align left
  // 5: 7:30 to 9:00 (left) -> align left
  // 6: 9:00 to 10:30 (top left) -> align left
  // 7: 10:30 to 12:00 (top left) -> align left
  const getAlignment = (index: number) => {
    if (index >= 0 && index <= 3) return 'right';
    return 'left';
  };

  return (
    <div className="w-full flex justify-center py-16 mb-16 overflow-hidden relative min-h-[400px]">
      <AnimatePresence>
        {!activeWheelId && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex justify-center items-center max-w-full overflow-x-auto px-10 py-10"
          >
            {colorWheels.map((wheel, index) => {
              const isHovered = hoveredId === wheel.id;
              
              return (
                <div
                  key={wheel.id}
                  className="relative cursor-pointer transition-all duration-[400ms] ease-out"
                  style={{
                    marginLeft: index === 0 ? '0' : '-160px',
                    zIndex: isHovered ? 50 : index,
                  }}
                  onMouseEnter={() => setHoveredId(wheel.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={() => handleWheelClick(wheel.id)}
                >
                  <div 
                    className={cn(
                      "w-[300px] h-[300px] sm:w-[320px] sm:h-[320px] rounded-full transition-all duration-[400ms] ease-out relative",
                      isHovered 
                        ? "scale-110 -translate-y-8 shadow-[0_20px_40px_rgba(0,0,0,0.4)]" 
                        : "scale-100 shadow-[-10px_0_20px_rgba(0,0,0,0.3)]"
                    )}
                  >
                    <svg viewBox="0 0 300 300" className="w-full h-full drop-shadow-xl" style={{ filter: "drop-shadow(0px 0px 10px rgba(0,0,0,0.5))" }}>
                      <defs>
                        {wheel.project_images?.map((img: string, i: number) => (
                          <pattern key={i} id={`pat-${wheel.id}-${i}`} patternUnits="userSpaceOnUse" width="300" height="300">
                            <image href={img} width="300" height="300" preserveAspectRatio="xMidYMid slice" crossOrigin="anonymous" />
                          </pattern>
                        ))}
                      </defs>
                      <circle cx={cx} cy={cy} r={r} fill="#1a1a1a" />
                      {wheel.project_images?.map((img: string, i: number) => {
                        const startAngle = i * 45 + 1;
                        const endAngle = (i + 1) * 45 - 2;
                        return (
                          <path 
                            key={i} 
                            d={getWedgePath(cx, cy, r, startAngle, endAngle)} 
                            fill={img ? `url(#pat-${wheel.id}-${i})` : '#333'} 
                            className="transition-all duration-300"
                          />
                        );
                      })}
                      <circle cx={cx} cy={cy} r={50} fill="white" />
                    </svg>
                    
                    {/* Center Circle Text */}
                    <div className="absolute inset-0 m-auto w-[100px] h-[100px] rounded-full flex justify-center items-center z-10 pointer-events-none p-2">
                      <span className="font-black text-center text-[10px] text-[#53565b] leading-tight tracking-widest break-words">
                        {wheel.project_name}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Deconstruction Mode */}
      <AnimatePresence>
        {activeWheelId && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md"
            onClick={closeDeconstruction}
          >
            <button 
              className="absolute top-6 left-6 text-white/50 hover:text-white transition-colors z-[60] flex items-center gap-2 tracking-widest"
              onClick={closeDeconstruction}
            >
              <ChevronLeft size={24} /> 返回色環堆疊
            </button>

            {(() => {
              const wheel = colorWheels.find(w => w.id === activeWheelId);
              if (!wheel) return null;

              return (
                <div 
                  className={cn("relative transition-all duration-700 ease-out", activeWedgeIndex !== null ? "w-0 h-0 opacity-0" : "w-[400px] h-[400px] md:w-[600px] md:h-[600px]")}
                  onClick={(e) => e.stopPropagation()}
                >
                  <svg viewBox="0 0 300 300" className="w-full h-full overflow-visible">
                    <defs>
                      {wheel.project_images?.map((img: string, i: number) => (
                        <pattern key={i} id={`pat-active-${wheel.id}-${i}`} patternUnits="userSpaceOnUse" width="300" height="300">
                          <image href={img} width="300" height="300" preserveAspectRatio="xMidYMid slice" crossOrigin="anonymous" />
                        </pattern>
                      ))}
                    </defs>
                    <circle cx={cx} cy={cy} r={r} fill="transparent" />
                    {wheel.project_images?.map((img: string, i: number) => {
                      const startAngle = i * 45 + 1;
                      const endAngle = (i + 1) * 45 - 2;
                      const isHoveredWedge = hoveredId === `wedge-${i}`;
                      const displacement = isHoveredWedge ? 10 : 0;
                      // Move wedge outward slightly on hover
                      const midAngle = (startAngle + endAngle) / 2;
                      const dx = displacement * Math.cos((midAngle - 90) * Math.PI / 180);
                      const dy = displacement * Math.sin((midAngle - 90) * Math.PI / 180);

                      return (
                        <path 
                          key={i} 
                          d={getWedgePath(cx, cy, r, startAngle, endAngle)} 
                          fill={img ? `url(#pat-active-${wheel.id}-${i})` : '#333'} 
                          className="cursor-pointer transition-all duration-300 transform-gpu hover:brightness-110 hover:shadow-2xl"
                          style={{
                            transform: `translate(${dx}px, ${dy}px)`
                          }}
                          onMouseEnter={() => setHoveredId(`wedge-${i}`)}
                          onMouseLeave={() => setHoveredId(null)}
                          onClick={(e) => handleWedgeClick(e, wheel.id, i)}
                        />
                      );
                    })}
                    <circle cx={cx} cy={cy} r={45} fill="#fafafa" className="pointer-events-none shadow-2xl" />
                  </svg>
                  
                  <div className="absolute inset-0 m-auto w-[90px] h-[90px] rounded-full flex justify-center items-center z-10 pointer-events-none p-1">
                    <span className="font-black text-center text-[10px] md:text-sm text-[#53565b] leading-tight tracking-widest break-words pointer-events-none">
                      {wheel.project_name}
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* Expended Image */}
            <AnimatePresence>
              {activeWedgeIndex !== null && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[70] flex items-center p-4 md:p-12 bg-black/90"
                  onClick={closeWedge}
                  style={{
                    justifyContent: getAlignment(activeWedgeIndex) === 'left' ? 'flex-start' : 'flex-end'
                  }}
                >
                  <button 
                    className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors z-[80]"
                    onClick={closeWedge}
                  >
                    <X size={40} />
                  </button>
                  
                  {(() => {
                    const wheel = colorWheels.find(w => w.id === activeWheelId);
                    if (!wheel) return null;
                    const imgUrl = wheel.project_images?.[activeWedgeIndex];
                    if (!imgUrl) return null;

                    return (
                      <motion.div 
                        initial={{ opacity: 0, x: getAlignment(activeWedgeIndex) === 'left' ? -50 : 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: getAlignment(activeWedgeIndex) === 'left' ? -50 : 50 }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                        className="relative max-w-[80vw] max-h-[90vh] overflow-hidden rounded-lg shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/10"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <img 
                          src={imgUrl} 
                          alt={`expanded-${activeWedgeIndex}`} 
                          className="w-full h-full object-contain"
                          crossOrigin="anonymous"
                        />
                      </motion.div>
                    );
                  })()}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
