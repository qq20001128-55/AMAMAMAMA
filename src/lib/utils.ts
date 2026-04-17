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
  { id: 'pending', label: '確認中' },
  { id: 'queued', label: '排單中' },
  { id: 'rough_sketch', label: '粗草' },
  { id: 'draft', label: '草稿' },
  { id: 'colored_sketch', label: '色草' },
  { id: 'completed', label: '完稿' },
  { id: 'delivered', label: '已交付' },
];

export const WORKFLOW_OPTIONS = {
  full: {
    id: 'full',
    label: '排單/粗草/草稿/色草/完稿/已交付',
    nodes: ['queued', 'rough_sketch', 'draft', 'colored_sketch', 'completed', 'delivered']
  },
  simple: {
    id: 'simple',
    label: '排單/完稿/已交付',
    nodes: ['queued', 'completed', 'delivered']
  },
  mid: {
    id: 'mid',
    label: '排單/草稿/完稿/已交付',
    nodes: ['queued', 'draft', 'completed', 'delivered']
  }
};

export const getWorkflowNodes = (workflowId?: string) => {
  const nodes = workflowId && WORKFLOW_OPTIONS[workflowId as keyof typeof WORKFLOW_OPTIONS] 
    ? WORKFLOW_OPTIONS[workflowId as keyof typeof WORKFLOW_OPTIONS].nodes 
    : ['queued', 'rough_sketch', 'draft', 'colored_sketch', 'completed', 'delivered'];
  
  // ensure pending is always included for matching but visually pending isn't in tracker, just 'queued', etc.
  // Wait, the progress tracker expects full nodes data. Let's return the STATUS_NODES objects.
  return nodes.map(id => STATUS_NODES.find(n => n.id === id)!);
};

export const CATEGORIES = [
  '頭像 (Avatar)',
  '半身 (Half Body)',
  '全身 (Full Body)',
  '插畫 (Illustration)',
  '其他 (Other)',
];
