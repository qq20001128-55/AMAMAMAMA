import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, Edit2, Save, Trash2, Power, PowerOff, ExternalLink, X, CheckCircle2 } from 'lucide-react';
import { collection, query, orderBy, getDocs, getDoc, doc, updateDoc, deleteDoc, setDoc, limit, startAfter, serverTimestamp, where } from 'firebase/firestore';
import { db, storage } from '../firebase';
import { cn, STATUS_NODES, WORKFLOW_OPTIONS, getWorkflowNodes, compressImage } from '../lib/utils';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO, isSameMonth } from 'date-fns';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { addDoc } from 'firebase/firestore';
import Modal from './Modal';
import emailjs from '@emailjs/browser';

interface AdminDashboardProps {
  onBack: () => void;
  user: User | null;
}

export default function AdminDashboard({ onBack, user }: AdminDashboardProps) {
  const [orders, setOrders] = useState<any[]>([]);
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [priceList, setPriceList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [commissionStatus, setCommissionStatus] = useState<'open' | 'closed'>('open');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>(null);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [priceEditData, setPriceEditData] = useState<any>(null);
  const [priceUploading, setPriceUploading] = useState(false);

  const [portfolioCategories, setPortfolioCategories] = useState<any[]>([]);
  const [artworks, setArtworks] = useState<any[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [artworkUploading, setArtworkUploading] = useState(false);

  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const isAdmin = user?.email === 'sara20001128@gmail.com';

  const [siteConfig, setSiteConfig] = useState<any>({ homeBgUrl: '', pageBgUrl: '', titleStyleUrl: '', faviconUrl: '', logoUrl: '', themeColor: '#d4af37', announcement: { text: '', isActive: false } });
  const [siteConfigUploading, setSiteConfigUploading] = useState<'homeBg' | 'pageBg' | 'titleStyle' | 'favicon' | 'logo' | null>(null);

  const [announcementInput, setAnnouncementInput] = useState('');

  const [activeModal, setActiveModal] = useState<'orders' | 'calendarDay' | null>(null);
  const [modalOrdersType, setModalOrdersType] = useState<'pending' | 'completed' | 'all'>('all');
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | null>(null);

  const [acceptPrices, setAcceptPrices] = useState<Record<string, string>>({});

  // 情報部自動化同步系統
  const [intelTitle, setIntelTitle] = useState('');
  const [intelText, setIntelText] = useState('');
  const [intelTags, setIntelTags] = useState('');
  const [intelFiles, setIntelFiles] = useState<File[]>([]);
  const [intelSyncing, setIntelSyncing] = useState(false);
  const [intelCleaning, setIntelCleaning] = useState(false);

  useEffect(() => {
    fetchOrders();
    fetchAllOrders();
    fetchSettings();
    fetchPriceList();
    fetchPortfolioData();
    fetchSiteConfig();
  }, []);

  const fetchSiteConfig = async () => {
    try {
      const docSnap = await getDoc(doc(db, 'settings', 'siteConfig'));
      if (docSnap.exists()) {
        const data = docSnap.data();
        setSiteConfig(data);
        if (data.announcement) {
          setAnnouncementInput(data.announcement.text || '');
        }
      } else {
        await setDoc(doc(db, 'settings', 'siteConfig'), { homeBgUrl: '', pageBgUrl: '', titleStyleUrl: '', faviconUrl: '', logoUrl: '', themeColor: '#d4af37', announcement: { text: '', isActive: false } });
      }
    } catch (err) {
      console.error('Fetch site config error:', err);
    }
  };

  const handleSaveAnnouncement = async (isActive: boolean) => {
    try {
      const newConfig = { 
        ...siteConfig, 
        announcement: { text: announcementInput, isActive } 
      };
      await setDoc(doc(db, 'settings', 'siteConfig'), newConfig, { merge: true });
      setSiteConfig(newConfig);
      alert('公告更新成功！');
    } catch (err) {
      console.error('Save announcement error:', err);
      alert('更新失敗');
    }
  };

  const handleDeleteAnnouncement = async () => {
    if (!window.confirm('確定要刪除公告內容嗎？')) return;
    try {
      setAnnouncementInput('');
      const newConfig = { 
        ...siteConfig, 
        announcement: { text: '', isActive: false } 
      };
      await setDoc(doc(db, 'settings', 'siteConfig'), newConfig, { merge: true });
      setSiteConfig(newConfig);
    } catch (err) {
      console.error('Delete announcement error:', err);
    }
  };

  const handleSiteConfigUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'homeBg' | 'pageBg' | 'titleStyle' | 'favicon' | 'logo') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSiteConfigUploading(type);
    try {
      const storageRef = ref(storage, `system/custom_ui/${type}.png`);
      const compressedBlob = await compressImage(file);
      await uploadBytes(storageRef, compressedBlob, { cacheControl: 'public,max-age=31536000' });
      const url = await getDownloadURL(storageRef);
      
      const newConfig = { ...siteConfig, [`${type}Url`]: url };
      await setDoc(doc(db, 'settings', 'siteConfig'), newConfig, { merge: true });
      setSiteConfig(newConfig);
      alert('上傳成功！');
    } catch (err) {
      console.error('Upload site config error:', err);
      alert('上傳失敗，請稍後再試。');
    } finally {
      setSiteConfigUploading(null);
    }
  };

  const handleDeleteSiteImage = async (type: 'homeBg' | 'pageBg' | 'titleStyle' | 'favicon' | 'logo') => {
    if (!window.confirm('確定要刪除此圖片並恢復預設嗎？')) return;
    try {
      const storageRef = ref(storage, `system/custom_ui/${type}.png`);
      await deleteObject(storageRef).catch(err => {
        if (err.code !== 'storage/object-not-found') throw err;
      });
      
      const newConfig = { ...siteConfig, [`${type}Url`]: '' };
      await setDoc(doc(db, 'settings', 'siteConfig'), newConfig, { merge: true });
      setSiteConfig(newConfig);
    } catch (err) {
      console.error('Delete site config image error:', err);
      alert('刪除失敗，請稍後再試。');
    }
  };

  const handleThemeColorChange = async (color: string) => {
    const newConfig = { ...siteConfig, themeColor: color };
    setSiteConfig(newConfig);
    try {
      await setDoc(doc(db, 'settings', 'siteConfig'), newConfig, { merge: true });
    } catch (err) {
      console.error('Update theme color error:', err);
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
      // Only fetch active orders 
      const allowedStatuses = ['queued', 'rough_sketch', 'draft', 'colored_sketch'];
      let q = query(collection(db, 'orders'), where('status', 'in', allowedStatuses), orderBy('createdAt', 'desc'), limit(10));
      if (isNext && lastDoc) {
        q = query(collection(db, 'orders'), where('status', 'in', allowedStatuses), orderBy('createdAt', 'desc'), startAfter(lastDoc), limit(10));
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
      await setDoc(doc(db, 'settings', 'global'), { commissionStatus: newStatus }, { merge: true });
      setCommissionStatus(newStatus);
    } catch (err) {
      console.error('Toggle commission error:', err);
    }
  };

  const handleEdit = (order: any) => {
    setEditingId(order.id);
    setEditData({ ...order });
  };

  const handleSave = async () => {
    if (!editingId) return;
    try {
      const oldOrder = orders.find(o => o.id === editingId) || allOrders.find(o => o.id === editingId);
      let newProgressHistory = { ...(editData.progressHistory || {}) };
      let statusChanged = false;
      
      if (oldOrder && oldOrder.status !== editData.status) {
        newProgressHistory[editData.status] = {
          ...newProgressHistory[editData.status],
          updatedAt: serverTimestamp(),
          dateString: newProgressHistory[editData.status]?.dateString || new Date().toISOString()
        };
        statusChanged = true;
      }

      const updatedData: any = {
        ...editData,
        progressHistory: newProgressHistory
      };

      // 確保 orderNo 只在委託正式成立（脫離 pending）時產生一次並永久儲存
      if (oldOrder && !oldOrder.orderNo && editData.status !== 'pending' && editData.status !== 'closed') {
        const generatedOrderNo = `#MAA-${Math.random().toString(36).substring(2, 6).toUpperCase()}${Math.floor(Math.random() * 100)}`;
        updatedData.orderNo = generatedOrderNo;
      }

      await updateDoc(doc(db, 'orders', editingId), updatedData);
      
      // If status is no longer active, remove from list
      const allowedStatuses = ['queued', 'rough_sketch', 'draft', 'colored_sketch'];
      if (!allowedStatuses.includes(updatedData.status)) {
        setOrders(prev => prev.filter(o => o.id !== editingId));
      } else {
        setOrders(prev => prev.map(o => o.id === editingId ? { ...updatedData } : o));
      }
      setAllOrders(prev => prev.map(o => o.id === editingId ? { ...updatedData } : o));
      setEditingId(null);

      if (statusChanged && oldOrder.email) {
        const orderNodes = getWorkflowNodes(editData.workflow || oldOrder.workflow);
        const stageLabel = orderNodes.find(n => n.id === editData.status)?.label || editData.status;
        const newlyGeneratedOrderNoStr = (!oldOrder.orderNo && updatedData.orderNo) ? `<p>專屬訂單編號：<strong>${updatedData.orderNo}</strong></p>` : '';
        const emailHtml = `
          <p>承契者您好：</p>
          <p>您的委託項目 <strong>${oldOrder.title}</strong> 已有新的進度更新！</p>
          ${newlyGeneratedOrderNoStr}
          <p>目前階段：<strong>${stageLabel}</strong></p>
          <p>請前往龍契局網站查詢詳細進度與預覽圖。</p>
          <p>——瑪阿</p>
        `;
        await addDoc(collection(db, 'mail'), {
          to: oldOrder.email,
          message: {
            subject: `【龍契局】委託進度更新：${stageLabel}`,
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
      const ext = 'webp'; // Force webp extension due to compression
      const storageRef = ref(storage, `orders/${editingId}_${stage}.${ext}`);
      const compressedBlob = await compressImage(file);
      await uploadBytes(storageRef, compressedBlob, { cacheControl: 'public,max-age=31536000' });
      const url = await getDownloadURL(storageRef);
      
      const newProgressImages = { ...(editData.progressImages || {}) };
      newProgressImages[stage] = url;

      setEditData({ ...editData, progressImages: newProgressImages });
      alert('預覽圖上傳成功！請記得點擊「儲存修改」才會生效。');
    } catch (err) {
      console.error('Upload stage image error:', err);
      alert('上傳失敗，請稍後再試。');
    }
  };

  const handleDeleteStageImage = async (stage: string) => {
    if (!window.confirm('確定要刪除此階段的預覽圖嗎？請記得點擊「儲存修改」。')) return;
    try {
      const newProgressImages = { ...(editData.progressImages || {}) };
      delete newProgressImages[stage];
      setEditData({ ...editData, progressImages: newProgressImages });
    } catch (err) {
      console.error('Delete stage image error:', err);
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

  const handleAcceptOrder = async (order: any) => {
    const price = acceptPrices[order.id];
    if (!price || !price.trim()) {
      alert('局長，請先填寫酬金金額');
      return;
    }
    
    if (!window.confirm('確定要接收此委託嗎？')) return;
    try {
      const newHistory = { ...(order.progressHistory || {}) };
      newHistory['queued'] = { updatedAt: serverTimestamp(), dateString: new Date().toISOString() };
      const generatedOrderNo = `#MAA-${Math.random().toString(36).substring(2, 6).toUpperCase()}${Math.floor(Math.random() * 100)}`;
      const updatedData: any = { 
        status: 'queued', 
        progressHistory: newHistory,
        orderNo: generatedOrderNo,
        price: price
      };
      
      await updateDoc(doc(db, 'orders', order.id), updatedData);
      
      const fullUpdatedOrder = { ...order, ...updatedData };
      setOrders(prev => [fullUpdatedOrder, ...prev]);
      setAllOrders(prev => prev.map(o => o.id === order.id ? fullUpdatedOrder : o));
      
      if (order.email) {
        try {
          await emailjs.send(
            'service_tf2ftrl',
            'template_z79vc6n',
            {
              name: order.nickname || '委託人',
              email: order.email,
              order_no: generatedOrderNo,
              price: price
            }
          );
          alert('契成，通知已傳達');
        } catch (emailErr) {
          console.error('EmailJS error:', emailErr);
          alert('法陣失靈，請檢查網路或憑證');
        }
      }
      
      // Clean up the price input state
      setAcceptPrices(prev => {
        const next = { ...prev };
        delete next[order.id];
        return next;
      });
    } catch (err) {
      console.error('Accept order error:', err);
      alert('操作失敗，請稍後再試。');
    }
  };

  const handleRejectOrder = async (order: any) => {
    if (!window.confirm('確定要婉拒此委託嗎？')) return;
    try {
      const newHistory = { ...(order.progressHistory || {}) };
      newHistory['closed'] = { updatedAt: serverTimestamp(), dateString: new Date().toISOString() };
      const updatedData = { status: 'closed', progressHistory: newHistory };
      
      await updateDoc(doc(db, 'orders', order.id), updatedData);
      setOrders(prev => prev.filter(o => o.id !== order.id));
      setAllOrders(prev => prev.map(o => o.id === order.id ? { ...order, ...updatedData } : o));
      
      if (order.email) {
        try {
          await emailjs.send(
            'service_tf2ftrl',
            'template_ulbq1cf',
            {
              name: order.nickname || '委託人',
              email: order.email,
              order_no: order.orderNo || '處理中'
            }
          );
          alert('已婉拒，通知已傳達');
        } catch (emailErr) {
          console.error('EmailJS error:', emailErr);
          alert('法陣失靈，請檢查網路或憑證');
        }
      }
    } catch (err) {
      console.error('Reject order error:', err);
      alert('操作失敗，請稍後再試。');
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      const newCat = {
        name: newCategoryName,
        order: portfolioCategories.length
      };
      const docRef = await addDoc(collection(db, 'portfolioCategories'), newCat);
      setPortfolioCategories([...portfolioCategories, { id: docRef.id, ...newCat }]);
      setNewCategoryName('');
      if (!selectedCategoryId) setSelectedCategoryId(docRef.id);
    } catch (err) {
      console.error('Add category error:', err);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!window.confirm('確定刪除此分類？相關作品將會失去分類。')) return;
    try {
      await deleteDoc(doc(db, 'portfolioCategories', id));
      setPortfolioCategories(portfolioCategories.filter(c => c.id !== id));
      if (selectedCategoryId === id) setSelectedCategoryId('');
    } catch (err) {
      console.error('Delete category error:', err);
    }
  };

  const handleArtworkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !selectedCategoryId) return;

    setArtworkUploading(true);
    try {
      const newArtworks = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const compressedBlob = await compressImage(file);
        const storageRef = ref(storage, `portfolio/${Date.now()}_${i}.webp`);
        await uploadBytes(storageRef, compressedBlob, { cacheControl: 'public,max-age=31536000' });
        const url = await getDownloadURL(storageRef);
        
        const artData = {
          categoryId: selectedCategoryId,
          imageUrl: url,
          createdAt: serverTimestamp()
        };
        const docRef = await addDoc(collection(db, 'artworks'), artData);
        newArtworks.push({ id: docRef.id, ...artData });
      }
      setArtworks(prev => [...newArtworks, ...prev]);
      alert('作品上傳成功！');
    } catch (err) {
      console.error('Upload artwork error:', err);
      alert('上傳失敗，請稍後再試。');
    } finally {
      setArtworkUploading(false);
    }
  };

  const handleDeleteArtwork = async (id: string) => {
    if (!window.confirm('確定刪除此作品？')) return;
    try {
      await deleteDoc(doc(db, 'artworks', id));
      setArtworks(artworks.filter(a => a.id !== id));
    } catch (err) {
      console.error('Delete artwork error:', err);
    }
  };

  const handleIntelSync = async () => {
    if (!intelTitle.trim() || !intelText.trim() || intelFiles.length === 0) {
      alert('請填寫標題、內文並選擇至少一張圖片。');
      return;
    }

    setIntelSyncing(true);
    let uploadedImageUrls: string[] = [];
    let uploadedStoragePaths: string[] = [];

    try {
      // 1. 上傳所有圖片到 Firebase Storage
      const uploadPromises = intelFiles.map(async (file, i) => {
        const fileName = `intelligence/${Date.now()}_${i}_${file.name}`;
        const storageRefObj = ref(storage, fileName);
        const compressedBlob = await compressImage(file);
        await uploadBytes(storageRefObj, compressedBlob, { cacheControl: 'public,max-age=31536000' });
        const url = await getDownloadURL(storageRefObj);
        return { url, fileName };
      });
      
      const uploadResults = await Promise.all(uploadPromises);
      uploadedImageUrls = uploadResults.map(r => r.url);
      uploadedStoragePaths = uploadResults.map(r => r.fileName);

      // 2. 存入 Firestore 紀錄
      const cleanupAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours later
      const intelDocRef = await addDoc(collection(db, 'intelligence_logs'), {
        title: intelTitle,
        text: intelText,
        tags: intelTags.split(',').map(t => t.trim()).filter(Boolean),
        image_urls: uploadedImageUrls,
        storage_paths: uploadedStoragePaths,
        status: 'Pending Sync',
        cleanup_at: cleanupAt.getTime(),
        createdAt: serverTimestamp()
      });

      // 3. 發送 Webhook 請求
      // 為了讓 Make.com 能直接將網址對應到 FB 發文的 Photo 1, Photo 2..., 我們將生成的網址攤平為 image_1, image_2...
      const webhookPayload: any = {
        title: intelTitle,
        text: intelText,
        tags: intelTags.split(',').map(t => t.trim()).filter(Boolean),
        // 為了相容性同時保留陣列跟獨立物件
        image_urls_array: uploadedImageUrls,
        image_urls: uploadedImageUrls.map(url => ({ type: 'url', url }))
      };
      
      // 動態寫入 image_1, image_2, image_3 ... 到 payload
      uploadedImageUrls.forEach((url, index) => {
        webhookPayload[`image_${index + 1}`] = url;
      });

      const webhookResponse = await fetch('https://hook.eu1.make.com/y6sjn7hy57a7oeit8rcgyuobfajpff0u', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookPayload)
      });

      if (!webhookResponse.ok) {
        throw new Error(`Webhook failed with status: ${webhookResponse.status}`);
      }

      // 4. Webhook 成功且回傳 200 後，改為隔天銷毀，不再立刻刪除
      await updateDoc(intelDocRef, {
        status: 'Synced (Pending Purge)'
      });

      alert('同步成功，圖檔將於24小時後銷毀。');
      
      // 清空表單
      setIntelTitle('');
      setIntelText('');
      setIntelTags('');
      setIntelFiles([]);
      const fileInput = document.getElementById('intelFileInput') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

    } catch (err: any) {
      console.error('Intel Sync Error:', err);
      alert('同步失敗，卷宗已保留在本地。');
    } finally {
      setIntelSyncing(false);
    }
  };

  const handleCleanupExpiredIntel = async () => {
    if (!window.confirm('確定要清理所有已過期（滿24小時）的情報部圖檔嗎？')) return;
    
    setIntelCleaning(true);
    let cleanedCount = 0;

    try {
      const q = query(collection(db, 'intelligence_logs'), where('status', '==', 'Synced (Pending Purge)'));
      const snap = await getDocs(q);
      const now = Date.now();

      for (const docSnap of snap.docs) {
        const data = docSnap.data();
        if (data.cleanup_at && data.cleanup_at <= now) {
          try {
            // Support legacy storage_path (single string) AND new storage_paths (array)
            if (data.storage_paths && Array.isArray(data.storage_paths)) {
              for (const path of data.storage_paths) {
                try {
                  const fileRef = ref(storage, path);
                  await deleteObject(fileRef);
                } catch (e) {
                  console.error('Failed to delete specific storage file:', path, e);
                }
              }
            } else if (data.storage_path) {
              try {
                const fileRef = ref(storage, data.storage_path);
                await deleteObject(fileRef);
              } catch (e) {}
            }
            
            await updateDoc(doc(db, 'intelligence_logs', docSnap.id), {
              image_urls: [],
              image_url: '', // Clean up legacy field
              status: 'Synced & Purged'
            });
            cleanedCount++;
          } catch (err) {
            console.error(`Failed to clean up doc ${docSnap.id}:`, err);
          }
        }
      }
      
      alert(`清理完成！共銷毀了 ${cleanedCount} 筆過期圖檔。`);
    } catch (err) {
      console.error('Cleanup error:', err);
      alert('清理過程發生錯誤，請查看控制台。');
    } finally {
      setIntelCleaning(false);
    }
  };

  const handleAddPriceItem = async () => {
    try {
      const newItem = {
        title: '新項目',
        price: '請輸入價格',
        workflow: 'full',
        description: '委託內容限制與說明...',
        order: priceList.length,
        imageUrl: ''
      };
      const docRef = await addDoc(collection(db, 'priceList'), newItem);
      setPriceList([...priceList, { id: docRef.id, ...newItem }]);
    } catch (err) {
      console.error('Add price item error:', err);
    }
  };

  const handleSavePriceItem = async () => {
    if (!editingPriceId) return;
    try {
      await updateDoc(doc(db, 'priceList', editingPriceId), priceEditData);
      setPriceList(priceList.map(item => item.id === editingPriceId ? priceEditData : item).sort((a, b) => a.order - b.order));
      setEditingPriceId(null);
    } catch (err) {
      console.error('Save price item error:', err);
    }
  };

  const handleDeletePriceItem = async (id: string) => {
    if (!window.confirm('確定刪除此價目項目？')) return;
    try {
      await deleteDoc(doc(db, 'priceList', id));
      setPriceList(priceList.filter(item => item.id !== id));
    } catch (err) {
      console.error('Delete price item error:', err);
    }
  };

  const handlePriceImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingPriceId) return;

    setPriceUploading(true);
    try {
      const storageRef = ref(storage, `priceList/${editingPriceId}.webp`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setPriceEditData({ ...priceEditData, imageUrl: url });
    } catch (err) {
      console.error('Upload price image error:', err);
      alert('上傳失敗');
    } finally {
      setPriceUploading(false);
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

  const totalOrders = allOrders.length;
  const completedOrders = allOrders.filter(o => o.status === 'completed' || o.status === 'delivered').length;
  const pendingOrders = totalOrders - completedOrders;

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth)
  });

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-[1600px] mx-auto px-4 sm:px-6 py-10"
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 border-b-2 border-[#53565b] pb-6">
        <div>
          <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-[#53565b] mb-4 transition-colors tracking-widest">
            <ChevronLeft size={20} />
            <span>返回大廳</span>
          </button>
          <h2 className="text-4xl font-black tracking-widest">龍契局・後台</h2>
        </div>

        <div className="flex items-center gap-4 neo-box !p-4 border border-[#53565b]">
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

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Left Column: Operations */}
        <div className="xl:col-span-7 w-full flex flex-col gap-8 bg-white/70 backdrop-blur-sm p-6 border border-[#53565b]">
          
          {/* Order Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div 
              className="neo-box text-center cursor-pointer hover:bg-gray-50 transition-colors border border-[#53565b]"
              onClick={() => { setModalOrdersType('all'); setActiveModal('orders'); }}
            >
              <p className="text-sm tracking-widest text-gray-500 mb-2">總書契數</p>
              <p className="text-4xl font-black">{totalOrders}</p>
            </div>
            <div 
              className="neo-box text-center cursor-pointer hover:bg-gray-50 transition-colors border border-[#53565b]"
              onClick={() => { setModalOrdersType('pending'); setActiveModal('orders'); }}
            >
              <p className="text-sm tracking-widest text-gray-500 mb-2">待解之契 (排單/製作中)</p>
              <p className="text-4xl font-black text-[#53565b]">{pendingOrders}</p>
            </div>
            <div 
              className="neo-box text-center cursor-pointer hover:bg-gray-50 transition-colors border border-[#53565b]"
              onClick={() => { setModalOrdersType('completed'); setActiveModal('orders'); }}
            >
              <p className="text-sm tracking-widest text-gray-500 mb-2">已結之契</p>
              <p className="text-4xl font-black text-gray-800">{completedOrders}</p>
            </div>
          </div>

          {/* Pending / Confirm Orders */}
          <div className="neo-box border border-[#53565b]">
            <h3 className="text-xl font-black tracking-widest mb-6 text-[#53565b] border-b border-[#53565b]/20 pb-2">待確定委託</h3>
            <div className="space-y-4">
              {allOrders
                .filter(o => o.status === 'pending')
                .sort((a, b) => {
                  const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
                  const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
                  return timeA - timeB;
                })
                .map(order => (
                <div key={order.id} className="p-4 border border-[#53565b] bg-gray-50 flex flex-col md:flex-row justify-between gap-4">
                  <div>
                    <h4 className="text-lg font-bold tracking-widest"><span className="font-mono text-[#53565b] mr-2 text-sm">{order.orderNo || '處理中...'}</span>{order.title}</h4>
                    <p className="text-sm text-gray-500 tracking-widest">{order.category} | {order.nickname}</p>
                  </div>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <span className="inline-block px-3 py-1 bg-gray-300 text-gray-800 text-xs font-bold tracking-widest">
                      {order.status === 'pending' ? '確認中' : (getWorkflowNodes(order.workflow).find(n => n.id === order.status)?.label || '資料已歸檔')}
                    </span>
                    <div className="flex flex-wrap items-center gap-2 mt-2 sm:mt-0">
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-gray-500 font-bold hidden sm:inline-block">報價金額</label>
                        <input
                          type="text"
                          placeholder="請輸入報價"
                          className="px-2 py-1 border border-[#53565b] text-sm w-24 focus:outline-none focus:ring-1 focus:ring-[#53565b]"
                          value={acceptPrices[order.id] || ''}
                          onChange={(e) => setAcceptPrices(prev => ({ ...prev, [order.id]: e.target.value }))}
                        />
                      </div>
                      <button onClick={() => handleAcceptOrder(order)} className="flex items-center gap-1 px-3 py-1 bg-[#53565b] text-[#fafafa] text-sm tracking-widest hover:bg-gray-800 transition-colors">
                        <CheckCircle2 size={14} /> 接收
                      </button>
                      <button onClick={() => handleRejectOrder(order)} className="flex items-center gap-1 px-3 py-1 border border-[#53565b] text-[#53565b] text-sm tracking-widest hover:bg-gray-100 transition-colors">
                        <X size={14} /> 婉拒
                      </button>
                      <button 
                        onClick={() => {
                          setModalOrdersType('pending');
                          setActiveModal('orders');
                          setTimeout(() => {
                            const el = document.getElementById(`order-${order.id}`);
                            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          }, 100);
                        }}
                        className="text-sm text-[#53565b] hover:font-bold tracking-widest flex items-center gap-1 ml-2"
                      >
                        <ExternalLink size={14} /> 詳情
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {allOrders.filter(o => o.status === 'pending').length === 0 && (
                <div className="text-center py-8 text-gray-400 tracking-widest">
                  目前無待確定之委託。
                </div>
              )}
            </div>
          </div>

          {/* Latest Orders */}
          <div className="neo-box border border-[#53565b]">
            <h3 className="text-xl font-black tracking-widest mb-6 text-[#53565b] border-b border-[#53565b]/20 pb-2">最新進行中卷宗</h3>
            <div className="space-y-4">
              {allOrders
                .filter(o => !['completed', 'delivered', 'closed'].includes(o.status) && o.status !== 'pending')
                .sort((a, b) => {
                  const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
                  const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
                  return timeB - timeA;
                })
                .slice(0, 3)
                .map(order => (
                <div key={order.id} className="p-4 border border-gray-200 bg-white/50 flex flex-col md:flex-row justify-between gap-4">
                  <div>
                    <h4 className="text-lg font-bold tracking-widest"><span className="font-mono text-[#53565b] mr-2 text-sm">{order.orderNo || '處理中...'}</span>{order.title}</h4>
                    <p className="text-sm text-gray-500 tracking-widest">{order.category} | {order.nickname}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="inline-block px-3 py-1 bg-[#53565b] text-[#fafafa] text-xs font-bold tracking-widest">
                      {getWorkflowNodes(order.workflow).find(n => n.id === order.status)?.label || '未知階段'}
                    </span>
                    <button 
                      onClick={() => {
                        setModalOrdersType('all');
                        setActiveModal('orders');
                        setTimeout(() => {
                          const el = document.getElementById(`order-${order.id}`);
                          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }, 100);
                      }}
                      className="text-sm text-[#53565b] hover:underline tracking-widest flex items-center gap-1"
                    >
                      <ExternalLink size={14} /> 詳情
                    </button>
                  </div>
                </div>
              ))}
              {allOrders.filter(o => !['completed', 'delivered', 'closed'].includes(o.status) && o.status !== 'pending').length === 0 && (
                <div className="text-center py-8 text-gray-400 tracking-widest">
                  目前無進行中的卷宗。
                </div>
              )}
            </div>
          </div>

          {/* Announcement Management */}
          <div className="neo-box border border-[#53565b]">
            <div className="flex justify-between items-center mb-6 border-b border-[#53565b]/20 pb-2">
              <h3 className="text-xl font-black tracking-widest text-[#53565b]">首頁公告管理</h3>
              <div className="flex items-center gap-2">
                <span className={cn("inline-block w-3 h-3 rounded-full", siteConfig?.announcement?.isActive ? "bg-green-500" : "bg-gray-300")} />
                <span className="text-sm font-bold tracking-widest text-gray-500">{siteConfig?.announcement?.isActive ? '展示中' : '已封存/隱藏'}</span>
              </div>
            </div>
            <div className="space-y-4">
              <textarea 
                className="input-field min-h-[100px] resize-y tracking-widest leading-loose"
                placeholder="輸入公告內容..."
                value={announcementInput}
                onChange={e => setAnnouncementInput(e.target.value)}
              />
              <div className="flex flex-wrap gap-4 justify-end">
                <button onClick={() => handleDeleteAnnouncement()} className="px-4 py-2 text-sm text-[#53565b] border border-[#53565b] tracking-widest hover:bg-gray-100 transition-colors">
                  清除/刪除公告
                </button>
                <button onClick={() => handleSaveAnnouncement(false)} className="px-4 py-2 text-sm border border-[#53565b] bg-gray-100 text-[#53565b] tracking-widest hover:bg-gray-200 transition-colors">
                  儲存並封存 (不顯示)
                </button>
                <button onClick={() => handleSaveAnnouncement(true)} className="px-4 py-2 text-sm bg-gray-800 text-white tracking-widest hover:bg-gray-900 transition-colors">
                  發佈並展示於首頁
                </button>
              </div>
            </div>
          </div>

          {/* Portfolio Management */}
          <div className="neo-box border border-[#53565b] flex flex-col h-[500px]">
            <h3 className="text-xl font-black tracking-widest mb-4 text-[#53565b] border-b border-[#53565b]/20 pb-2 shrink-0">作品集管理</h3>
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-6">
              <div className="flex flex-col gap-4">
                <div className="flex gap-4">
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
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
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

                <div className="space-y-6">
                  {portfolioCategories.map(cat => {
                    const catArtworks = artworks.filter(a => a.categoryId === cat.id);
                    if (catArtworks.length === 0) return null;
                    
                    return (
                      <div key={cat.id}>
                        <h5 className="text-md font-bold tracking-widest mb-4 text-gray-600">{cat.name}</h5>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                          {catArtworks.map(art => (
                            <div key={art.id} className="relative aspect-square border border-gray-300 group overflow-hidden">
                              <img loading="lazy" src={art.imageUrl} alt={art.title} crossOrigin="anonymous" className="w-full h-full object-cover" />
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
                </div>
              </div>
            </div>
          </div>

          {/* Intelligence Dept */}
          <div className="neo-box border border-[#53565b]">
            <div className="flex justify-between items-center mb-4 border-b border-[#53565b]/20 pb-2">
              <h3 className="text-xl font-black tracking-widest text-[#53565b]">情報部發布中心</h3>
              <button 
                onClick={handleCleanupExpiredIntel}
                disabled={intelCleaning}
                className="px-3 py-1 bg-red-50 text-red-500 border border-red-200 hover:bg-red-500 hover:text-white transition-colors text-xs font-bold tracking-widest flex items-center gap-1 disabled:opacity-50"
              >
                {intelCleaning ? <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <Trash2 size={14} />}
                清理逾期圖檔
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold tracking-widest text-[#53565b] mb-1">情報標題</label>
                  <input 
                    type="text" 
                    className="input-field w-full"
                    placeholder="請輸入發布標題..."
                    value={intelTitle}
                    onChange={(e) => setIntelTitle(e.target.value)}
                    disabled={intelSyncing}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold tracking-widest text-[#53565b] mb-1">情報內文</label>
                  <textarea 
                    className="input-field w-full min-h-[120px]"
                    placeholder="請輸入發布細節與內容..."
                    value={intelText}
                    onChange={(e) => setIntelText(e.target.value)}
                    disabled={intelSyncing}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold tracking-widest text-[#53565b] mb-1">標籤 (用逗號分隔)</label>
                  <input 
                    type="text" 
                    className="input-field w-full"
                    placeholder="例如: 系統公告, 更新, 2026"
                    value={intelTags}
                    onChange={(e) => setIntelTags(e.target.value)}
                    disabled={intelSyncing}
                  />
                </div>
              </div>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold tracking-widest text-[#53565b] mb-1">上傳加密圖檔 (可多選)</label>
                  <div className="relative min-h-[200px] bg-gray-100 border border-dashed border-gray-300 flex flex-wrap gap-4 items-center p-4">
                    {intelFiles.length > 0 ? (
                      intelFiles.map((f, i) => (
                        <div key={i} className="relative w-24 h-24 shadow-sm border border-gray-300 group z-20">
                          <img loading="lazy" src={URL.createObjectURL(f)} alt={`Preview ${i}`} className="w-full h-full object-cover" />
                          <button 
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setIntelFiles(intelFiles.filter((_, index) => index !== i));
                            }}
                            className="absolute top-1 right-1 p-1 bg-white/80 text-[#53565b] opacity-0 group-hover:opacity-100 hover:bg-white transition-all cursor-pointer z-30"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="text-gray-400 tracking-widest text-sm">點擊或拖入上傳多張圖片</span>
                      </div>
                    )}
                    <label className={cn("absolute inset-0 cursor-pointer flex flex-col items-center justify-center bg-black/0 transition-colors z-10", intelFiles.length === 0 ? "hover:bg-black/5" : "")}>
                      <input 
                        id="intelFileInput"
                        type="file" 
                        multiple
                        className="hidden" 
                        accept="image/*" 
                        onChange={(e) => {
                          if (e.target.files) {
                            // 同時保留舊圖，並將新選圖疊加上去，達成「選擇好幾張會分開」的效果
                            setIntelFiles(prev => [...prev, ...Array.from(e.target.files!)]);
                          }
                        }}
                        disabled={intelSyncing}
                      />
                    </label>
                  </div>
                </div>

                <button 
                  onClick={handleIntelSync}
                  disabled={intelSyncing}
                  className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {intelSyncing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      同步中...
                    </>
                  ) : '啟動同步發送'}
                </button>
                <p className="text-xs text-gray-500 tracking-widest mt-2">
                  * 發送成功後將自動設定24小時後銷毀，請定時點擊上方【清理逾期圖檔】執行清除。
                </p>
              </div>
            </div>
          </div>

          {/* System Settings */}
          <div className="neo-box border border-[#53565b]">
            <h3 className="text-xl font-black tracking-widest mb-4 text-[#53565b] border-b border-[#53565b]/20 pb-2">系統設定</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                <p className="text-sm font-bold tracking-widest mb-2">首頁底圖</p>
                <div className="aspect-video bg-gray-100 border border-dashed border-gray-300 relative flex items-center justify-center overflow-hidden group">
                  {siteConfig.homeBgUrl ? (
                    <>
                      <img loading="lazy" src={siteConfig.homeBgUrl} alt="Home Background" crossOrigin="anonymous" className="max-w-full max-h-full object-cover" />
                      <button 
                        onClick={() => handleDeleteSiteImage('homeBg')}
                        className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 z-10"
                        title="刪除"
                      >
                        <X size={16} />
                      </button>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-gray-400">
                      <span className="text-sm tracking-widest mb-1">未上傳</span>
                      <span className="text-xs">（使用預設雲紋）</span>
                    </div>
                  )}
                  <label className="absolute inset-0 bg-black/50 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                    {siteConfigUploading === 'homeBg' ? (
                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <span className="text-xs tracking-widest">上傳首頁底圖</span>
                    )}
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleSiteConfigUpload(e, 'homeBg')} disabled={siteConfigUploading !== null} />
                  </label>
                </div>
              </div>
              <div>
                <p className="text-sm font-bold tracking-widest mb-2">分頁底圖</p>
                <div className="aspect-video bg-gray-100 border border-dashed border-gray-300 relative flex items-center justify-center overflow-hidden group">
                  {siteConfig.pageBgUrl ? (
                    <>
                      <img loading="lazy" src={siteConfig.pageBgUrl} alt="Page Background" crossOrigin="anonymous" className="max-w-full max-h-full object-cover" />
                      <button 
                        onClick={() => handleDeleteSiteImage('pageBg')}
                        className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 z-10"
                        title="刪除"
                      >
                        <X size={16} />
                      </button>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-gray-400">
                      <span className="text-sm tracking-widest mb-1">未上傳</span>
                      <span className="text-xs">（使用預設雲紋）</span>
                    </div>
                  )}
                  <label className="absolute inset-0 bg-black/50 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                    {siteConfigUploading === 'pageBg' ? (
                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <span className="text-xs tracking-widest">上傳分頁底圖</span>
                    )}
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleSiteConfigUpload(e, 'pageBg')} disabled={siteConfigUploading !== null} />
                  </label>
                </div>
              </div>
              <div>
                <p className="text-sm font-bold tracking-widest mb-2">標題裝飾圖</p>
                <div className="aspect-square max-w-[200px] bg-gray-100 border border-dashed border-gray-300 relative flex items-center justify-center overflow-hidden group">
                  {siteConfig.titleStyleUrl ? (
                    <>
                      <img loading="lazy" src={siteConfig.titleStyleUrl} alt="Title Style" crossOrigin="anonymous" className="max-w-full max-h-full object-contain p-4" />
                      <button 
                        onClick={() => handleDeleteSiteImage('titleStyle')}
                        className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 z-10"
                        title="刪除"
                      >
                        <X size={16} />
                      </button>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-gray-400">
                      <span className="text-sm tracking-widest mb-1">未上傳</span>
                      <span className="text-xs">（使用預設文字）</span>
                    </div>
                  )}
                  <label className="absolute inset-0 bg-black/50 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                    {siteConfigUploading === 'titleStyle' ? (
                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <span className="text-xs tracking-widest">上傳標題裝飾圖</span>
                    )}
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleSiteConfigUpload(e, 'titleStyle')} disabled={siteConfigUploading !== null} />
                  </label>
                </div>
              </div>
              <div>
                <p className="text-sm font-bold tracking-widest mb-2">左上角 ICON</p>
                <div className="aspect-square max-w-[200px] min-w-[150px] bg-gray-100 border border-dashed border-gray-300 relative flex items-center justify-center overflow-hidden group">
                  {siteConfig.logoUrl ? (
                    <>
                      <img loading="lazy" src={siteConfig.logoUrl} alt="Logo" crossOrigin="anonymous" className="max-w-full max-h-full object-contain p-4" />
                      <button 
                        onClick={() => handleDeleteSiteImage('logo')}
                        className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 z-10"
                        title="刪除"
                      >
                        <X size={16} />
                      </button>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-gray-400">
                      <span className="text-sm tracking-widest mb-1">未上傳</span>
                      <span className="text-xs">（使用預設文字）</span>
                    </div>
                  )}
                  <label className="absolute inset-0 bg-black/50 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                    {siteConfigUploading === 'logo' ? (
                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <span className="text-xs tracking-widest text-center">上傳左上角<br/>導覽列 ICON</span>
                    )}
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleSiteConfigUpload(e, 'logo')} disabled={siteConfigUploading !== null} />
                  </label>
                </div>
              </div>
              <div>
                <p className="text-sm font-bold tracking-widest mb-2">網頁 ICON</p>
                <div className="aspect-square max-w-[200px] min-w-[150px] bg-gray-100 border border-dashed border-gray-300 relative flex items-center justify-center overflow-hidden group">
                  {siteConfig.faviconUrl ? (
                    <>
                      <img loading="lazy" src={siteConfig.faviconUrl} alt="Favicon" crossOrigin="anonymous" className="max-w-full max-h-full object-contain p-4" />
                      <button 
                        onClick={() => handleDeleteSiteImage('favicon')}
                        className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 z-10"
                        title="刪除"
                      >
                        <X size={16} />
                      </button>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-gray-400">
                      <span className="text-sm tracking-widest mb-1">未上傳</span>
                      <span className="text-xs">（使用預設圖示）</span>
                    </div>
                  )}
                  <label className="absolute inset-0 bg-black/50 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                    {siteConfigUploading === 'favicon' ? (
                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <span className="text-xs tracking-widest text-center">上傳瀏覽器<br/>分頁 ICON</span>
                    )}
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleSiteConfigUpload(e, 'favicon')} disabled={siteConfigUploading !== null} />
                  </label>
                </div>
              </div>
            </div>
            <div className="mt-6 border-t border-gray-200 pt-4">
              <p className="text-sm font-bold tracking-widest mb-2">主題強調色</p>
              <div className="flex items-center gap-4">
                <input 
                  type="color" 
                  value={siteConfig.themeColor || '#d4af37'} 
                  onChange={(e) => handleThemeColorChange(e.target.value)}
                  className="w-10 h-10 rounded cursor-pointer border-0 p-0"
                />
                <span className="font-mono text-sm">{siteConfig.themeColor || '#d4af37'}</span>
              </div>
            </div>
          </div>

          {/* Price List Settings */}
          <div className="neo-box border border-[#53565b] flex flex-col h-[500px]">
            <div className="flex justify-between items-center mb-4 border-b border-[#53565b]/20 pb-2 shrink-0">
              <h3 className="text-xl font-black tracking-widest text-[#53565b]">價目表設定</h3>
              <button onClick={handleAddPriceItem} className="btn-primary py-1 px-3 text-sm">
                + 新增項目
              </button>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">
              {priceList.map((item) => (
                <div key={item.id} className="p-4 border border-gray-200 bg-white/50 flex flex-col md:flex-row gap-6 items-start">
                  {editingPriceId === item.id ? (
                    <>
                      <div className="w-full md:w-1/3 space-y-4">
                        <div className="aspect-[4/3] bg-gray-100 border border-[#53565b] relative flex items-center justify-center overflow-hidden">
                          {priceEditData.imageUrl ? (
                            <img loading="lazy" src={priceEditData.imageUrl} alt="Preview" crossOrigin="anonymous" className="w-full h-full object-cover" />
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
                          placeholder="委託名稱 (項目)"
                          value={priceEditData.title}
                          onChange={e => setPriceEditData({...priceEditData, title: e.target.value})}
                        />
                        <div className="flex flex-col sm:flex-row gap-4">
                          <input 
                            type="text" 
                            className="input-field" 
                            placeholder="價格 (e.g. 1000起)"
                            value={priceEditData.price || ''}
                            onChange={e => setPriceEditData({...priceEditData, price: e.target.value})}
                          />
                          <select
                            className="input-field"
                            value={priceEditData.workflow || 'full'}
                            onChange={e => setPriceEditData({...priceEditData, workflow: e.target.value})}
                          >
                            <option value="full">排單/粗草/草稿/色草/完稿/已交付</option>
                            <option value="simple">排單/完稿/已交付</option>
                            <option value="mid">排單/草稿/完稿/已交付</option>
                          </select>
                        </div>
                        <textarea 
                          className="input-field flex-1 min-h-[120px] resize-none text-sm leading-loose" 
                          placeholder="內容說明與限制..."
                          value={priceEditData.description}
                          onChange={e => setPriceEditData({...priceEditData, description: e.target.value})}
                        />
                        <div className="flex justify-end gap-4 mt-auto">
                          <button onClick={() => setEditingPriceId(null)} className="px-4 py-2 border border-[#53565b] text-sm tracking-widest hover:bg-gray-100 transition-colors">
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
                      <div className="w-full md:w-1/4 aspect-[4/3] bg-gray-100 border border-[#53565b] overflow-hidden">
                        {item.imageUrl ? (
                          <img loading="lazy" src={item.imageUrl} alt={item.title} crossOrigin="anonymous" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300 text-sm">無圖片</div>
                        )}
                      </div>
                      <div className="w-full md:w-3/4 flex flex-col justify-between h-full">
                        <div>
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="text-lg font-black tracking-widest">{item.title} <span className="text-sm font-normal text-[#d4af37] ml-2">{item.price}</span></h4>
                            <span className="text-xs text-gray-400 font-mono">排序: {item.order}</span>
                          </div>
                          <p className="text-xs text-[#53565b] font-bold tracking-widest mb-2 border-b border-gray-100 pb-1 inline-block">
                            流程：{WORKFLOW_OPTIONS[item.workflow as keyof typeof WORKFLOW_OPTIONS]?.label || '標準'}
                          </p>
                          <p className="text-sm text-gray-600 tracking-widest leading-loose whitespace-pre-wrap line-clamp-3">
                            {item.description}
                          </p>
                        </div>
                        <div className="flex justify-end gap-4 mt-4">
                          <button onClick={() => { setEditingPriceId(item.id); setPriceEditData(item); }} className="flex items-center gap-2 px-3 py-1 border border-[#53565b] text-sm tracking-widest hover:bg-[#53565b] hover:text-[#fafafa] transition-colors">
                            <Edit2 size={14} /> 編輯
                          </button>
                          <button onClick={() => handleDeletePriceItem(item.id)} className="flex items-center gap-2 px-3 py-1 border border-[#53565b] text-[#53565b] text-sm tracking-widest hover:bg-gray-100 transition-colors">
                            <Trash2 size={14} /> 刪除
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
              {priceList.length === 0 && (
                <div className="text-center py-10 text-gray-400 border border-dashed border-gray-200 tracking-widest">
                  目前尚無價目項目。
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Right Column: Calendar */}
        <div className="xl:col-span-5 w-full">
          <div className="sticky top-24 neo-box border border-[#53565b] bg-white/90 backdrop-blur-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black tracking-widest text-[#53565b]">排程日曆</h3>
              <div className="flex items-center gap-4">
                <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <ChevronLeft size={20} />
                </button>
                <span className="text-base font-bold tracking-widest">{format(currentMonth, 'yyyy 年 MM 月')}</span>
                <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200">
              {['日', '一', '二', '三', '四', '五', '六'].map(day => (
                <div key={day} className="bg-gray-50 py-3 text-center text-sm font-bold tracking-widest text-gray-500">
                  {day}
                </div>
              ))}
              {daysInMonth.map((date, i) => {
                const dayOrders = allOrders.filter(o => 
                  o.expectedDates && Object.values(o.expectedDates).some((d: any) => d && isSameDay(parseISO(d), date))
                );
                
                return (
                  <div 
                    key={i} 
                    className={cn(
                      "bg-white min-h-[120px] p-2 transition-colors hover:bg-gray-50 cursor-pointer",
                      !isSameMonth(date, currentMonth) && "bg-gray-50/50 text-gray-400",
                      isSameDay(date, new Date()) && "ring-2 ring-inset ring-[#53565b]"
                    )}
                    onClick={() => {
                      if (dayOrders.length > 0) {
                        setSelectedCalendarDate(date);
                        setActiveModal('calendarDay');
                      }
                    }}
                  >
                    <div className="text-right text-sm mb-1 font-mono">{format(date, 'd')}</div>
                    <div className="space-y-1">
                      {dayOrders.map((order, idx) => (
                        <div key={idx} className="text-[10px] truncate bg-[#53565b] text-white px-1 py-0.5 rounded-sm cursor-pointer" title={`${order.orderNo || '處理中...'} - ${order.title}`} onClick={() => {
                          setModalOrdersType('all');
                          setActiveModal('orders');
                          setTimeout(() => {
                            const el = document.getElementById(`order-${order.id}`);
                            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          }, 100);
                        }}>
                          {order.orderNo || '處理中...'} - {order.title}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Day Modal */}
      <Modal 
        isOpen={activeModal === 'calendarDay'} 
        onClose={() => { setActiveModal(null); setSelectedCalendarDate(null); }} 
        title={selectedCalendarDate ? `${format(selectedCalendarDate, 'yyyy-MM-dd')} 排程卷宗` : '排程卷宗'}
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4">
          {selectedCalendarDate && allOrders.filter(o => 
            o.expectedDates && Object.values(o.expectedDates).some((d: any) => d && isSameDay(parseISO(d), selectedCalendarDate))
          ).map(order => (
            <div key={order.id} className="p-4 border border-gray-200 bg-white flex justify-between items-center">
              <div>
                <h4 className="font-bold tracking-widest"><span className="font-mono text-[#53565b] mr-2">{order.orderNo || '處理中...'}</span>{order.title}</h4>
                <p className="text-sm text-gray-500">{order.category} | {order.nickname}</p>
              </div>
              <button 
                onClick={() => {
                  setModalOrdersType('all');
                  setActiveModal('orders');
                  setTimeout(() => {
                    const el = document.getElementById(`order-${order.id}`);
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }, 100);
                }}
                className="text-sm text-[#53565b] hover:underline flex items-center gap-1"
              >
                <ExternalLink size={14} /> 詳情
              </button>
            </div>
          ))}
        </div>
      </Modal>

      {/* Orders Modal */}
      <Modal 
        isOpen={activeModal === 'orders'} 
        onClose={() => setActiveModal(null)} 
        title={
          modalOrdersType === 'pending' ? '待解之契' : 
          modalOrdersType === 'completed' ? '已結之契' : '全部卷宗'
        }
        maxWidth="max-w-5xl"
      >
        <div className="space-y-6">
          {allOrders
            .filter(o => {
              if (modalOrdersType === 'pending') return o.status === 'pending' || (o.status !== 'completed' && o.status !== 'closed' && o.status !== 'delivered');
              if (modalOrdersType === 'completed') return o.status === 'completed' || o.status === 'delivered';
              return true;
            })
            .map(order => (
            <div key={order.id} id={`order-${order.id}`} className="neo-box transition-colors duration-1000 border border-[#53565b]">
              <div className="flex flex-col lg:flex-row gap-8">
                {/* Left: Info */}
                <div className="flex-1 space-y-4">
                  <div className="flex justify-between items-start border-b border-gray-200 pb-4">
                    <div>
                      <h4 className="text-xl font-black tracking-widest mb-1">{order.title}</h4>
                      <p className="text-sm text-gray-500 tracking-widest">{order.category} | {order.nickname}</p>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-sm tracking-widest bg-[#53565b] text-white px-2 py-1">
                        {order.orderNo || '處理中...'}
                      </span>
                    </div>
                  </div>

                  <div className="text-sm tracking-widest leading-relaxed">
                    <p className="text-gray-500 mb-1">聯絡方式：<span className="text-[#53565b]">{order.contact}</span></p>
                    <p className="text-gray-500 mb-1">需求描述：<span className="text-[#53565b]">{order.description || '無'}</span></p>
                  </div>

                  {/* References */}
                  <div>
                    <p className="text-sm text-gray-500 tracking-widest mb-2">參考資料：</p>
                    <div className="space-y-3">
                      {order.referenceLink && (
                        <div>
                          <a href={order.referenceLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[#53565b] hover:underline text-sm tracking-widest">
                            <ExternalLink size={16} /> 開啟連結
                          </a>
                        </div>
                      )}
                      {order.referenceImages?.length > 0 && (
                        <div className="flex gap-2 overflow-x-auto pb-2">
                          {order.referenceImages.map((img: string, i: number) => (
                            <a key={i} href={img} target="_blank" rel="noopener noreferrer" className="shrink-0">
                              <img loading="lazy" src={img} alt="Ref" crossOrigin="anonymous" className="w-16 h-16 object-cover border border-[#53565b] hover:opacity-80" />
                            </a>
                          ))}
                        </div>
                      )}
                      {(!order.referenceLink && (!order.referenceImages || order.referenceImages.length === 0)) && (
                        <span className="text-sm text-gray-400">無</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Status & Actions */}
                <div className="lg:w-72 flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-gray-200 pt-4 lg:pt-0 lg:pl-8">
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs text-gray-500 tracking-widest mb-2">當前進度</p>
                      {editingId === order.id ? (
                        <select 
                          className="input-field py-2 text-sm appearance-none font-bold"
                          value={editData.status}
                          onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                        >
                          {(order.status === 'pending' ? getWorkflowNodes(editData.workflow || order.workflow) : getWorkflowNodes(editData.workflow || order.workflow).filter(n => n.id !== 'pending')).map(node => (
                            <option key={node.id} value={node.id}>{node.label}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="inline-block px-4 py-2 bg-[#53565b] text-[#fafafa] text-sm font-bold tracking-widest">
                          {getWorkflowNodes(order.workflow).find(n => n.id === order.status)?.label || STATUS_NODES.find(n => n.id === order.status)?.label || '資料已歸檔'}
                        </span>
                      )}
                    </div>

                    {editingId === order.id && (
                      <>
                        <div className="space-y-4 border-t border-gray-200 pt-4">
                          <div className="space-y-2">
                            <p className="text-xs text-gray-500 tracking-widest">當前進度達成日 (可選)</p>
                          <input 
                            type="date"
                            className="input-field py-2 text-sm"
                            value={editData.progressHistory?.[editData.status]?.dateString ? format(parseISO(editData.progressHistory[editData.status].dateString), 'yyyy-MM-dd') : ''}
                            onChange={(e) => {
                              const dateStr = e.target.value ? new Date(e.target.value).toISOString() : null;
                              setEditData({
                                ...editData,
                                progressHistory: {
                                  ...(editData.progressHistory || {}),
                                  [editData.status]: {
                                    ...(editData.progressHistory?.[editData.status] || {}),
                                    dateString: dateStr
                                  }
                                }
                              });
                            }}
                          />
                        </div>
                        {getWorkflowNodes(editData.workflow || order.workflow).filter(n => !['pending', 'queued', 'delivered'].includes(n.id)).map(node => (
                          <div key={node.id} className="space-y-2">
                            <p className="text-xs text-gray-500 tracking-widest">預計{node.label}日 (可選)</p>
                            <input 
                              type="date"
                              className="input-field py-2 text-sm"
                              value={editData.expectedDates?.[node.id] ? format(parseISO(editData.expectedDates[node.id]), 'yyyy-MM-dd') : ''}
                              onChange={(e) => {
                                const dateStr = e.target.value ? new Date(e.target.value).toISOString() : null;
                                setEditData({
                                  ...editData,
                                  expectedDates: { ...editData.expectedDates, [node.id]: dateStr }
                                });
                              }}
                            />
                          </div>
                        ))}
                      </div>
                      
                      {/* Stage Image Uploads */}
                      <div className="mt-6 space-y-3">
                        <p className="text-sm font-bold tracking-widest border-b border-gray-200 pb-2 text-[#53565b]">各階段視覺進度預覽圖</p>
                        {getWorkflowNodes(editData.workflow || order.workflow).filter(n => !['pending', 'queued', 'delivered'].includes(n.id)).map(node => {
                          const stage = node.id;
                          const stageLabel = node.label;
                          const uploadedUrl = editData.progressImages?.[stage];
                          
                          return (
                            <div key={stage} className="p-3 border border-dashed border-gray-300 bg-gray-50 flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <span className="text-xs font-bold tracking-widest w-10 text-[#53565b]">{stageLabel}</span>
                                {uploadedUrl ? (
                                  <a href={uploadedUrl} target="_blank" rel="noopener noreferrer">
                                    <img loading="lazy" src={uploadedUrl} className="w-10 h-10 object-cover border border-gray-300 hover:opacity-80 transition-opacity" alt={`${stageLabel}預覽`} crossOrigin="anonymous" />
                                  </a>
                                ) : (
                                  <span className="text-xs text-gray-400 tracking-widest">未上傳</span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <label className="cursor-pointer text-xs border border-[#53565b] text-[#53565b] px-3 py-1 hover:bg-[#53565b] hover:text-white transition-colors">
                                  {uploadedUrl ? '重新上傳' : '上傳圖片'}
                                  <input 
                                    type="file" 
                                    className="hidden" 
                                    accept="image/*"
                                    onChange={(e) => handleStageImageUpload(e, stage)}
                                  />
                                </label>
                                {uploadedUrl && (
                                  <button 
                                    onClick={() => handleDeleteStageImage(stage)}
                                    className="text-xs text-red-500 border border-red-500 px-3 py-1 hover:bg-red-50 transition-colors"
                                  >
                                    刪除 X
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      </>
                    )}
                  </div>

                  <div className="flex justify-end gap-4 mt-6">
                    {order.status === 'pending' ? (
                      <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2">
                          <label className="text-sm text-gray-500 font-bold">報價金額</label>
                          <input
                            type="text"
                            placeholder="請輸入報價"
                            className="px-3 py-2 border border-[#53565b] text-sm w-32 focus:outline-none focus:ring-1 focus:ring-[#53565b]"
                            value={acceptPrices[order.id] || ''}
                            onChange={(e) => setAcceptPrices(prev => ({ ...prev, [order.id]: e.target.value }))}
                          />
                        </div>
                        <button onClick={() => handleAcceptOrder(order)} className="flex items-center gap-2 px-4 py-2 bg-[#53565b] text-[#fafafa] tracking-widest hover:bg-gray-800 transition-colors">
                          <CheckCircle2 size={16} /> 確認委託
                        </button>
                        <button onClick={() => handleRejectOrder(order)} className="flex items-center gap-2 px-4 py-2 border border-[#53565b] text-[#53565b] tracking-widest hover:bg-gray-100 transition-colors">
                          <X size={16} /> 婉拒
                        </button>
                      </div>
                    ) : editingId === order.id ? (
                      <>
                        <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white tracking-widest hover:bg-gray-900 transition-colors">
                          <Save size={16} /> 儲存
                        </button>
                        <button onClick={() => setEditingId(null)} className="flex items-center gap-2 px-4 py-2 border border-[#53565b] tracking-widest hover:bg-gray-100 transition-colors">
                          取消
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => handleEdit(order)} className="flex items-center gap-2 px-4 py-2 border border-[#53565b] tracking-widest hover:bg-[#53565b] hover:text-[#fafafa] transition-colors">
                          <Edit2 size={16} /> 編輯
                        </button>
                        <button onClick={() => handleDelete(order.id)} className="flex items-center gap-2 px-4 py-2 border border-[#53565b] text-[#53565b] tracking-widest hover:bg-gray-100 transition-colors">
                          <Trash2 size={16} /> 刪除
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {allOrders.filter(o => {
            if (modalOrdersType === 'pending') return o.status === 'pending' || (o.status !== 'completed' && o.status !== 'closed' && o.status !== 'delivered');
            if (modalOrdersType === 'completed') return o.status === 'completed' || o.status === 'delivered';
            return true;
          }).length === 0 && !loading && (
            <div className="py-20 text-center text-gray-400 border border-dashed border-gray-200 mt-4 tracking-widest">
              目前尚無卷宗。
            </div>
          )}
        </div>
      </Modal>

      {/* Lightbox Modal */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setLightboxImage(null)}
        >
          <img loading="lazy" 
            src={lightboxImage} 
            alt="Full size reference" 
            crossOrigin="anonymous"
            className="max-w-full max-h-[90vh] object-contain shadow-2xl border-4 border-[#53565b]"
          />
        </div>
      )}
    </motion.div>
  );
}
