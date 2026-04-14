import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, Edit2, Save, Trash2, Power, PowerOff, Calendar as CalendarIcon, ExternalLink, X, CheckCircle2 } from 'lucide-react';
import { collection, query, orderBy, getDocs, doc, updateDoc, deleteDoc, setDoc, limit, startAfter, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { cn, STATUS_NODES } from '../lib/utils';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO, isSameMonth } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../firebase';
import { compressImage, applyWatermark } from '../lib/utils';
import { addDoc } from 'firebase/firestore';

interface AdminDashboardProps {
  onBack: () => void;
  user: User | null;
}

export default function AdminDashboard({ onBack, user }: AdminDashboardProps) {
  const [orders, setOrders] = useState<any[]>([]);
  const [allOrders, setAllOrders] = useState<any[]>([]); // For stats and calendar
  const [priceList, setPriceList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [commissionStatus, setCommissionStatus] = useState<'open' | 'closed'>('open');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>(null);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // Price list editing state
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [priceEditData, setPriceEditData] = useState<any>(null);
  const [priceUploading, setPriceUploading] = useState(false);

  // Portfolio state
  const [portfolioCategories, setPortfolioCategories] = useState<any[]>([]);
  const [artworks, setArtworks] = useState<any[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [artworkUploading, setArtworkUploading] = useState(false);

  // Lightbox state
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Check if user is admin
  const isAdmin = user?.email === 'sara20001128@gmail.com';

  // System Settings state
  const [systemSettings, setSystemSettings] = useState<any>({ horizontalWatermarkUrl: '', verticalWatermarkUrl: '', squareWatermarkUrl: '', pcWatermarkUrl: '' });
  const [watermarkUploading, setWatermarkUploading] = useState<'horizontal' | 'vertical' | 'square' | 'pc' | null>(null);

  useEffect(() => {
    fetchOrders();
    fetchAllOrders();
    fetchSettings();
    fetchPriceList();
    fetchPortfolioData();
    fetchSystemSettings();
  }, []);

  const fetchSystemSettings = async () => {
    try {
      const snap = await getDocs(collection(db, 'settings'));
      const settingsDoc = snap.docs.find(d => d.id === 'watermark');
      if (settingsDoc) {
        setSystemSettings(settingsDoc.data());
      } else {
        await setDoc(doc(db, 'settings', 'watermark'), { horizontalWatermarkUrl: '', verticalWatermarkUrl: '', squareWatermarkUrl: '', pcWatermarkUrl: '' });
      }
    } catch (err) {
      console.error('Fetch system settings error:', err);
    }
  };

  const handleWatermarkUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'horizontal' | 'vertical' | 'square' | 'pc') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setWatermarkUploading(type);
    try {
      const storageRef = ref(storage, `system/watermarks/${type}.png`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      
      const newSettings = { ...systemSettings, [`${type}WatermarkUrl`]: url };
      await setDoc(doc(db, 'settings', 'watermark'), newSettings, { merge: true });
      setSystemSettings(newSettings);
      alert('浮水印上傳成功！');
    } catch (err) {
      console.error('Upload watermark error:', err);
      alert('上傳失敗，請稍後再試。');
    } finally {
      setWatermarkUploading(null);
    }
  };

  const fetchPortfolioData = async () => {
    try {
      const catSnap = await getDocs(query(collection(db, 'portfolioCategories'), orderBy('order', 'asc')));
      const cats = catSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setPortfolioCategories(cats);
      if (cats.length > 0) setSelectedCategoryId(cats[0].id);

      const artSnap = await getDocs(query(collection(db, 'artworks'), orderBy('createdAt', 'desc')));
      setArtworks(artSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('Fetch portfolio error:', err);
    }
  };

  const fetchPriceList = async () => {
    try {
      const q = query(collection(db, 'priceList'), orderBy('order', 'asc'));
      const snap = await getDocs(q);
      setPriceList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('Fetch price list error:', err);
    }
  };

  const fetchSettings = async () => {
    try {
      const snap = await getDocs(collection(db, 'settings'));
      const global = snap.docs.find(d => d.id === 'global');
      if (global) {
        setCommissionStatus(global.data().commissionStatus);
      } else {
        await setDoc(doc(db, 'settings', 'global'), { commissionStatus: 'open' });
      }
    } catch (err) {
      console.error('Fetch settings error:', err);
    }
  };

  const fetchAllOrders = async () => {
    try {
      const snap = await getDocs(collection(db, 'orders'));
      setAllOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('Fetch all orders error:', err);
    }
  };

  const fetchOrders = async (isNext = false) => {
    setLoading(true);
    try {
      let q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(10));
      if (isNext && lastDoc) {
        q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'), startAfter(lastDoc), limit(10));
      }

      const snap = await getDocs(q);
      const newOrders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      if (isNext) {
        setOrders(prev => [...prev, ...newOrders]);
      } else {
        setOrders(newOrders);
      }

      setLastDoc(snap.docs[snap.docs.length - 1]);
      setHasMore(snap.docs.length === 10);
    } catch (err) {
      console.error('Fetch orders error:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleCommission = async () => {
    const newStatus = commissionStatus === 'open' ? 'closed' : 'open';
    try {
      await updateDoc(doc(db, 'settings', 'global'), { commissionStatus: newStatus });
      setCommissionStatus(newStatus);
    } catch (err) {
      console.error('Toggle error:', err);
    }
  };

  const handleEdit = (order: any) => {
    setEditingId(order.id);
    setEditData({ ...order, expectedDates: order.expectedDates || {} });
  };

  const handleSave = async () => {
    if (!editingId) return;
    try {
      const oldOrder = orders.find(o => o.id === editingId);
      let newProgressHistory = { ...(oldOrder.progressHistory || {}) };
      let statusChanged = false;
      
      // If status changed, record it in progressHistory
      if (oldOrder.status !== editData.status) {
        newProgressHistory[editData.status] = {
          ...newProgressHistory[editData.status],
          updatedAt: serverTimestamp(),
          dateString: new Date().toISOString()
        };
        statusChanged = true;
      }

      const updatedData = {
        ...editData,
        progressHistory: newProgressHistory
      };

      await updateDoc(doc(db, 'orders', editingId), updatedData);
      setOrders(prev => prev.map(o => o.id === editingId ? { ...updatedData } : o));
      setAllOrders(prev => prev.map(o => o.id === editingId ? { ...updatedData } : o));
      setEditingId(null);

      // Send email if status changed
      if (statusChanged && oldOrder.email) {
        const stageLabel = STATUS_NODES.find(n => n.id === editData.status)?.label || editData.status;
        const hasNewImage = newProgressHistory[editData.status]?.imageUrl && newProgressHistory[editData.status].imageUrl !== oldOrder.progressHistory?.[editData.status]?.imageUrl;
        
        const emailHtml = `
          <p>承契者您好：</p>
          <p>您的委託項目 <strong>${oldOrder.title}</strong> 已有新的進度更新！</p>
          <p>目前階段：<strong>${stageLabel}</strong></p>
          ${hasNewImage ? '<p>預覽圖已上傳，請前往網站查看（含浮水印保護）。</p>' : ''}
          <p>您可以點擊下方連結，輸入您的訂單編號查看最新的預覽圖與詳細進度：</p>
          <a href="${window.location.origin}/tracking">點此前往龍契局查詢進度</a>
          <br/><br/>
          <p>龍契局 瑪阿 敬上</p>
        `;

        await addDoc(collection(db, 'mail'), {
          to: oldOrder.email,
          message: {
            subject: `【龍契局】委託進度更新通知 - 訂單編號：${oldOrder.officialOrderId || oldOrder.orderId.substring(0, 4).toUpperCase()}`,
            html: emailHtml
          }
        });
      }
    } catch (err) {
      console.error('Save error:', err);
    }
  };

  const handleStageImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, stage: string) => {
    const file = e.target.files?.[0];
    if (!file || !editingId) return;

    try {
      // Apply watermark first
      const watermarkedBlob = await applyWatermark(file, {
        horizontal: systemSettings.horizontalWatermarkUrl,
        vertical: systemSettings.verticalWatermarkUrl,
        square: systemSettings.squareWatermarkUrl,
        pc: systemSettings.pcWatermarkUrl
      });

      // Then compress
      const compressedBlob = await compressImage(new File([watermarkedBlob], 'watermarked.webp', { type: 'image/webp' }));
      
      const storageRef = ref(storage, `orders/${editingId}/${stage}.webp`);
      await uploadBytes(storageRef, compressedBlob);
      const url = await getDownloadURL(storageRef);
      
      const newProgressHistory = { ...(editData.progressHistory || {}) };
      newProgressHistory[stage] = {
        ...newProgressHistory[stage],
        imageUrl: url
      };

      setEditData({ ...editData, progressHistory: newProgressHistory });
      alert('進度預覽圖上傳成功！請記得點擊「儲存」以保存變更。');
    } catch (err) {
      console.error('Upload stage image error:', err);
      alert('上傳失敗，請稍後再試。');
    }
  };

  const handleCloseOrder = async (order: any) => {
    if (!window.confirm('是否確認委託人已收到圖？結案後將永久刪除所有訂單資料與參考圖。')) return;

    try {
      // Send final email
      if (order.email) {
        await addDoc(collection(db, 'mail'), {
          to: order.email,
          message: {
            subject: `【龍契局】委託結案通知 - 訂單編號：${order.officialOrderId || order.orderId.substring(0, 4).toUpperCase()}`,
            html: `<p>承契者您好：</p><p>您的委託已圓滿達成，相關個人資料與參考圖已從龍契局系統中移除，感謝您的委託！</p><br/><p>龍契局 瑪阿 敬上</p>`
          }
        });
      }

      // Delete from Firestore
      await deleteDoc(doc(db, 'orders', order.id));

      // Attempt to delete from Storage (Note: Client-side storage deletion of folders is not directly supported, 
      // we have to delete files individually or rely on Cloud Functions. 
      // For this prototype, we'll delete the known files if possible, or just leave it to a Cloud Function.
      // Since we know the references are in order.referenceImages, we can delete them.)
      if (order.referenceImages && order.referenceImages.length > 0) {
        for (const imgUrl of order.referenceImages) {
          try {
            const imgRef = ref(storage, imgUrl);
            await deleteObject(imgRef);
          } catch (e) {
            console.error('Failed to delete reference image:', e);
          }
        }
      }

      // Delete stage images
      if (order.progressHistory) {
        for (const stage of Object.keys(order.progressHistory)) {
          if (order.progressHistory[stage].imageUrl) {
            try {
              const imgRef = ref(storage, order.progressHistory[stage].imageUrl);
              await deleteObject(imgRef);
            } catch (e) {
              console.error('Failed to delete stage image:', e);
            }
          }
        }
      }

      setOrders(prev => prev.filter(o => o.id !== order.id));
      setAllOrders(prev => prev.filter(o => o.id !== order.id));
      alert('訂單已結案並銷毀資料。');
    } catch (err) {
      console.error('Close order error:', err);
      alert('結案失敗。');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('確定要銷毀此契嗎？')) return;
    try {
      await deleteDoc(doc(db, 'orders', id));
      setOrders(prev => prev.filter(o => o.id !== id));
      setAllOrders(prev => prev.filter(o => o.id !== id));
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const handleRejectOrder = async (order: any) => {
    if (!window.confirm(`確定要婉拒 ${order.nickname} 的委託嗎？`)) return;
    
    // Email Template A
    const emailContent = `龍契局已收到你的願望。<br><br>這次的委託內容這邊評估後，暫時無法承接，很抱歉。<br>目前狀態或方向上不太適合接下這個案子。<br>也謝謝你的信任與喜歡。<br><br>如果之後有其他類型的委託，也很歡迎再來詢問龍契局<br>願你未來在合適的時機，再度踏入此局。`;

    try {
      await updateDoc(doc(db, 'orders', order.id), { status: 'closed' });
      
      // Write to mail collection for Trigger Email extension
      if (order.email) {
        await addDoc(collection(db, 'mail'), {
          to: order.email,
          message: {
            subject: `【龍契局】委託狀態通知 - ${order.nickname}`,
            html: emailContent
          }
        });
      }

      setOrders(prev => prev.filter(o => o.id !== order.id)); // Remove from active view
      setAllOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'closed' } : o));
      alert('已婉拒並發送通知信。');
    } catch (err) {
      console.error('Reject error:', err);
    }
  };

  const handleAcceptOrder = async (order: any) => {
    const officialId = `MAA-${order.orderId.substring(0, 4).toUpperCase()}`;
    if (!window.confirm(`確定要接受 ${order.nickname} 的委託嗎？將分配編號 #${officialId}`)) return;

    // Email Template B
    const emailContent = `此契，成立。<br><br>你的委託已收到，並進入排單與評估流程。<br>若無特殊狀況，將依順序開始製作。<br><br>在契約成立後，以下事項將生效：<br>・依排單順序進行製作<br>・修改與退款規則依委託須知執行<br>・驚喜包不可進行大幅更動<br><br>龍契已受理。<br>#${officialId}<br><br>——瑪阿`;

    try {
      const updatedData = {
        status: 'queued',
        officialOrderId: officialId,
        progressHistory: {
          ...order.progressHistory,
          queued: {
            updatedAt: serverTimestamp(),
            dateString: new Date().toISOString()
          }
        }
      };
      await updateDoc(doc(db, 'orders', order.id), updatedData);

      // Write to mail collection for Trigger Email extension
      if (order.email) {
        await addDoc(collection(db, 'mail'), {
          to: order.email,
          message: {
            subject: `【龍契局】委託成立通知 - #${officialId}`,
            html: emailContent
          }
        });
      }

      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, ...updatedData } : o));
      setAllOrders(prev => prev.map(o => o.id === order.id ? { ...o, ...updatedData } : o));
      alert('已接受並發送通知信。');
    } catch (err) {
      console.error('Accept error:', err);
    }
  };

  const scrollToOrder = (id: string) => {
    const el = document.getElementById(`order-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('bg-gray-100');
      setTimeout(() => el.classList.remove('bg-gray-100'), 2000);
    }
  };

  const handleAddPriceItem = async () => {
    const newItem = {
      title: '新委託項目',
      description: '請輸入說明與價格',
      imageUrl: '',
      order: priceList.length
    };
    try {
      const docRef = doc(collection(db, 'priceList'));
      await setDoc(docRef, newItem);
      setPriceList([...priceList, { id: docRef.id, ...newItem }]);
      setEditingPriceId(docRef.id);
      setPriceEditData({ id: docRef.id, ...newItem });
    } catch (err) {
      console.error('Add price item error:', err);
    }
  };

  const handleSavePriceItem = async () => {
    if (!editingPriceId) return;
    try {
      await updateDoc(doc(db, 'priceList', editingPriceId), {
        title: priceEditData.title,
        description: priceEditData.description,
        imageUrl: priceEditData.imageUrl,
        order: priceEditData.order
      });
      setPriceList(prev => prev.map(p => p.id === editingPriceId ? priceEditData : p).sort((a, b) => a.order - b.order));
      setEditingPriceId(null);
    } catch (err) {
      console.error('Save price item error:', err);
    }
  };

  const handleDeletePriceItem = async (id: string) => {
    if (!window.confirm('確定要刪除此價目項目嗎？')) return;
    try {
      await deleteDoc(doc(db, 'priceList', id));
      setPriceList(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      console.error('Delete price item error:', err);
    }
  };

  const handlePriceImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingPriceId) return;

    setPriceUploading(true);
    try {
      const compressedBlob = await compressImage(file);
      const storageRef = ref(storage, `priceList/${editingPriceId}.webp`);
      await uploadBytes(storageRef, compressedBlob);
      const url = await getDownloadURL(storageRef);
      setPriceEditData({ ...priceEditData, imageUrl: url });
    } catch (err) {
      console.error('Upload error:', err);
      alert('上傳失敗，請稍後再試。');
    } finally {
      setPriceUploading(false);
    }
  };

  // Portfolio Handlers
  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      const docRef = await addDoc(collection(db, 'portfolioCategories'), {
        name: newCategoryName.trim(),
        order: portfolioCategories.length
      });
      const newCat = { id: docRef.id, name: newCategoryName.trim(), order: portfolioCategories.length };
      setPortfolioCategories([...portfolioCategories, newCat]);
      setNewCategoryName('');
      if (!selectedCategoryId) setSelectedCategoryId(docRef.id);
    } catch (err) {
      console.error('Add category error:', err);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!window.confirm('確定要刪除此分類嗎？這將會連同分類內的作品一併刪除！')) return;
    try {
      await deleteDoc(doc(db, 'portfolioCategories', id));
      setPortfolioCategories(prev => prev.filter(c => c.id !== id));
      if (selectedCategoryId === id) {
        setSelectedCategoryId(portfolioCategories.find(c => c.id !== id)?.id || '');
      }
      // Delete associated artworks
      const relatedArtworks = artworks.filter(a => a.categoryId === id);
      for (const art of relatedArtworks) {
        await deleteDoc(doc(db, 'artworks', art.id));
      }
      setArtworks(prev => prev.filter(a => a.categoryId !== id));
    } catch (err) {
      console.error('Delete category error:', err);
    }
  };

  const handleArtworkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length === 0 || !selectedCategoryId) return;

    setArtworkUploading(true);
    try {
      const uploadPromises = files.map(async (file) => {
        const compressedBlob = await compressImage(file);
        const tempId = crypto.randomUUID();
        const storageRef = ref(storage, `artworks/${tempId}.webp`);
        await uploadBytes(storageRef, compressedBlob);
        const url = await getDownloadURL(storageRef);
        
        const docRef = await addDoc(collection(db, 'artworks'), {
          imageUrl: url,
          categoryId: selectedCategoryId,
          title: file.name,
          createdAt: new Date().toISOString()
        });
        
        return {
          id: docRef.id,
          imageUrl: url,
          categoryId: selectedCategoryId,
          title: file.name,
          createdAt: new Date().toISOString()
        };
      });

      const newArtworks = await Promise.all(uploadPromises);
      setArtworks(prev => [...newArtworks, ...prev]);
    } catch (err) {
      console.error('Upload artworks error:', err);
      alert('上傳失敗，請稍後再試。');
    } finally {
      setArtworkUploading(false);
    }
  };

  const handleDeleteArtwork = async (id: string) => {
    if (!window.confirm('確定要刪除此作品嗎？')) return;
    try {
      await deleteDoc(doc(db, 'artworks', id));
      setArtworks(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      console.error('Delete artwork error:', err);
    }
  };

  if (!isAdmin) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-20 text-center">
        <h2 className="text-2xl font-bold mb-4">權限不足</h2>
        <p className="text-gray-400 mb-8">您沒有訪問管理後台的權限。</p>
        <button onClick={onBack} className="btn-primary">返回首頁</button>
      </div>
    );
  }

  // Stats
  const totalOrders = allOrders.length;
  const completedOrders = allOrders.filter(o => o.status === 'completed' || o.status === 'delivered').length;
  const pendingOrders = totalOrders - completedOrders;

  // Calendar Days
  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth)
  });

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-7xl mx-auto px-6 py-10"
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12 border-b-2 border-[#53565b] pb-6">
        <div>
          <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-[#53565b] mb-4 transition-colors tracking-widest">
            <ChevronLeft size={20} />
            <span>返回大廳</span>
          </button>
          <h2 className="text-4xl font-black tracking-widest">龍契局・後台</h2>
        </div>

        <div className="flex items-center gap-4 neo-box !p-4">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-widest text-gray-500">局門狀態</span>
            <span className={cn("text-sm font-bold tracking-widest", commissionStatus === 'open' ? "text-gray-800" : "text-[#53565b]")}>
              {commissionStatus === 'open' ? '開局接契' : '局門緊閉'}
            </span>
          </div>
          <button 
            onClick={toggleCommission}
            className={cn(
              "p-3 border-2 transition-all duration-300",
              commissionStatus === 'open' ? "border-gray-800 text-gray-800 hover:bg-gray-100" : "border-[#53565b] text-[#53565b] hover:bg-gray-100"
            )}
          >
            {commissionStatus === 'open' ? <Power size={20} /> : <PowerOff size={20} />}
          </button>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-8">
        {/* Left Column - Main Content */}
        <div className="flex-1 space-y-16 min-w-0">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="neo-box text-center">
              <p className="text-sm tracking-widest text-gray-500 mb-2">總書契數</p>
              <p className="text-4xl font-black">{totalOrders}</p>
            </div>
            <div className="neo-box text-center">
              <p className="text-sm tracking-widest text-gray-500 mb-2">待解之契 (排單/製作中)</p>
              <p className="text-4xl font-black text-[#53565b]">{pendingOrders}</p>
            </div>
            <div className="neo-box text-center">
              <p className="text-sm tracking-widest text-gray-500 mb-2">已結之契</p>
              <p className="text-4xl font-black text-gray-800">{completedOrders}</p>
            </div>
          </div>



      {/* New Order Queue */}
      {orders.filter(o => o.status === 'pending').length > 0 && (
        <div className="mb-16">
          <h3 className="text-2xl font-black tracking-widest mb-6 text-[#53565b]">待確認之契</h3>
          <div className="grid grid-cols-1 gap-6">
            {orders.filter(o => o.status === 'pending').map(order => (
              <div key={order.id} className="neo-box border-[#53565b] bg-gray-100/10 flex flex-col md:flex-row gap-6">
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="text-lg font-black tracking-widest">{order.title}</h4>
                      <p className="text-sm text-gray-500 tracking-widest">{order.nickname} | {order.category}</p>
                    </div>
                    <span className="text-xs font-mono text-gray-400">#{order.orderId.substring(0, 4).toUpperCase()}</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-4 line-clamp-3">{order.description || '無詳細描述'}</p>
                  
                  {/* References */}
                  <div>
                    <p className="text-xs text-gray-500 tracking-widest mb-2">參考資料：</p>
                    {order.referenceType === 'link' ? (
                      <a href={order.referenceLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[#53565b] hover:underline text-sm tracking-widest">
                        <ExternalLink size={14} /> {order.referenceLink}
                      </a>
                    ) : order.referenceImages?.length > 0 ? (
                      <div className="flex gap-2 overflow-x-auto pb-2">
                        {order.referenceImages.map((img: string, i: number) => (
                          <button key={i} onClick={() => setLightboxImage(img)} className="shrink-0">
                            <img src={img} alt="Ref" className="w-20 h-20 object-cover border border-gray-300 hover:border-[#53565b] transition-colors" />
                          </button>
                        ))}
                      </div>
                    ) : <span className="text-sm text-gray-400">無</span>}
                  </div>
                </div>
                <div className="flex md:flex-col justify-end gap-4 md:border-l-2 md:border-gray-200 md:pl-6">
                  <button 
                    onClick={() => handleAcceptOrder(order)}
                    className="px-6 py-3 bg-[#53565b] text-white text-sm font-bold tracking-widest hover:bg-gray-900 transition-colors w-full md:w-auto"
                  >
                    接受
                  </button>
                  <button 
                    onClick={() => handleRejectOrder(order)}
                    className="px-6 py-3 border-2 border-[#53565b] text-sm font-bold tracking-widest hover:bg-gray-100 transition-colors w-full md:w-auto"
                  >
                    婉拒
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Price List Management */}
      <div className="mb-16">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-black tracking-widest text-[#53565b]">價目表管理</h3>
          <button onClick={handleAddPriceItem} className="btn-primary py-2 px-4 text-sm">
            + 新增項目
          </button>
        </div>
        <div className="space-y-4">
          {priceList.map((item) => (
            <div key={item.id} className="neo-box !p-4 flex flex-col md:flex-row gap-6 items-start">
              {editingPriceId === item.id ? (
                <>
                  <div className="w-full md:w-1/3 space-y-4">
                    <div className="aspect-[4/3] bg-gray-100 border-2 border-[#53565b] relative flex items-center justify-center overflow-hidden">
                      {priceEditData.imageUrl ? (
                        <img src={priceEditData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-gray-400 text-sm">無圖片</span>
                      )}
                      <label className="absolute inset-0 bg-black/50 text-white flex flex-col items-center justify-center opacity-0 hover:opacity-100 cursor-pointer transition-opacity">
                        {priceUploading ? (
                          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <span className="text-xs tracking-widest">上傳圖片</span>
                        )}
                        <input type="file" className="hidden" accept="image/*" onChange={handlePriceImageUpload} disabled={priceUploading} />
                      </label>
                    </div>
                    <input 
                      type="number" 
                      className="input-field py-1 text-sm" 
                      placeholder="排序 (數字越小越前面)"
                      value={priceEditData.order}
                      onChange={e => setPriceEditData({...priceEditData, order: Number(e.target.value)})}
                    />
                  </div>
                  <div className="w-full md:w-2/3 flex flex-col h-full gap-4">
                    <input 
                      type="text" 
                      className="input-field font-bold text-lg" 
                      placeholder="委託名稱"
                      value={priceEditData.title}
                      onChange={e => setPriceEditData({...priceEditData, title: e.target.value})}
                    />
                    <textarea 
                      className="input-field flex-1 min-h-[120px] resize-none text-sm leading-loose" 
                      placeholder="價格與說明..."
                      value={priceEditData.description}
                      onChange={e => setPriceEditData({...priceEditData, description: e.target.value})}
                    />
                    <div className="flex justify-end gap-4 mt-auto">
                      <button onClick={() => setEditingPriceId(null)} className="px-4 py-2 border-2 border-[#53565b] text-sm tracking-widest hover:bg-gray-100 transition-colors">
                        取消
                      </button>
                      <button onClick={handleSavePriceItem} className="px-4 py-2 bg-gray-800 text-white text-sm tracking-widest hover:bg-gray-900 transition-colors">
                        儲存
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-full md:w-1/4 aspect-[4/3] bg-gray-100 border-2 border-[#53565b] overflow-hidden">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300 text-sm">無圖片</div>
                    )}
                  </div>
                  <div className="w-full md:w-3/4 flex flex-col justify-between h-full">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="text-xl font-black tracking-widest">{item.title}</h4>
                        <span className="text-xs text-gray-400 font-mono">排序: {item.order}</span>
                      </div>
                      <p className="text-sm text-gray-600 tracking-widest leading-loose whitespace-pre-wrap line-clamp-3">
                        {item.description}
                      </p>
                    </div>
                    <div className="flex justify-end gap-4 mt-4">
                      <button onClick={() => { setEditingPriceId(item.id); setPriceEditData(item); }} className="flex items-center gap-2 px-4 py-2 border-2 border-[#53565b] text-sm tracking-widest hover:bg-[#53565b] hover:text-[#f5f5f5] transition-colors">
                        <Edit2 size={14} /> 編輯
                      </button>
                      <button onClick={() => handleDeletePriceItem(item.id)} className="flex items-center gap-2 px-4 py-2 border-2 border-[#53565b] text-[#53565b] text-sm tracking-widest hover:bg-gray-100 transition-colors">
                        <Trash2 size={14} /> 刪除
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
          {priceList.length === 0 && (
            <div className="text-center py-10 text-gray-400 border-2 border-dashed border-gray-200 tracking-widest">
              目前尚無價目項目。
            </div>
          )}
        </div>
      </div>

      {/* Portfolio Management */}
      <div className="mb-16">
        <h3 className="text-2xl font-black tracking-widest mb-6 text-[#53565b]">作品集管理</h3>
        
        {/* Categories */}
        <div className="neo-box mb-6">
          <h4 className="text-lg font-bold tracking-widest mb-4">分類管理</h4>
          <div className="flex gap-4 mb-6">
            <input 
              type="text" 
              className="input-field flex-1" 
              placeholder="新增分類名稱..."
              value={newCategoryName}
              onChange={e => setNewCategoryName(e.target.value)}
            />
            <button onClick={handleAddCategory} className="btn-primary whitespace-nowrap">
              新增分類
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {portfolioCategories.map(cat => (
              <div key={cat.id} className="flex items-center gap-2 bg-gray-100 px-3 py-1 border border-gray-300">
                <span className="text-sm tracking-widest">{cat.name}</span>
                <button onClick={() => handleDeleteCategory(cat.id)} className="text-gray-400 hover:text-[#53565b]">
                  <X size={14} />
                </button>
              </div>
            ))}
            {portfolioCategories.length === 0 && <span className="text-sm text-gray-400">尚無分類</span>}
          </div>
        </div>

        {/* Upload & Preview */}
        <div className="neo-box">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b-2 border-gray-200 pb-4">
            <h4 className="text-lg font-bold tracking-widest">作品上傳與預覽</h4>
            <div className="flex items-center gap-4 w-full md:w-auto">
              <select 
                className="input-field py-2 text-sm max-w-[200px]"
                value={selectedCategoryId}
                onChange={e => setSelectedCategoryId(e.target.value)}
              >
                {portfolioCategories.length === 0 && <option value="">請先新增分類</option>}
                {portfolioCategories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
              <label className={cn("btn-primary whitespace-nowrap cursor-pointer", (!selectedCategoryId || artworkUploading) && "opacity-50 cursor-not-allowed")}>
                {artworkUploading ? '上傳中...' : '上傳作品 (多圖)'}
                <input 
                  type="file" 
                  className="hidden" 
                  accept="image/*" 
                  multiple 
                  onChange={handleArtworkUpload} 
                  disabled={!selectedCategoryId || artworkUploading} 
                />
              </label>
            </div>
          </div>

          <div className="space-y-8">
            {portfolioCategories.map(cat => {
              const catArtworks = artworks.filter(a => a.categoryId === cat.id);
              if (catArtworks.length === 0) return null;
              
              return (
                <div key={cat.id}>
                  <h5 className="text-md font-bold tracking-widest mb-4 text-gray-600">{cat.name}</h5>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {catArtworks.map(art => (
                      <div key={art.id} className="relative aspect-square border-2 border-gray-200 group overflow-hidden">
                        <img src={art.imageUrl} alt={art.title} className="w-full h-full object-cover" />
                        <button 
                          onClick={() => handleDeleteArtwork(art.id)}
                          className="absolute top-1 right-1 p-1 bg-white/80 text-[#53565b] opacity-0 group-hover:opacity-100 hover:bg-white transition-all"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            {artworks.length === 0 && (
              <div className="text-center py-10 text-gray-400 tracking-widest">
                尚無作品。
              </div>
            )}
          </div>
        </div>
      </div>

      {/* System Settings */}
      <div className="mb-16">
        <h3 className="text-2xl font-black tracking-widest mb-6 text-[#53565b]">系統設定</h3>
        <div className="neo-box">
          <h4 className="text-lg font-bold tracking-widest mb-4">浮水印設定</h4>
          <p className="text-sm text-gray-500 tracking-widest mb-6 leading-loose">
            請上傳含有透明背景的 PNG 檔案。<br/>
            系統將於前端展示作品集時，自動依據圖片長寬比疊加對應的浮水印。
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <p className="text-sm font-bold tracking-widest mb-2">橫式浮水印 (寬圖使用)</p>
              <div className="aspect-video bg-gray-100 border-2 border-dashed border-gray-300 relative flex items-center justify-center overflow-hidden group">
                {systemSettings.horizontalWatermarkUrl ? (
                  <img src={systemSettings.horizontalWatermarkUrl} alt="Horizontal Watermark" className="max-w-full max-h-full object-contain p-4" />
                ) : (
                  <span className="text-gray-400 text-sm tracking-widest">尚未上傳</span>
                )}
                <label className="absolute inset-0 bg-black/50 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                  {watermarkUploading === 'horizontal' ? (
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span className="text-xs tracking-widest">上傳橫式浮水印</span>
                  )}
                  <input type="file" className="hidden" accept="image/png" onChange={(e) => handleWatermarkUpload(e, 'horizontal')} disabled={watermarkUploading !== null} />
                </label>
              </div>
            </div>
            <div>
              <p className="text-sm font-bold tracking-widest mb-2">直式浮水印 (長圖使用)</p>
              <div className="aspect-[3/4] max-w-[250px] bg-gray-100 border-2 border-dashed border-gray-300 relative flex items-center justify-center overflow-hidden group">
                {systemSettings.verticalWatermarkUrl ? (
                  <img src={systemSettings.verticalWatermarkUrl} alt="Vertical Watermark" className="max-w-full max-h-full object-contain p-4" />
                ) : (
                  <span className="text-gray-400 text-sm tracking-widest">尚未上傳</span>
                )}
                <label className="absolute inset-0 bg-black/50 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                  {watermarkUploading === 'vertical' ? (
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span className="text-xs tracking-widest">上傳直式浮水印</span>
                  )}
                  <input type="file" className="hidden" accept="image/png" onChange={(e) => handleWatermarkUpload(e, 'vertical')} disabled={watermarkUploading !== null} />
                </label>
              </div>
            </div>
            <div>
              <p className="text-sm font-bold tracking-widest mb-2">方形浮水印 (正方圖使用)</p>
              <div className="aspect-square max-w-[250px] bg-gray-100 border-2 border-dashed border-gray-300 relative flex items-center justify-center overflow-hidden group">
                {systemSettings.squareWatermarkUrl ? (
                  <img src={systemSettings.squareWatermarkUrl} alt="Square Watermark" className="max-w-full max-h-full object-contain p-4" />
                ) : (
                  <span className="text-gray-400 text-sm tracking-widest">尚未上傳</span>
                )}
                <label className="absolute inset-0 bg-black/50 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                  {watermarkUploading === 'square' ? (
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span className="text-xs tracking-widest">上傳方形浮水印</span>
                  )}
                  <input type="file" className="hidden" accept="image/png" onChange={(e) => handleWatermarkUpload(e, 'square')} disabled={watermarkUploading !== null} />
                </label>
              </div>
            </div>
            <div>
              <p className="text-sm font-bold tracking-widest mb-2">電腦螢幕浮水印 (極寬圖使用)</p>
              <div className="aspect-[16/9] bg-gray-100 border-2 border-dashed border-gray-300 relative flex items-center justify-center overflow-hidden group">
                {systemSettings.pcWatermarkUrl ? (
                  <img src={systemSettings.pcWatermarkUrl} alt="PC Watermark" className="max-w-full max-h-full object-contain p-4" />
                ) : (
                  <span className="text-gray-400 text-sm tracking-widest">尚未上傳</span>
                )}
                <label className="absolute inset-0 bg-black/50 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                  {watermarkUploading === 'pc' ? (
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span className="text-xs tracking-widest">上傳電腦螢幕浮水印</span>
                  )}
                  <input type="file" className="hidden" accept="image/png" onChange={(e) => handleWatermarkUpload(e, 'pc')} disabled={watermarkUploading !== null} />
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      <h3 className="text-2xl font-black tracking-widest mb-6">卷宗列表</h3>
      <div className="space-y-6">
        {orders.filter(o => o.status !== 'pending' && o.status !== 'closed').map(order => (
          <div key={order.id} id={`order-${order.id}`} className="neo-box transition-colors duration-1000">
            <div className="flex flex-col lg:flex-row gap-8">
              {/* Left: Info */}
              <div className="flex-1 space-y-4">
                <div className="flex justify-between items-start border-b-2 border-gray-200 pb-4">
                  <div>
                    <h4 className="text-xl font-black tracking-widest mb-1">{order.title}</h4>
                    <p className="text-sm text-gray-500 tracking-widest">{order.category} | {order.nickname}</p>
                  </div>
                  <div className="text-right">
                    {editingId === order.id ? (
                      <input 
                        type="text" 
                        placeholder="輸入正式編號"
                        className="input-field py-1 text-sm w-32 text-right"
                        value={editData.officialOrderId || ''}
                        onChange={(e) => setEditData({ ...editData, officialOrderId: e.target.value })}
                      />
                    ) : (
                      <span className="font-mono font-bold text-sm">{order.officialOrderId || '未編號'}</span>
                    )}
                  </div>
                </div>

                <div className="text-sm tracking-widest leading-relaxed">
                  <p className="text-gray-500 mb-1">聯絡方式：<span className="text-[#53565b]">{order.contact}</span></p>
                  <p className="text-gray-500 mb-1">需求描述：<span className="text-[#53565b]">{order.description || '無'}</span></p>
                </div>

                {/* References */}
                <div>
                  <p className="text-sm text-gray-500 tracking-widest mb-2">參考資料：</p>
                  {order.referenceType === 'link' ? (
                    <a href={order.referenceLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[#53565b] hover:underline text-sm tracking-widest">
                      <ExternalLink size={16} /> 開啟連結
                    </a>
                  ) : order.referenceImages?.length > 0 ? (
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {order.referenceImages.map((img: string, i: number) => (
                        <a key={i} href={img} target="_blank" rel="noopener noreferrer" className="shrink-0">
                          <img src={img} alt="Ref" className="w-16 h-16 object-cover border border-[#53565b] hover:opacity-80" />
                        </a>
                      ))}
                    </div>
                  ) : <span className="text-sm text-gray-400">無</span>}
                </div>
              </div>

              {/* Right: Status & Actions */}
              <div className="lg:w-72 flex flex-col justify-between border-t-2 lg:border-t-0 lg:border-l-2 border-gray-200 pt-4 lg:pt-0 lg:pl-8">
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-gray-500 tracking-widest mb-2">當前進度</p>
                    {editingId === order.id ? (
                      <select 
                        className="input-field py-2 text-sm appearance-none font-bold"
                        value={editData.status}
                        onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                      >
                        {(order.status === 'pending' ? STATUS_NODES : STATUS_NODES.filter(n => n.id !== 'pending')).map(node => (
                          <option key={node.id} value={node.id}>{node.label}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="inline-block px-4 py-2 bg-[#53565b] text-[#f5f5f5] text-sm font-bold tracking-widest">
                        {STATUS_NODES.find(n => n.id === order.status)?.label}
                      </span>
                    )}
                  </div>

                  {editingId === order.id && (
                    <>
                      <div className="space-y-4 border-t-2 border-gray-200 pt-4">
                        <div className="space-y-2">
                          <p className="text-xs text-gray-500 tracking-widest">當前進度達成日 (可選)</p>
                        <input 
                          type="date"
                          className="input-field py-2 text-sm"
                          value={editData.progressHistory?.[editData.status]?.dateString ? format(parseISO(editData.progressHistory[editData.status].dateString), 'yyyy-MM-dd') : ''}
                          onChange={(e) => {
                            const dateStr = e.target.value ? new Date(e.target.value).toISOString() : '';
                            setEditData({
                              ...editData,
                              progressHistory: {
                                ...editData.progressHistory,
                                [editData.status]: {
                                  ...editData.progressHistory?.[editData.status],
                                  dateString: dateStr
                                }
                              }
                            });
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs text-gray-500 tracking-widest">預計草稿日 (可選)</p>
                        <input 
                          type="date"
                          className="input-field py-2 text-sm"
                          value={editData.expectedDates?.draft ? format(parseISO(editData.expectedDates.draft), 'yyyy-MM-dd') : ''}
                          onChange={(e) => {
                            const dateStr = e.target.value ? new Date(e.target.value).toISOString() : '';
                            setEditData({
                              ...editData,
                              expectedDates: { ...editData.expectedDates, draft: dateStr }
                            });
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs text-gray-500 tracking-widest">預計線稿日 (可選)</p>
                        <input 
                          type="date"
                          className="input-field py-2 text-sm"
                          value={editData.expectedDates?.lineart ? format(parseISO(editData.expectedDates.lineart), 'yyyy-MM-dd') : ''}
                          onChange={(e) => {
                            const dateStr = e.target.value ? new Date(e.target.value).toISOString() : '';
                            setEditData({
                              ...editData,
                              expectedDates: { ...editData.expectedDates, lineart: dateStr }
                            });
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs text-gray-500 tracking-widest">預計色稿日 (可選)</p>
                        <input 
                          type="date"
                          className="input-field py-2 text-sm"
                          value={editData.expectedDates?.coloring ? format(parseISO(editData.expectedDates.coloring), 'yyyy-MM-dd') : ''}
                          onChange={(e) => {
                            const dateStr = e.target.value ? new Date(e.target.value).toISOString() : '';
                            setEditData({
                              ...editData,
                              expectedDates: { ...editData.expectedDates, coloring: dateStr }
                            });
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs text-gray-500 tracking-widest">預計完稿日 (可選)</p>
                        <input 
                          type="date"
                          className="input-field py-2 text-sm"
                          value={editData.expectedDates?.completed ? format(parseISO(editData.expectedDates.completed), 'yyyy-MM-dd') : ''}
                          onChange={(e) => {
                            const dateStr = e.target.value ? new Date(e.target.value).toISOString() : '';
                            setEditData({
                              ...editData,
                              expectedDates: { ...editData.expectedDates, completed: dateStr }
                            });
                          }}
                        />
                      </div>
                    </div>
                    
                    {/* Stage Image Upload */}
                    {['draft', 'lineart', 'coloring', 'completed'].includes(editData.status) && (
                      <div className="mt-6 p-4 border-2 border-dashed border-gray-300 bg-gray-50">
                        <p className="text-sm font-bold tracking-widest mb-2">上傳預覽圖 ({STATUS_NODES.find(n => n.id === editData.status)?.label})</p>
                        <div className="flex items-center gap-4">
                          <label className="btn-secondary text-sm px-4 py-2 cursor-pointer">
                            選擇圖片
                            <input 
                              type="file" 
                              className="hidden" 
                              accept="image/*"
                              onChange={(e) => handleStageImageUpload(e, editData.status)}
                            />
                          </label>
                          {editData.progressHistory?.[editData.status]?.imageUrl && (
                            <span className="text-xs text-gray-800 tracking-widest flex items-center gap-1">
                              <CheckCircle2 size={14} /> 已上傳
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    </>
                  )}
                </div>

                <div className="flex justify-end gap-4 mt-6">
                  {editingId === order.id ? (
                    <>
                      <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white tracking-widest hover:bg-gray-900 transition-colors">
                        <Save size={16} /> 儲存
                      </button>
                      <button onClick={() => setEditingId(null)} className="flex items-center gap-2 px-4 py-2 border-2 border-[#53565b] tracking-widest hover:bg-gray-100 transition-colors">
                        取消
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => handleEdit(order)} className="flex items-center gap-2 px-4 py-2 border-2 border-[#53565b] tracking-widest hover:bg-[#53565b] hover:text-[#f5f5f5] transition-colors">
                        <Edit2 size={16} /> 編輯
                      </button>
                      {(order.status === 'completed' || order.status === 'delivered') && (
                        <button onClick={() => handleCloseOrder(order)} className="flex items-center gap-2 px-4 py-2 border-2 border-gray-800 text-gray-800 tracking-widest hover:bg-gray-100 transition-colors">
                          <CheckCircle2 size={16} /> 確認交付並結案
                        </button>
                      )}
                      <button onClick={() => handleDelete(order.id)} className="flex items-center gap-2 px-4 py-2 border-2 border-[#53565b] text-[#53565b] tracking-widest hover:bg-gray-100 transition-colors">
                        <Trash2 size={16} /> 銷毀
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {hasMore && (
        <div className="mt-12 text-center">
          <button 
            onClick={() => fetchOrders(true)} 
            disabled={loading}
            className="btn-secondary"
          >
            {loading ? '翻閱中...' : '翻閱更多卷宗'}
          </button>
        </div>
      )}

      {orders.length === 0 && !loading && (
        <div className="py-20 text-center text-gray-400 border-2 border-dashed border-gray-200 mt-4 tracking-widest">
          目前尚無卷宗。
        </div>
      )}
      </div>

      {/* Right Column - Fixed Calendar */}
      <div className="w-full xl:w-[450px] shrink-0">
        <div className="sticky top-24">
          <div className="neo-box !p-4">
            <div className="flex justify-between items-center mb-4 border-b-2 border-gray-200 pb-2">
              <h3 className="text-lg font-black tracking-widest flex items-center gap-2">
                <CalendarIcon size={20} />
                契期曆
              </h3>
              <div className="flex items-center gap-2">
                <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))} className="p-1 hover:bg-gray-100">
                  <ChevronLeft size={16} />
                </button>
                <span className="text-sm font-bold tracking-widest">{format(currentMonth, 'yyyy/MM')}</span>
                <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))} className="p-1 hover:bg-gray-100">
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {['日', '一', '二', '三', '四', '五', '六'].map(d => (
                <div key={d} className="text-center text-xs font-bold tracking-widest py-1 border-b border-[#53565b]">{d}</div>
              ))}
              {Array.from({ length: daysInMonth[0].getDay() }).map((_, i) => <div key={`empty-${i}`} />)}
              {daysInMonth.map(day => {
                const dayEvents: { order: any, stage: string, dateStr: string }[] = [];
                
                allOrders.forEach(o => {
                  if (o.expectedDates) {
                    Object.entries(o.expectedDates).forEach(([stage, dateStr]) => {
                      try {
                        if (isSameDay(parseISO(dateStr as string), day)) {
                          dayEvents.push({ order: o, stage, dateStr: dateStr as string });
                        }
                      } catch(e) {}
                    });
                  }
                });

                return (
                  <div key={day.toISOString()} className={cn(
                    "min-h-[80px] border p-1.5 transition-colors overflow-hidden",
                    isSameDay(day, new Date()) ? "border-[#53565b] bg-gray-100/30" : "border-gray-200 hover:border-gray-400"
                  )}>
                    <div className="text-right text-xs font-bold mb-1">{format(day, 'd')}</div>
                    <div className="space-y-1">
                      {dayEvents.map((event, idx) => {
                        const stageLabel = STATUS_NODES.find(n => n.id === event.stage)?.label || event.stage;
                        let bgColor = "bg-[#53565b]"; // default black
                        if (event.stage === 'draft') bgColor = "bg-gray-400";
                        if (event.stage === 'lineart') bgColor = "bg-gray-500";
                        if (event.stage === 'coloring') bgColor = "bg-gray-600";

                        return (
                          <button 
                            key={`${event.order.id}-${idx}`}
                            onClick={() => scrollToOrder(event.order.id)}
                            className={cn("block w-full text-left text-[10px] truncate text-white px-1.5 py-1 hover:opacity-80 transition-opacity", bgColor)}
                            title={`${event.order.title} - ${stageLabel}`}
                          >
                            {event.order.title}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* Lightbox Modal */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <img 
            src={lightboxImage} 
            alt="Full size reference" 
            className="max-w-full max-h-full object-contain"
          />
        </div>
      )}
    </motion.div>
  );
}
