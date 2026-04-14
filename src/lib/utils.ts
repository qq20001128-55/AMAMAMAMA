import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 2000;
        const MAX_HEIGHT = 2000;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Canvas to Blob failed'));
            }
          },
          'image/webp',
          0.8
        );
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}

export async function applyWatermark(
  file: File, 
  watermarks: { horizontal?: string, vertical?: string, square?: string, pc?: string }
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas context failed'));

        ctx.drawImage(img, 0, 0);

        const ratio = img.width / img.height;
        let watermarkUrl = watermarks.vertical;
        
        if (ratio > 1.5) {
          watermarkUrl = watermarks.pc || watermarks.horizontal;
        } else if (ratio > 1.1) {
          watermarkUrl = watermarks.horizontal;
        } else if (ratio >= 0.9) {
          watermarkUrl = watermarks.square || watermarks.horizontal;
        }

        if (watermarkUrl) {
          try {
            const wmImg = new Image();
            wmImg.crossOrigin = 'anonymous';
            await new Promise((res, rej) => {
              wmImg.onload = res;
              wmImg.onerror = rej;
              wmImg.src = watermarkUrl as string;
            });

            // Scale watermark to 30% of image width
            const wmWidth = img.width * 0.3;
            const wmRatio = wmImg.height / wmImg.width;
            const wmHeight = wmWidth * wmRatio;
            
            const x = (img.width - wmWidth) / 2;
            const y = (img.height - wmHeight) / 2;

            ctx.globalAlpha = 0.5;
            ctx.drawImage(wmImg, x, y, wmWidth, wmHeight);
            ctx.globalAlpha = 1.0;
          } catch (e) {
            console.error('Failed to apply watermark image', e);
          }
        }

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Canvas to Blob failed'));
            }
          },
          'image/webp',
          1.0 // Keep high quality before compression
        );
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}

export const STATUS_NODES = [
  { id: 'pending', label: '已填單' },
  { id: 'queued', label: '排單中' },
  { id: 'draft', label: '草稿' },
  { id: 'lineart', label: '線稿' },
  { id: 'coloring', label: '色稿' },
  { id: 'completed', label: '成圖' },
  { id: 'delivered', label: '已交付' },
];

export const CATEGORIES = [
  '頭像 (Avatar)',
  '半身 (Half Body)',
  '全身 (Full Body)',
  '插畫 (Illustration)',
  '其他 (Other)',
];
