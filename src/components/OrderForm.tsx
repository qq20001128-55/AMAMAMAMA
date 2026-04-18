import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, Upload, X, CheckCircle2, Link as LinkIcon, Image as ImageIcon } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { collection, addDoc, serverTimestamp, getDocs, query, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { cn, compressImage, CATEGORIES } from '../lib/utils';
import { SectionTitle } from './SectionTitle';

interface OrderFormProps {
  onBack: () => void;
  commissionStatus: 'open' | 'closed';
  onPaymentInfoClick?: () => void;
}

export default function OrderForm({ onBack, commissionStatus, onPaymentInfoClick }: OrderFormProps) {
  const [step, setStep] = useState<'terms' | 'license' | 'form' | 'success'>('terms');
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
        const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
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
    const selectedFiles = Array.from(e.target.files || []) as File[];
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
          await uploadBytes(storageRef, compressedBlob, { cacheControl: 'public,max-age=31536000' });
          return getDownloadURL(storageRef);
        });
        imageUrls = await Promise.all(uploadPromises);
      }

      // Find price from priceList
      const matchedItem = priceList.find(p => p.title === formData.category);
      const priceText = matchedItem ? (matchedItem.price || matchedItem.description) : '請確認價目表';
      const selectedWorkflow = matchedItem?.workflow || 'full';

      await addDoc(collection(db, 'orders'), {
        nickname: formData.nickname,
        email: formData.email,
        contact: formData.contact,
        title: formData.title,
        category: formData.category,
        workflow: selectedWorkflow,
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

      // Send webhook (暫時停用以避免 404 報錯)
      /*
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
      */

      setOrderId('處理中...');
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
        <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-[#53565b] mb-8 transition-colors tracking-widest">
          <ChevronLeft size={20} />
          <span>返回</span>
        </button>
        <div className="window-box-octagon mb-10">
          <SectionTitle>注意事項</SectionTitle>
          <div className="prose prose-sm max-w-none text-gray-700 space-y-6 leading-loose tracking-widest text-center flex flex-col items-center">
            
            <div className="w-full max-w-lg text-center">
              <h3 className="font-bold text-lg border-b-2 border-[#53565b] inline-block mb-3">一、 委託進度與支付流程</h3>
              <p className="mb-2">本局採取階梯式開發與兩段式付款，確保雙方權益：</p>
              <ul className="list-none space-y-2 p-0 m-0">
                <li><span className="font-bold">確認中：</span> 需求諮詢與報價階段，無需支付費用。</li>
                <li><span className="font-bold">排單中：</span> 契約成立，委託人需支付總額 50% 作為定金，本局方可保留檔期。</li>
                <li><span className="font-bold">製作期（粗草 ➔ 草稿 ➔ 色草）：</span> 依序進行構圖與色彩確認。</li>
                <li><span className="font-bold">完稿：</span> 作品細化完成，委託人需支付剩餘 50% 尾款。</li>
                <li><span className="font-bold">已交付：</span> 確認款項後，交付去浮水印之高解析度原檔。</li>
              </ul>
            </div>

            <div className="w-full max-w-lg text-center">
              <h3 className="font-bold text-lg border-b-2 border-[#53565b] inline-block mb-3">二、 關於修改 (Revision Policy)</h3>
              <ul className="list-none space-y-2 p-0 m-0">
                <li><span className="font-bold">草稿與色草階段：</span> 提供 [10] 次修改機會。請儘量將修改意見彙整後一次提出。</li>
                <li><span className="font-bold">完稿階段：</span> 僅接受小幅調整（如顏色、局部微小細節），不接受大幅度變更。</li>
                <li><span className="font-bold">大幅修改：</span> 凡涉及構圖重繪、姿勢變更、主題更動等重大修改，不在基本委託範圍內。</li>
              </ul>
            </div>

            <div className="w-full max-w-lg text-center">
              <h3 className="font-bold text-lg border-b-2 border-[#53565b] inline-block mb-3">三、 關於退費與終止 (Refund Policy)</h3>
              <p className="mb-2">立契後若需終止委託，依據進度執行退費標準：</p>
              <ul className="list-none space-y-2 p-0 m-0">
                <li><span className="font-bold">開畫前（兩天以上）：</span> 可退還全額定金。</li>
                <li><span className="font-bold">開畫前（一天內）：</span> 由於已佔用本局排期，不予退還定金。</li>
                <li><span className="font-bold">已動筆製作（粗草/色草階段）：</span> * 因創作具備主觀性，若因委託人個人喜好（如：與範例不符）取消，不予退還定金。<br/><span className="text-xs text-gray-500">（備註：粗草階段若雙方達成共識止損，客戶僅需負擔總額 20% 作為勞務成本，其餘定金退還；但此項由創作者視情況判斷之。）</span></li>
                <li><span className="font-bold">完稿階段：</span> 不接受任何退款要求。</li>
              </ul>
              <p className="mt-4 p-3 bg-gray-100 rounded text-sm text-[#53565b] border-l-4 border-[#53565b]">
                <span className="font-bold">核心聲明：</span> 創作具有審美主觀性。委託人應於立契前充分理解並認可「龍契局」之過往風格。不接受以「與預期不符」、「感覺不對」為由要求全額退費。
              </p>
            </div>

            <div className="w-full max-w-lg text-center">
              <h3 className="font-bold text-lg border-b-2 border-[#53565b] inline-block mb-3">四、 關於「驚喜包」特別條款</h3>
              <ul className="list-none space-y-2 p-0 m-0">
                <li><span className="font-bold">自由發揮：</span> 驚喜包為追求特定風格之委託，內容與呈現方式由本局主導。</li>
                <li><span className="font-bold">許願限制：</span> 僅接受「大方向許願」或「避雷關鍵字」。</li>
                <li><span className="font-bold">修改權限：</span> 此類型不提供大幅修改，僅限微幅細節調整（如顏色偏移修正）。</li>
              </ul>
            </div>

            <div className="w-full max-w-lg text-center">
              <h3 className="font-bold text-lg border-b-2 border-[#53565b] inline-block mb-3">五、 其他條款</h3>
              <ul className="list-none space-y-2 p-0 m-0">
                <li><span className="font-bold">時程：</span> 依排單順序製作，請避免頻繁催稿。若有急件需求請事先告知。</li>
                <li><span className="font-bold">資料提供：</span> 委託人應提供清晰參考資料。立契後，不可隨意更改基礎委託內容（如更換角色）。</li>
                <li><span className="font-bold">版權：</span> 除非另有商議，龍契局保有作品收錄於作品集、展示與公開發表之權利。嚴禁將作品投入 AI 訓練或未授權之商業用途。</li>
              </ul>
              <p className="font-bold text-center mt-6 tracking-widest">—— 契成，即請守約。 ——</p>
            </div>
          </div>
        </div>
        
        <div className="text-center mb-8">
          <button 
            onClick={() => {
              if (onPaymentInfoClick) onPaymentInfoClick();
            }}
            className="text-sm tracking-widest text-[#53565b] underline hover:text-gray-500 transition-colors"
          >
            查看支付方式與手續費說明
          </button>
        </div>

        <div className="flex items-center justify-center gap-3 mb-8">
          <input 
            type="checkbox" 
            id="agree-terms" 
            checked={agreed} 
            onChange={(e) => setAgreed(e.target.checked)}
            className="w-5 h-5 border-2 border-[#53565b] rounded-none focus:ring-0 cursor-pointer accent-[#53565b]"
          />
          <label htmlFor="agree-terms" className="text-sm cursor-pointer select-none tracking-widest font-bold">我已閱讀並同意上述委託須知</label>
        </div>
        <button 
          disabled={!agreed}
          onClick={() => { setStep('license'); setAgreed(false); }}
          className="btn-primary w-full py-4 text-lg"
        >
          下一步 (閱讀授權規範)
        </button>
      </motion.div>
    );
  }

  if (step === 'license') {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-w-2xl mx-auto px-6 py-10"
      >
        <button onClick={() => setStep('terms')} className="flex items-center gap-2 text-gray-400 hover:text-[#53565b] mb-8 transition-colors tracking-widest">
          <ChevronLeft size={20} />
          <span>返回注意事項</span>
        </button>
        <div className="window-box-octagon mb-10">
          <SectionTitle>授權與用途規範</SectionTitle>
          <div className="prose prose-sm max-w-none text-gray-700 space-y-6 leading-loose tracking-widest text-center flex flex-col items-center">
            
            <p className="font-bold text-md text-[#53565b] mb-4">(Usage & Licensing Rights)<br/>本局依據用途性質，將卷宗分為以下三種授權等級。立契前請務必確認您的用途需求：</p>

            <div className="w-full max-w-lg text-center">
              <h3 className="font-bold text-lg border-b-2 border-[#53565b] inline-block mb-3">一、 非商業委託 (Non-Commercial / Personal Use)</h3>
              <ul className="list-none space-y-2 p-0 m-0">
                <li><span className="font-bold">定義：</span> 僅限委託人個人收藏、展示，不涉及任何金錢收益之行為。</li>
                <li><span className="font-bold">用途：</span> 社群頭像、手機/電腦桌布、個人印製收藏（5份以內）、贈送友人（非營利性質）。</li>
                <li><span className="font-bold">計費：</span> 底價 (1x)</li>
                <li><span className="font-bold">備註：</span> 本局仍保有作品之著作權與公開展示權。</li>
              </ul>
            </div>

            <div className="w-full max-w-lg text-center">
              <h3 className="font-bold text-lg border-b-2 border-[#53565b] inline-block mb-3">二、 商業委託 (Commercial Use)</h3>
              <ul className="list-none space-y-2 p-0 m-0">
                <li><span className="font-bold">定義：</span> 凡涉及營利性質、品牌推廣、或具備金錢收益之行為。</li>
                <li><span className="font-bold">用途：</span> 盈利頻道之直播背景/縮圖（YouTube/Twitch等）、周邊販售、遊戲/小說插圖、廣告宣傳。</li>
                <li><span className="font-bold">計費：</span> 底價 x 3</li>
              </ul>
              
              <div className="mt-4 p-4 border border-[#53565b] bg-gray-50 relative">
                <div className="absolute -top-3 left-4 bg-gray-50 px-2 font-bold tracking-widest text-xs text-[#53565b]">【特別優待・VTuber 應援契】</div>
                <ul className="list-none space-y-2 p-0 m-0 mt-2">
                  <li><span className="font-bold">對象：</span> 委託贈送給特定 VTuber 使用（如直播、社群宣傳、非販售性質周邊）。</li>
                  <li><span className="font-bold">計費：</span> 底價 x 2（這是龍契局對創作者社群的特別支持）。</li>
                </ul>
              </div>
            </div>

            <div className="w-full max-w-lg text-center">
              <h3 className="font-bold text-lg border-b-2 border-[#53565b] inline-block mb-3">三、 著作權買斷 (Buyout / Full Rights Transfer)</h3>
              <ul className="list-none space-y-2 p-0 m-0">
                <li><span className="font-bold">定義：</span> 將作品之「著作財產權」完全移交予委託人。</li>
                <li><span className="font-bold">用途：</span> 委託人可自由進行二次加工、修改、再轉授權，且創作者不得再將該作品用於除作品集以外的任何用途。</li>
                <li><span className="font-bold">計費：</span> 底價 x 5 至 x 10（視作品複雜度與預期商用規模而定）。</li>
              </ul>
              <div className="mt-4">
                <p className="font-bold text-sm mb-2 text-[#53565b]">買斷條款建議：</p>
                <ul className="list-none space-y-2 p-0 m-0">
                  <li><span className="font-bold">不公開聲明：</span> 買斷後若要求創作者「不可將作品放入作品集/公開展示」，需額外加收費用或另行議約。</li>
                  <li><span className="font-bold">署名權：</span> 除非特別約定，本局仍保留「署名權」（即標註原作者為瑪阿）。</li>
                </ul>
              </div>
            </div>

          </div>
        </div>

        <div className="flex items-center justify-center gap-3 mb-8">
          <input 
            type="checkbox" 
            id="agree-license" 
            checked={agreed} 
            onChange={(e) => setAgreed(e.target.checked)}
            className="w-5 h-5 border-2 border-[#53565b] rounded-none focus:ring-0 cursor-pointer accent-[#53565b]"
          />
          <label htmlFor="agree-license" className="text-sm cursor-pointer select-none tracking-widest font-bold">我已充分了解上述授權規範，並願立此契</label>
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
          <div className="w-20 h-20 border-4 border-[#53565b] rounded-full flex items-center justify-center text-[#53565b]">
            <span className="text-3xl font-black">契</span>
          </div>
        </div>
        <SectionTitle>契約已立</SectionTitle>
        <div className="window-box-octagon mb-8">
          <p className="text-xs text-gray-500 tracking-widest mb-2">訂單編號</p>
          <p className="font-mono text-lg break-all font-bold text-[#53565b]">處理中...</p>
        </div>
        <div className="text-gray-700 mb-8 tracking-widest leading-loose text-sm text-left space-y-4">
          <p>專屬訂單編號將於委託正式確認後（進入排單中）隨信件發送給您，<br/>屆時即可使用編號於本站查詢進度。<br/>感謝你的委託與信任。</p>
          
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
      <button onClick={() => setStep('terms')} className="flex items-center gap-2 text-gray-400 hover:text-[#53565b] mb-8 transition-colors tracking-widest">
        <ChevronLeft size={20} />
        <span>返回須知</span>
      </button>
      <SectionTitle>委託書契</SectionTitle>
      
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

        <div className="window-box-octagon">
          <label className="block text-sm tracking-widest font-bold mb-4">參考資料 Reference</label>
          
          <div className="flex gap-4 mb-6 border-b-2 border-gray-200 pb-4">
            <button
              type="button"
              onClick={() => setRefType('image')}
              className={cn("flex items-center gap-2 px-4 py-2 tracking-widest transition-colors", refType === 'image' ? "bg-[#53565b] text-[#fafafa]" : "hover:bg-gray-100")}
            >
              <ImageIcon size={18} /> 上傳圖片
            </button>
            <button
              type="button"
              onClick={() => setRefType('link')}
              className={cn("flex items-center gap-2 px-4 py-2 tracking-widest transition-colors", refType === 'link' ? "bg-[#53565b] text-[#fafafa]" : "hover:bg-gray-100")}
            >
              <LinkIcon size={18} /> 附上連結
            </button>
          </div>

          {refType === 'image' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {previews.map((preview, index) => (
                  <div key={index} className="relative aspect-square border-2 border-[#53565b] overflow-hidden group">
                    <img loading="lazy" src={preview} alt={`Preview ${index}`} className="w-full h-full object-cover" />
                    <button 
                      type="button"
                      onClick={() => removeFile(index)}
                      className="absolute top-1 right-1 p-1 bg-[#53565b] text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
                <label className="flex flex-col items-center justify-center aspect-square border-2 border-dashed border-[#53565b] hover:bg-gray-100 cursor-pointer transition-colors">
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
            <div className="w-5 h-5 border-2 border-[#fafafa] border-t-transparent rounded-full animate-spin" />
          ) : (
            '立契'
          )}
        </button>
      </form>
    </motion.div>
  );
}
