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

const getAnnularWedgePath = (cx: number, cy: number, inR: number, outR: number, startAngle: number, endAngle: number) => {
  const outStart = polarToCartesian(cx, cy, outR, startAngle);
  const outEnd = polarToCartesian(cx, cy, outR, endAngle);
  const inStart = polarToCartesian(cx, cy, inR, startAngle);
  const inEnd = polarToCartesian(cx, cy, inR, endAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

  // Clockwise outer arc (1), counter-clockwise inner arc (0)
  return `M ${outStart.x} ${outStart.y} A ${outR} ${outR} 0 ${largeArcFlag} 1 ${outEnd.x} ${outEnd.y} L ${inEnd.x} ${inEnd.y} A ${inR} ${inR} 0 ${largeArcFlag} 0 ${inStart.x} ${inStart.y} Z`;
};

export default function ColorWheelStack({ colorWheels }: ColorWheelProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [activeWheelId, setActiveWheelId] = useState<string | null>(null);
  const [activeWedgeIndex, setActiveWedgeIndex] = useState<number | null>(null);

  const cx = 150;
  const cy = 150;
  const r = 150;
  const innerR = 85; // Controls the size of the transparent text hole in the middle

  const handleWheelClick = (id: string) => {
    setActiveWheelId(id);
    setActiveWedgeIndex(null);
  };

  const handleWedgeClick = (e: React.MouseEvent, wheelId: string, index: number) => {
    if (activeWheelId === wheelId) {
      e.stopPropagation();
      setActiveWedgeIndex(activeWedgeIndex === index ? null : index);
    }
  };

  const closeDeconstruction = () => {
    setActiveWheelId(null);
    setActiveWedgeIndex(null);
  };

  const closeWedge = () => {
    setActiveWedgeIndex(null);
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
                    marginLeft: index === 0 ? '0' : '-120px', // slightly tighter stack
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
                        ? "scale-110 -translate-y-8 shadow-[0_10px_25px_rgba(0,0,0,0.4)]" 
                        : "scale-100 shadow-[-5px_0_15px_rgba(0,0,0,0.3)]"
                    )}
                    style={{ backgroundColor: 'transparent' }}
                  >
                    <svg viewBox="0 0 300 300" className="w-full h-full overflow-visible">
                      <defs>
                        {wheel.project_images?.map((img: string, i: number) => (
                          <pattern key={i} id={`pat-${wheel.id}-${i}`} patternUnits="userSpaceOnUse" width="300" height="300">
                            <image href={img} width="300" height="300" preserveAspectRatio="xMidYMid slice" crossOrigin="anonymous" />
                          </pattern>
                        ))}
                      </defs>
                      <g style={{ filter: "drop-shadow(0px 0px 2px rgba(0,0,0,0.3))" }}>
                        {wheel.project_images?.map((img: string, i: number) => {
                          const startAngle = i * 45 + 1; // 1 degree gap
                          const endAngle = (i + 1) * 45 - 2; // Extra gap
                          return (
                            <path 
                              key={i} 
                              d={getAnnularWedgePath(cx, cy, innerR, r, startAngle, endAngle)} 
                              fill={img ? `url(#pat-${wheel.id}-${i})` : 'rgba(255,255,255,0.05)'} 
                              className="transition-all duration-300"
                            />
                          );
                        })}
                      </g>
                    </svg>
                    
                    {/* Floating Center Text */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex justify-center items-center z-10 w-[140px] pointer-events-none">
                      <span className="font-black text-center text-xs md:text-sm text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] leading-tight tracking-widest break-words pointer-events-none">
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
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} // smooth apple-like ease
            className="fixed inset-0 z-[100] flex bg-black/95 backdrop-blur-xl"
            onClick={closeDeconstruction}
          >
            {/* Go Back Header */}
            <button 
              className="absolute top-6 left-6 text-white/50 hover:text-white transition-colors z-[120] flex items-center gap-2 tracking-widest uppercase text-sm"
              onClick={closeDeconstruction}
            >
              <ChevronLeft size={20} /> 返回作品輪盤
            </button>

            {/* Right Side Expended Image Board */}
            <AnimatePresence>
              {activeWedgeIndex !== null && (
                <motion.div 
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 50 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="absolute right-0 top-0 bottom-0 w-full md:w-[60%] flex items-center justify-center p-6 md:p-12 z-[90] bg-gradient-to-l from-black/90 via-black/50 to-transparent pointer-events-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button 
                    className="absolute top-8 right-8 text-white/50 hover:text-white transition-colors z-[100] bg-black/40 hover:bg-black/60 backdrop-blur rounded-full p-2"
                    onClick={closeWedge}
                  >
                    <X size={24} />
                  </button>
                  {(() => {
                    const wheel = colorWheels.find(w => w.id === activeWheelId);
                    if (!wheel) return null;
                    const imgUrl = wheel.project_images?.[activeWedgeIndex];
                    if (!imgUrl) return null;
                    return (
                      <div className="relative w-full h-full flex items-center justify-center lg:items-center max-h-[90vh]">
                        <img 
                          src={imgUrl} 
                          alt={`expanded-${activeWedgeIndex}`} 
                          className="max-w-full max-h-full object-contain rounded-lg drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/5"
                          crossOrigin="anonymous"
                        />
                      </div>
                    );
                  })()}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Centered / Left-Shifted Expanded Wheel */}
            {(() => {
              const wheel = colorWheels.find(w => w.id === activeWheelId);
              if (!wheel) return null;

              return (
                <div 
                  className="absolute top-1/2 left-1/2 transition-all duration-[800ms] ease-in-out pointer-events-none"
                  style={{
                    transform: activeWedgeIndex !== null 
                      ? 'translate(-50%, -50%) scale(0.85)' 
                      : 'translate(-50%, -50%) scale(1)',
                    width: 'clamp(280px, 80vmin, 550px)',
                    height: 'clamp(280px, 80vmin, 550px)',
                    zIndex: 110 // Above the background container but below the right image close button
                  }}
                >
                  <div className="w-full h-full relative pointer-events-auto" onClick={e => e.stopPropagation()}>
                    <svg viewBox="-20 -20 340 340" className="w-full h-full overflow-visible drop-shadow-[0_0_10px_rgba(0,0,0,0.4)]">
                      <defs>
                        {wheel.project_images?.map((img: string, i: number) => (
                          <pattern key={i} id={`pat-active-${wheel.id}-${i}`} patternUnits="userSpaceOnUse" width="300" height="300">
                            <image href={img} width="300" height="300" preserveAspectRatio="xMidYMid slice" crossOrigin="anonymous" />
                          </pattern>
                        ))}
                      </defs>
                      {wheel.project_images?.map((img: string, i: number) => {
                        const startAngle = i * 45 + 1;
                        const endAngle = (i + 1) * 45 - 2;
                        const isHoveredWedge = hoveredId === `wedge-${i}`;
                        const isActiveWedge = activeWedgeIndex === i;
                        const displacement = isHoveredWedge || isActiveWedge ? 10 : 0;
                        
                        const midAngle = (startAngle + endAngle) / 2;
                        const dx = displacement * Math.cos((midAngle - 90) * Math.PI / 180);
                        const dy = displacement * Math.sin((midAngle - 90) * Math.PI / 180);

                        return (
                          <path 
                            key={i} 
                            d={getAnnularWedgePath(cx, cy, innerR, r, startAngle, endAngle)} 
                            fill={img ? `url(#pat-active-${wheel.id}-${i})` : 'rgba(255,255,255,0.05)'} 
                            className="cursor-pointer transition-all duration-500 transform-gpu"
                            style={{
                              transform: `translate(${dx}px, ${dy}px)`,
                              filter: isActiveWedge 
                                ? "drop-shadow(0px 0px 8px rgba(255,255,255,0.3)) brightness(1.15)" 
                                : (isHoveredWedge ? "brightness(1.1)" : "brightness(0.9)"),
                              opacity: isActiveWedge ? 1 : (activeWedgeIndex !== null ? 0.4 : 1) // Dim non-active wedges heavily when one is picked
                            }}
                            onMouseEnter={() => setHoveredId(`wedge-${i}`)}
                            onMouseLeave={() => setHoveredId(null)}
                            onClick={(e) => handleWedgeClick(e, wheel.id, i)}
                          />
                        );
                      })}
                    </svg>

                    {/* Highly stylized floating center title */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex justify-center items-center pointer-events-none w-[180px]">
                      <span className="font-black text-center text-base md:text-xl text-white drop-shadow-[0_4px_10px_rgba(0,0,0,1)] leading-tight tracking-widest break-words pointer-events-none transition-opacity duration-500"
                            style={{ opacity: activeWedgeIndex !== null ? 0.3 : 1 }}
                      >
                        {wheel.project_name}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
