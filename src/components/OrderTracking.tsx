import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, Search, Clock, CheckCircle2, ExternalLink, X } from 'lucide-react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { cn, STATUS_NODES, getWorkflowNodes } from '../lib/utils';
import { format, parseISO } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { SectionTitle } from './SectionTitle';

interface OrderTrackingProps {
  onBack: () => void;
}

export default function OrderTracking({ onBack }: OrderTrackingProps) {
  const [searchId, setSearchId] = useState('');
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [systemSettings, setSystemSettings] = useState<any>({});
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const settingsDoc = await getDoc(doc(db, 'system', 'settings'));
        if (settingsDoc.exists()) {
          setSystemSettings(settingsDoc.data());
        }
      } catch (err) {
        console.error('Fetch settings error:', err);
      }
    };
    fetchSettings();
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchId.trim()) return;

    setLoading(true);
    setError(null);
    setOrder(null);

    try {
      let foundData = null;
      let foundId = null;
      
      // 自動修正規格：去空格並轉大寫
      const term = searchId.trim().toUpperCase();

      // 精準搜尋加上容錯變體 (補齊或去除前綴)
      let variations = [term];
      if (term.startsWith('#MAA-')) {
        variations.push(term.substring(5)); // 純後綴字串
      } else if (term.startsWith('MAA-')) {
        variations.push(`#${term}`); // 補上 #
        variations.push(term.substring(4)); // 純後綴字串
      } else if (term.startsWith('#')) {
        variations.push(`#MAA-${term.substring(1)}`);
      } else {
        variations.push(`#MAA-${term}`); // 完全沒加前綴的人
      }

      variations = Array.from(new Set(variations));

      // 確保針對 Firestore 裡的 orderNo 欄位進行 where 查詢
      for (const variant of variations) {
        const qOrderNo = query(collection(db, 'orders'), where('orderNo', '==', variant));
        
        try {
          const snap = await getDocs(qOrderNo);
          const foundDoc = snap.docs[0];
          
          if (foundDoc) {
            foundData = foundDoc.data();
            foundId = foundDoc.id;
            break;
          }
        } catch (queryErr: any) {
          console.error(`Firebase query error for variant ${variant}:`, queryErr);
          throw new Error(`資料庫讀取異常：${queryErr.message}`);
        }
      }

      if (foundData) {
        setOrder({ id: foundId, ...foundData });
      } else {
        setError(`查無資料。請確認查問編號是否輸入正確 (您輸入的是：${searchId.trim()})。`);
      }
    } catch (err: any) {
      console.error('Search error:', err);
      // 顯示具體的錯誤反饋
      setError(`探問因果時發生錯誤：${err.message || '連線或權限未知錯誤。'}`);
    } finally {
      setLoading(false);
    }
  };

  const orderNodes = order ? getWorkflowNodes(order.workflow) : STATUS_NODES;
  const currentStatusIndex = orderNodes.findIndex(node => node.id === order?.status);

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    try {
      return format(parseISO(dateString), 'yyyy-MM-dd EEEE', { locale: zhTW });
    } catch (e) {
      return '';
    }
  };

  const generateProgressCard = async () => {
    if (!order) return;

    const canvas = document.createElement('canvas');
    // 3:4 ratio for mobile sharing
    canvas.width = 1080;
    canvas.height = 1440;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const drawContent = () => {
      // Decorative elements
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 2;
      ctx.strokeRect(40, 40, canvas.width - 80, canvas.height - 80);
      
      // Text settings
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fafafa';

      // Title
      ctx.font = 'bold 60px "Noto Serif TC", serif';
      ctx.fillText('龍契局・進度卡', canvas.width / 2, 250);

      // Order ID
      ctx.font = '40px monospace';
      ctx.fillStyle = '#d4af37';
      ctx.fillText(order.orderNo || '處理中...', canvas.width / 2, 350);

      // Nickname
      ctx.font = 'bold 50px "Noto Serif TC", serif';
      ctx.fillStyle = '#fafafa';
      ctx.fillText(`委託人：${order.nickname}`, canvas.width / 2, 500);

      // Status
      const statusLabel = order.status === 'pending' ? '確認中' : (orderNodes[currentStatusIndex]?.label || '未知');
      ctx.font = 'bold 80px "Noto Serif TC", serif';
      ctx.fillText(`當前進度：${statusLabel}`, canvas.width / 2, 700);

      // Date
      ctx.font = '30px monospace';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.fillText(`生成日期：${format(new Date(), 'yyyy-MM-dd HH:mm')}`, canvas.width / 2, canvas.height - 150);

      // Download
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `龍契局進度卡_${order.orderNo || '處理中'}.png`;
      link.href = dataUrl;
      link.click();
    };

    const currentStatusId = orderNodes[currentStatusIndex]?.id || 'queued';
    const bgUrl = order.progressImages?.[currentStatusId] || order.progressHistory?.[currentStatusId]?.imageUrl;

    if (bgUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        // Draw background image to cover canvas
        const scale = Math.max(canvas.width / img.width, canvas.height / img.height);
        const x = (canvas.width / 2) - (img.width / 2) * scale;
        const y = (canvas.height / 2) - (img.height / 2) * scale;
        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

        // Overlay transparent black mask
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        drawContent();
      };
      img.onerror = () => {
        ctx.fillStyle = '#53565b';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        drawContent();
      };
      img.src = bgUrl;
    } else {
      ctx.fillStyle = '#53565b';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      drawContent();
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-5xl mx-auto px-6 py-10"
    >
      <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-[#53565b] mb-8 transition-colors tracking-widest">
        <ChevronLeft size={20} />
        <span>返回大廳</span>
      </button>

      <SectionTitle>探問因果</SectionTitle>

      <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4 mb-16 max-w-2xl mx-auto">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="輸入專屬契約編號"
            className="input-field pl-12 bg-white"
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
          />
        </div>
        <button type="submit" disabled={loading} className="btn-primary whitespace-nowrap">
          {loading ? '探問中...' : '探問'}
        </button>
      </form>

      {error && (
        <div className="text-center py-10 text-[#53565b] border-2 border-dashed border-[#53565b] tracking-widest">
          {error}
        </div>
      )}

      {order && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-16"
        >
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-8 border-b-2 border-[#53565b]">
            <div>
              <p className="text-xs text-gray-500 tracking-widest mb-2">契約標題</p>
              <h3 className="text-3xl font-black tracking-widest">{order.title}</h3>
            </div>
            <div className="text-left md:text-right flex flex-col items-start md:items-end gap-4">
              <div>
                <p className="text-xs text-gray-500 tracking-widest mb-2">當前進度</p>
                <p className="text-xl font-bold tracking-widest text-[#53565b]">
                  {order.status === 'pending' ? '確認中' : (orderNodes[currentStatusIndex]?.label || '未知')}
                </p>
              </div>
              <button 
                onClick={generateProgressCard}
                className="px-4 py-2 bg-[#53565b] text-white text-sm tracking-widest hover:bg-[#53565b] transition-colors"
              >
                下載進度卡
              </button>
            </div>
          </div>

          <div className="relative pt-8 pb-16 overflow-x-auto">
            <div className="min-w-[800px]">
              {/* Progress Line */}
              <div className="absolute top-14 left-10 right-10 h-0.5 bg-gray-200 -z-10" />
              <div 
                className="absolute top-14 left-10 h-0.5 bg-[#53565b] transition-all duration-1000 -z-10" 
                style={{ width: `calc(${((Math.max(0, currentStatusIndex)) / (orderNodes.length - 1)) * 100}% - 20px)` }}
              />

              <div className="flex justify-between relative">
                {orderNodes.map((node, index) => {
                  const isCompleted = index <= currentStatusIndex;
                  const isCurrent = index === currentStatusIndex;
                  const historyData = order.progressHistory?.[node.id];
                  const expectedDate = order.expectedDates?.[node.id];

                  return (
                    <div key={node.id} className="flex flex-col items-center group w-24">
                      <div className={cn(
                        "w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all duration-500 bg-[#fafafa] mb-4",
                        isCompleted ? "border-[#53565b] text-[#53565b]" : "border-gray-200 text-gray-300",
                        isCurrent && "ring-4 ring-gray-100 bg-[#53565b] text-white"
                      )}>
                        {isCompleted ? <CheckCircle2 size={24} /> : <Clock size={24} />}
                      </div>
                      <span className={cn(
                        "text-sm tracking-widest transition-colors mb-2 text-center",
                        isCompleted ? "text-[#53565b] font-bold" : "text-gray-400"
                      )}>
                        {node.label}
                      </span>
                      {historyData?.dateString ? (
                        <span className="text-[10px] text-gray-500 text-center tracking-wider">
                          {formatDate(historyData.dateString)}
                        </span>
                      ) : expectedDate ? (
                        <span className="text-[10px] text-gray-400 text-center tracking-wider italic">
                          預計: {formatDate(expectedDate)}
                        </span>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="window-box-octagon lg:col-span-1 space-y-6">
              <h4 className="text-lg font-black tracking-widest border-b-2 border-[#53565b] pb-2 inline-block">契約詳情</h4>
              <div className="space-y-4 text-sm tracking-widest">
                <div>
                  <span className="text-gray-500 block mb-1">委託人</span>
                  <span className="font-bold">{order.nickname}</span>
                </div>
                <div>
                  <span className="text-gray-500 block mb-1">類別</span>
                  <span className="font-bold">{order.category}</span>
                </div>
                <div>
                  <span className="text-gray-500 block mb-1">正式編號</span>
                  <span className="font-mono font-bold">{order.officialOrderId || '尚未分配'}</span>
                </div>
              </div>
            </div>
            
            <div className="lg:col-span-2 space-y-6">
              <h4 className="text-lg font-black tracking-widest border-b-2 border-[#53565b] pb-2 inline-block">參考資料</h4>
              {order.referenceType === 'link' ? (
                <a 
                  href={order.referenceLink} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-[#53565b] hover:underline tracking-widest p-4 border-2 border-dashed border-[#53565b] bg-gray-100/50"
                >
                  <ExternalLink size={20} />
                  前往參考連結
                </a>
              ) : order.referenceImages?.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {order.referenceImages.map((img: string, i: number) => (
                    <div key={i} className="aspect-square border-2 border-[#53565b] overflow-hidden">
                      <img loading="lazy" src={img} alt={`Reference ${i}`} crossOrigin="anonymous" className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-500" />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 tracking-widest">無參考資料</p>
              )}

              {/* Stage Previews */}
              {orderNodes.some((node) => {
                if (['pending', 'queued', 'delivered'].includes(node.id)) return false;
                return order.progressImages?.[node.id] || order.progressHistory?.[node.id]?.imageUrl;
              }) && (
                <div className="mt-12">
                  <h4 className="text-lg font-black tracking-widest border-b-2 border-[#53565b] pb-2 inline-block mb-6">進度預覽</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {orderNodes.map(node => {
                      const stage = node.id;
                      if (['pending', 'queued', 'delivered'].includes(stage)) return null;
                      const stageLabel = node.label;
                      const imgUrl = order.progressImages?.[stage] || order.progressHistory?.[stage]?.imageUrl;
                      if (!imgUrl) return null;
                      
                      return (
                        <div key={stage} className="space-y-2">
                          <p className="text-sm font-bold tracking-widest text-[#53565b] text-center">{stageLabel}</p>
                          <div 
                            className="aspect-square border border-[#53565b] overflow-hidden cursor-pointer group bg-gray-50 flex items-center justify-center p-1"
                            onClick={() => setLightboxImage(imgUrl)}
                          >
                            <img loading="lazy" 
                              src={imgUrl} 
                              alt={`${stageLabel} preview`}
                              crossOrigin="anonymous"
                              className="max-w-full max-h-full object-contain transition-transform duration-700 group-hover:scale-105"
                              onError={(e) => {
                                console.error(`Failed to load image for stage ${stageLabel}:`, imgUrl, e);
                              }}
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Lightbox Modal */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-10 bg-black/60 backdrop-blur-sm"
          onClick={() => setLightboxImage(null)}
        >
          <button 
            className="absolute top-6 right-6 text-[#53565b] hover:text-gray-500 transition-colors z-10"
            onClick={() => setLightboxImage(null)}
          >
            <X size={32} />
          </button>
          <div className="relative max-w-full max-h-full" onClick={(e) => e.stopPropagation()}>
            <img loading="lazy" 
              src={lightboxImage} 
              alt="Full size preview"
              crossOrigin="anonymous"
              className="max-w-full max-h-[90vh] object-contain shadow-2xl border-4 border-[#53565b]"
            />
          </div>
        </div>
      )}
    </motion.div>
  );
}
