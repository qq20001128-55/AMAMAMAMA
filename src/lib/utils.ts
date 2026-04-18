import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import imageCompression from 'browser-image-compression';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export async function compressImage(file: File): Promise<Blob> {
  const options = {
    maxSizeMB: 2,
    maxWidthOrHeight: 2000,
    useWebWorker: true,
    fileType: 'image/webp',
    initialQuality: 0.8
  };
  try {
    const compressedFile = await imageCompression(file, options);
    return compressedFile;
  } catch (error) {
    console.error('Image compression error:', error);
    return file; // if compression fails, upload original
  }
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
