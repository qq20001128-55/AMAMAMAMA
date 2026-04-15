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
