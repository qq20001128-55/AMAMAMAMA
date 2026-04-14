import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, Upload, X, CheckCircle2, Link as LinkIcon, Image as ImageIcon } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { collection, addDoc, serverTimestamp, getDocs, query, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { cn, compressImage, CATEGORIES } from '../lib/utils';

interface OrderFormProps {
  onBack: () => void;
  commissionStatus: 'open' | 'closed';
}

export default function OrderForm({ onBack, commissionStatus }: OrderFormProps) {
  const [step, setStep] = useState<'terms' | 'form' | 'success'>('terms');
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [priceList, setPriceList] = useState<any[]>([]);
  
  const [refType, setRefType] = useState<'image' | 'link'>('image');
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  
  const [formData, setFormData] = useState({
    nickname: '',
    email: '',
    contact: '',
    title: '',
    category: '',
    referenceLink: '',
    description: '',
  });

  useEffect(() => {
    const fetchPriceList = async () => {
      try {
        const q = query(collection(db, 'priceList'), orderBy('order', 'asc'));
        const snap = await getDocs(q);
        const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setPriceList(items);
        if (items.length > 0 && !formData.category) {
          setFormData(prev => ({ ...prev, category: items[0].title }));
        } else if (!formData.category) {
          setFormData(prev => ({ ...prev, category: CATEGORIES[0] }));
        }
      } catch (err) {
        console.error('Fetch price list error:', err);
        if (!formData.category) {
          setFormData(prev => ({ ...prev, category: CATEGORIES[0] }));
        }
      }
    };
    fetchPriceList();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length > 0) {
      setFiles(prev => [...prev, ...selectedFiles]);
      
      selectedFiles.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviews(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const [orderId, setOrderId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed || commissionStatus === 'closed') return;

    setLoading(true);
    try {
      const tempId = uuidv4();
      let imageUrls: string[] = [];

      if (refType === 'image' && files.length > 0) {
        const uploadPromises = files.map(async (file, index) => {
          const compressedBlob = await compressImage(file);
          const storageRef = ref(storage, `references/${tempId}_${index}.webp`);
          await uploadBytes(storageRef, compressedBlob);
          return getDownloadURL(storageRef);
        });
        imageUrls = await Promise.all(uploadPromises);
      }

      await addDoc(collection(db, 'orders'), {
        nickname: formData.nickname,
        email: formData.email,
        contact: formData.contact,
        title: formData.title,
        category: formData.category,
        description: formData.description,
        referenceType: refType,
        referenceImages: imageUrls,
        referenceLink: refType === 'link' ? formData.referenceLink : '',
        status: 'pending',
        progressHistory: {
          pending: {
            updatedAt: serverTimestamp(),
            dateString: new Date().toISOString()
          }
        },
        createdAt: serverTimestamp(),
        orderId: tempId,
      });

      // Find price from priceList
      const matchedItem = priceList.find(p => p.title === formData.category);
      const priceText = matchedItem ? matchedItem.description : '請確認價目表';

      // Send webhook
      try {
        await fetch('/api/webhook/discord', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nickname: formData.nickname,
            category: formData.category,
            price: priceText,
            contact: formData.contact,
            email: formData.email
          })
        });
      } catch (webhookErr) {
        console.error('Failed to trigger webhook:', webhookErr);
        // Do not block the user if webhook fails
      }

      setOrderId(tempId);
      setStep('success');
    } catch (error) {
      console.error('Submit error:', error);
      alert('立契失敗，請稍後再試。');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'terms') {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-w-2xl mx-auto px-6 py-10"
      >
        <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-[#8b0000] mb-8 transition-colors tracking-widest">
          <ChevronLeft size={20} />
          <span>返回</span>
        </button>
        <div className="neo-box mb-10">
          <h2 className="text-3xl font-black mb-8 tracking-widest text-center">注意事項</h2>
          <div className="prose prose-sm max-w-none text-gray-700 space-y-6 leading-loose tracking-widest">
            <p className="text-center font-bold text-lg">歡迎來到龍契局。</p>
            <p className="text-center">在你提出委託之前，請先閱讀以下規則。<br/>一旦委託成立，即視為契約已定，並同意遵守以下內容。</p>
            
            <div>
              <h3 className="font-bold text-lg border-b-2 border-[#1a1a1a] inline-block mb-2">一、關於修改</h3>
              <ul className="list-none space-y-1">
                <li>・草稿與色草階段可提出修改（請盡量一次整理完整）</li>
                <li>・完稿後僅接受小幅調整（如顏色、細節）</li>
                <li>・大幅修改（如構圖、姿勢、主題更動）不在委託範圍內</li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-lg border-b-2 border-[#1a1a1a] inline-block mb-2">二、關於退款</h3>
              <ul className="list-none space-y-1">
                <li>・委託一旦開始，將依繪製進度計算費用</li>
                <li>・若中途取消，將依完成比例進行退款</li>
                <li>・已完成部分需支付對應費用</li>
                <li>・除尚未開始繪製外，不提供全額退款</li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-lg border-b-2 border-[#1a1a1a] inline-block mb-2">三、關於驚喜包</h3>
              <ul className="list-none space-y-1">
                <li>・驚喜包為自由發揮類型委託</li>
                <li>・內容與呈現方式可以許願但大致都將由龍契局決定</li>
                <li>・不接受大幅修改</li>
                <li>・僅提供小幅調整（如顏色、細節）</li>
              </ul>
              <p className="mt-2 text-sm text-[#8b0000]">請確認能接受此類型再進行委託</p>
            </div>

            <div>
              <h3 className="font-bold text-lg border-b-2 border-[#1a1a1a] inline-block mb-2">四、關於時程</h3>
              <ul className="list-none space-y-1">
                <li>・依排單順序進行製作</li>
                <li>・請避免頻繁催稿</li>
                <li>・若有特殊時程需求，請事先告知</li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-lg border-b-2 border-[#1a1a1a] inline-block mb-2">五、其他事項</h3>
              <ul className="list-none space-y-1">
                <li>・請提供清楚的委託需求與參考資料</li>
                <li>・委託確認後，內容不可隨意更改</li>
                <li>・如有問題，歡迎事先詢問</li>
              </ul>
            </div>

            <p className="text-center font-bold mt-8">請在確認以上內容後，再決定是否提交委託。<br/>一旦立契，便請遵守其約。</p>
          </div>
        </div>
        
        <div className="flex items-center justify-center gap-3 mb-8">
          <input 
            type="checkbox" 
            id="agree" 
            checked={agreed} 
            onChange={(e) => setAgreed(e.target.checked)}
            className="w-5 h-5 border-2 border-[#1a1a1a] rounded-none focus:ring-0 cursor-pointer accent-[#8b0000]"
          />
          <label htmlFor="agree" className="text-sm cursor-pointer select-none tracking-widest font-bold">我已同意上述須知，願立此契</label>
        </div>
        <button 
          disabled={!agreed}
          onClick={() => setStep('form')}
          className="btn-primary w-full py-4 text-lg"
        >
          開始書契
        </button>
      </motion.div>
    );
  }

  if (step === 'success') {
    return (
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="max-w-md mx-auto px-6 py-20 text-center"
      >
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 border-4 border-[#8b0000] rounded-full flex items-center justify-center text-[#8b0000]">
            <span className="text-3xl font-black">契</span>
          </div>
        </div>
        <h2 className="text-3xl font-black mb-4 tracking-widest">契約已立</h2>
        <div className="neo-box mb-8">
          <p className="text-xs text-gray-500 tracking-widest mb-2">訂單編號</p>
          <p className="font-mono text-lg break-all font-bold text-[#8b0000]">#MAA-{orderId?.substring(0, 4).toUpperCase()}</p>
        </div>
        <div className="text-gray-700 mb-8 tracking-widest leading-loose text-sm text-left space-y-4">
          <p>若需確認進度，請使用訂單編號查詢。<br/>確認進行將會發送信件或臉書訊息請多留意<br/>感謝你的委託與信任。</p>
          
          <p>龍契局會依據內容、時間與創作狀態進行承接判斷，<br/>並非所有委託皆能成立。</p>
          
          <div>
            <p>若遇以下情況，龍契局可能無法承接：</p>
            <ul className="list-none pl-4">
              <li>・題材或內容超出目前能力範圍</li>
              <li>・排單已滿，無法新增委託</li>
              <li>・需求與目前創作方向不符</li>
              <li>・其他經評估後不適合承接之內容</li>
            </ul>
          </div>

          <p>若本次委託未能成立，<br/>並非否定你的需求或想法，<br/>僅為目前條件下無法承接。<br/>請見諒。</p>
          
          <p>龍契並非對所有願望開啟。<br/>有些願望，需要等待適合的時機與契機。<br/>感謝你的理解。</p>
          
          <p className="text-right font-bold mt-8">——龍契局</p>
        </div>
        <button onClick={onBack} className="btn-primary w-full">
          返回大廳
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="max-w-2xl mx-auto px-6 py-10"
    >
      <button onClick={() => setStep('terms')} className="flex items-center gap-2 text-gray-400 hover:text-[#8b0000] mb-8 transition-colors tracking-widest">
        <ChevronLeft size={20} />
        <span>返回須知</span>
      </button>
      <h2 className="text-3xl font-black mb-8 tracking-widest">委託書契</h2>
      
      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          <div>
            <label className="block text-sm tracking-widest font-bold mb-2">稱呼 Nickname</label>
            <input 
              required
              type="text" 
              className="input-field" 
              value={formData.nickname}
              onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm tracking-widest font-bold mb-2">信箱 Email</label>
            <input 
              required
              type="email" 
              className="input-field" 
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm tracking-widest font-bold mb-2">聯絡方式 Contact</label>
            <input 
              required
              type="text" 
              placeholder="Discord / Twitter / FB"
              className="input-field" 
              value={formData.contact}
              onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm tracking-widest font-bold mb-2">委託標題 Title</label>
          <input 
            required
            type="text" 
            className="input-field" 
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm tracking-widest font-bold mb-2">委託內容 Category</label>
          <select 
            className="input-field appearance-none cursor-pointer"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
          >
            {priceList.length > 0 
              ? priceList.map(item => <option key={item.id} value={item.title}>{item.title}</option>)
              : CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)
            }
          </select>
        </div>

        <div className="neo-box">
          <label className="block text-sm tracking-widest font-bold mb-4">參考資料 Reference</label>
          
          <div className="flex gap-4 mb-6 border-b-2 border-gray-200 pb-4">
            <button
              type="button"
              onClick={() => setRefType('image')}
              className={cn("flex items-center gap-2 px-4 py-2 tracking-widest transition-colors", refType === 'image' ? "bg-[#1a1a1a] text-[#faf9f6]" : "hover:bg-gray-100")}
            >
              <ImageIcon size={18} /> 上傳圖片
            </button>
            <button
              type="button"
              onClick={() => setRefType('link')}
              className={cn("flex items-center gap-2 px-4 py-2 tracking-widest transition-colors", refType === 'link' ? "bg-[#1a1a1a] text-[#faf9f6]" : "hover:bg-gray-100")}
            >
              <LinkIcon size={18} /> 附上連結
            </button>
          </div>

          {refType === 'image' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {previews.map((preview, index) => (
                  <div key={index} className="relative aspect-square border-2 border-[#1a1a1a] overflow-hidden group">
                    <img src={preview} alt={`Preview ${index}`} className="w-full h-full object-cover" />
                    <button 
                      type="button"
                      onClick={() => removeFile(index)}
                      className="absolute top-1 right-1 p-1 bg-[#1a1a1a] text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
                <label className="flex flex-col items-center justify-center aspect-square border-2 border-dashed border-[#1a1a1a] hover:bg-gray-100 cursor-pointer transition-colors">
                  <Upload size={24} className="mb-2" />
                  <span className="text-xs tracking-widest">新增圖片</span>
                  <input type="file" className="hidden" accept="image/*" multiple onChange={handleFileChange} />
                </label>
              </div>
              <p className="text-xs text-gray-500 tracking-widest">支援多圖上傳，將自動壓縮以節省空間。</p>
            </div>
          ) : (
            <div>
              <input 
                type="url" 
                placeholder="請貼上雲端硬碟或其他參考網址"
                className="input-field" 
                value={formData.referenceLink}
                onChange={(e) => setFormData({ ...formData, referenceLink: e.target.value })}
              />
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm tracking-widest font-bold mb-2">詳細需求描述 Details (Optional)</label>
          <textarea 
            rows={4}
            className="input-field resize-none" 
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="btn-primary w-full py-4 text-lg flex items-center justify-center gap-2"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-[#faf9f6] border-t-transparent rounded-full animate-spin" />
          ) : (
            '立契'
          )}
        </button>
      </form>
    </motion.div>
  );
}
