import React, { useEffect, useRef, useState } from 'react';

interface WatermarkedImageProps {
  src: string;
  alt?: string;
  horizontalWatermarkUrl?: string;
  verticalWatermarkUrl?: string;
  squareWatermarkUrl?: string;
  pcWatermarkUrl?: string;
  className?: string;
  onClick?: () => void;
}

export default function WatermarkedImage({ src, alt, horizontalWatermarkUrl, verticalWatermarkUrl, squareWatermarkUrl, pcWatermarkUrl, className, onClick }: WatermarkedImageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [useFallback, setUseFallback] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const hasAnyWatermark = horizontalWatermarkUrl || verticalWatermarkUrl || squareWatermarkUrl || pcWatermarkUrl;
    
    if (!hasAnyWatermark) {
      setUseFallback(true);
      return;
    }

    const renderWatermark = async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      try {
        // Load main image
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = src;
        });

        if (!isMounted) return;

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        // Determine watermark to use based on aspect ratio
        const ratio = img.width / img.height;
        let watermarkUrl = verticalWatermarkUrl;
        
        if (ratio > 1.5) {
          watermarkUrl = pcWatermarkUrl || horizontalWatermarkUrl; // Fallback to horizontal if pc not available
        } else if (ratio > 1.1) {
          watermarkUrl = horizontalWatermarkUrl;
        } else if (ratio >= 0.9) {
          watermarkUrl = squareWatermarkUrl || horizontalWatermarkUrl; // Fallback
        }

        if (watermarkUrl) {
          const wmImg = new Image();
          wmImg.crossOrigin = 'anonymous';
          await new Promise((resolve, reject) => {
            wmImg.onload = resolve;
            wmImg.onerror = reject;
            wmImg.src = watermarkUrl;
          });

          if (!isMounted) return;

          // Calculate watermark size and position (e.g., center it, or scale it to fit)
          // Let's scale it to 30% of the image width
          const wmWidth = img.width * 0.3;
          const wmRatio = wmImg.height / wmImg.width;
          const wmHeight = wmWidth * wmRatio;
          
          const x = (img.width - wmWidth) / 2;
          const y = (img.height - wmHeight) / 2;

          // Draw watermark with some transparency
          ctx.globalAlpha = 0.5;
          ctx.drawImage(wmImg, x, y, wmWidth, wmHeight);
          ctx.globalAlpha = 1.0;
        }

        setLoaded(true);
      } catch (err) {
        console.error('Error rendering watermark:', err);
        if (isMounted) {
          setUseFallback(true);
        }
      }
    };

    renderWatermark();

    return () => {
      isMounted = false;
    };
  }, [src, horizontalWatermarkUrl, verticalWatermarkUrl, squareWatermarkUrl, pcWatermarkUrl]);

  if (useFallback) {
    return (
      <img 
        src={src} 
        alt={alt} 
        crossOrigin="anonymous"
        className={`w-full h-full object-cover ${className || ''}`}
        onClick={onClick}
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <canvas 
      ref={canvasRef} 
      className={`w-full h-full object-cover ${className || ''} ${loaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-500`}
      onClick={onClick}
      title={alt}
    />
  );
}
