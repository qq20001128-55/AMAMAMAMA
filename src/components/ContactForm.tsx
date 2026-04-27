import React, { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { X, Send, Mail } from 'lucide-react';
import { motion } from 'motion/react';

interface ContactFormProps {
  onClose: () => void;
}

export default function ContactForm({ onClose }: ContactFormProps) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      alert('請填寫內容');
      return;
    }

    setSending(true);
    try {
      await addDoc(collection(db, 'messages'), {
        message,
        createdAt: serverTimestamp(),
        read: false
      });
      setSent(true);
    } catch (err) {
      console.error('Error sending message:', err);
      alert('傳送失敗，請稍後再試。');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-lg neo-box bg-[#121212]/95 border-[var(--theme-color,#d4af37)] z-10"
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-[var(--theme-color,#d4af37)] transition-colors"
        >
          <X size={24} />
        </button>

        <h3 className="text-2xl font-black tracking-widest text-white mb-6 flex items-center gap-2">
          <Mail className="text-[var(--theme-color,#d4af37)]" /> 聯絡瑪阿
        </h3>

        {sent ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full border-2 border-[var(--theme-color,#d4af37)] flex items-center justify-center mx-auto mb-4 text-[var(--theme-color,#d4af37)]">
              <Send size={24} />
            </div>
            <h4 className="text-xl font-bold text-white mb-2 tracking-widest">訊息已傳送</h4>
            <p className="text-gray-400 tracking-widest">我會盡快查看並在適當時機回覆您。</p>
            <button 
              onClick={onClose}
              className="mt-8 btn-primary"
            >
              關閉視窗
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-bold tracking-widest text-[var(--theme-color,#d4af37)] mb-1">內容 (必填)</label>
              <textarea 
                value={message}
                onChange={e => setMessage(e.target.value)}
                className="input-field min-h-[150px] resize-y"
                placeholder="請輸入您的意見、疑問或想說的話..."
                required
              />
            </div>
            <button 
              type="submit" 
              disabled={sending}
              className="w-full btn-primary disabled:opacity-50 mt-4 flex items-center justify-center gap-2"
            >
              {sending ? (
                <div className="w-5 h-5 border-2 border-[var(--theme-color,#d4af37)] border-t-transparent rounded-full animate-spin" />
              ) : (
                <>傳送給瑪阿 <Send size={18} /></>
              )}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
