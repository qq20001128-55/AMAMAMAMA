import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, Search, Clock, CheckCircle2, ExternalLink, X } from 'lucide-react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { cn, STATUS_NODES } from '../lib/utils';
import { format, parseISO } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import WatermarkedImage from './WatermarkedImage';
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
      const q1 = query(collection(db, 'orders'), where('officialOrderId', '==', searchId.trim()));
      const q2 = query(collection(db, 'orders'), where('orderId', '==', searchId.trim()));
      
      const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
      
      const foundDoc = snap1.docs[0] || snap2.docs[0];

      if (foundDoc) {
        setOrder({ id: foundDoc.id, ...foundDoc.data() });
      } else {
        setError('尋無此契，請確認編號是否正確。');
      }
    } catch (err) {
      console.error('Search error:', err);
      setError('探問因果時發生錯誤。');
    } finally {
      setLoading(false);
    }
  };

  const currentStatusIndex = STATUS_NODES.findIndex(node => node.id === order?.status);

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

    // Background
    ctx.fillStyle = '#53565b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Decorative elements
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 2;
    ctx.strokeRect(40, 40, canvas.width - 80, canvas.height - 80);
    
    ctx.fillStyle = '#53565b';
    ctx.fillRect(canvas.width / 2 - 20, 80, 40, 40);

    // Text settings
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fafafa';

    // Title
    ctx.font = 'bold 60px "Noto Serif TC", serif';
    ctx.fillText('龍契局・進度卡', canvas.width / 2, 250);

    // Order ID
    ctx.font = '40px monospace';
    ctx.fillStyle = '#53565b';
    ctx.fillText(order.officialOrderId || `#MAA-${order.orderId.substring(0, 4).toUpperCase()}`, canvas.width / 2, 350);

    // Nickname
    ctx.font = 'bold 50px "Noto Serif TC", serif';
    ctx.fillStyle = '#fafafa';
    ctx.fillText(`委託人：${order.nickname}`, canvas.width / 2, 500);

    // Status
    const statusLabel = STATUS_NODES[currentStatusIndex]?.label || '未知';
    ctx.font = 'bold 80px "Noto Serif TC", serif';
    ctx.fillText(`當前進度：${statusLabel}`, canvas.width / 2, 700);

    // Date
    ctx.font = '30px monospace';
    ctx.fillStyle = '#888888';
    ctx.fillText(`生成日期：${format(new Date(), 'yyyy-MM-dd HH:mm')}`, canvas.width / 2, canvas.height - 150);

    // Download
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `龍契局進度卡_${order.officialOrderId || order.orderId.substring(0, 4)}.png`;
    link.href = dataUrl;
    link.click();
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
            placeholder="輸入契約編號 (臨時或正式編號)"
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
                <p className="text-xl font-bold tracking-widest text-[#53565b]">{STATUS_NODES[currentStatusIndex]?.label}</p>
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
                style={{ width: `calc(${(currentStatusIndex / (STATUS_NODES.length - 1)) * 100}% - 20px)` }}
              />

              <div className="flex justify-between relative">
                {STATUS_NODES.map((node, index) => {
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
                      <img src={img} alt={`Reference ${i}`} className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-500" />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 tracking-widest">無參考資料</p>
              )}

              {/* Stage Previews */}
              {['draft', 'lineart', 'coloring', 'completed'].some(stage => {
                const stageLabel = STATUS_NODES.find(n => n.id === stage)?.label || stage;
                return order.progressHistory?.[stage]?.imageUrl || order.deadlines?.[stageLabel]?.imageUrl;
              }) && (
                <div className="mt-12">
                  <h4 className="text-lg font-black tracking-widest border-b-2 border-[#53565b] pb-2 inline-block mb-6">進度預覽</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {['draft', 'lineart', 'coloring', 'completed'].map(stage => {
                      const stageLabel = STATUS_NODES.find(n => n.id === stage)?.label || stage;
                      const imgUrl = order.progressHistory?.[stage]?.imageUrl || order.deadlines?.[stageLabel]?.imageUrl;
                      if (!imgUrl) return null;
                      
                      return (
                        <div key={stage} className="space-y-2">
                          <p className="text-sm font-bold tracking-widest text-center">{stageLabel}</p>
                          <div 
                            className="aspect-square border-2 border-gray-200 overflow-hidden cursor-pointer group"
                            onClick={() => setLightboxImage(imgUrl)}
                          >
                            <img 
                              src={imgUrl} 
                              alt={`${stageLabel} preview`}
                              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
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
          className="fixed inset-0 z-50 modal-scroll-bg flex items-center justify-center p-4 md:p-10"
          onClick={() => setLightboxImage(null)}
        >
          <button 
            className="absolute top-6 right-6 text-[#53565b] hover:text-gray-500 transition-colors z-10"
            onClick={() => setLightboxImage(null)}
          >
            <X size={32} />
          </button>
          <div className="relative max-w-full max-h-full" onClick={(e) => e.stopPropagation()}>
            <WatermarkedImage 
              src={lightboxImage} 
              alt="Full size preview"
              horizontalWatermarkUrl={systemSettings.horizontalWatermarkUrl}
              verticalWatermarkUrl={systemSettings.verticalWatermarkUrl}
              squareWatermarkUrl={systemSettings.squareWatermarkUrl}
              pcWatermarkUrl={systemSettings.pcWatermarkUrl}
              className="max-w-full max-h-[90vh] object-contain shadow-2xl border-4 border-[#53565b]"
            />
          </div>
        </div>
      )}
    </motion.div>
  );
}
