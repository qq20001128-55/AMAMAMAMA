import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, Upload, Edit2, Save, X } from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { compressImage } from '../lib/utils';
import { User } from 'firebase/auth';
import { SectionTitle } from './SectionTitle';

interface FollowMeProps {
  onBack: () => void;
  user: User | null;
}

const SOCIAL_LINKS = [
  { id: 'fb', label: 'Facebook', url: 'https://www.facebook.com/profile.php?id=61555414072184' },
  { id: 'ig', label: 'Instagram', url: 'https://www.instagram.com/ama_maaaaaa/' },
  { id: 'threads', label: 'Threads', url: 'https://www.threads.net/@ama_maaaaaa' },
  { id: 'x', label: 'X (Twitter)', url: 'https://x.com/ama_muma' },
  { id: 'twitch', label: 'Twitch', url: 'https://www.twitch.tv/ama1128' },
  { id: 'yt', label: 'YouTube', url: 'https://www.youtube.com/channel/UC466eWIWnNkeKREoyEy-gZg' },
  { id: 'artstation', label: 'ArtStation', url: 'https://www.artstation.com/werelong' },
  { id: 'plurk', label: 'Plurk', url: 'https://www.plurk.com/SSS2000126' },
  { id: 'bluesky', label: 'Bluesky', url: 'https://bsky.app/profile/maaaaaaaaaaaaaaaa.bsky.social' },
  { id: 'cara', label: 'Cara', url: 'https://cara.app/maaaaaaaaa/all' },
  { id: 'mosir', label: 'Mosir', url: 'https://beta.mosir.app/profile/AMAMAA' },
];

export default function FollowMe({ onBack, user }: FollowMeProps) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [socialLinks, setSocialLinks] = useState<any[]>(SOCIAL_LINKS);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // Check if user is admin
  const isAdmin = user?.email === 'sara20001128@gmail.com';

  useEffect(() => {
    fetchProfile();
    fetchSocialLinks();
  }, []);

  const fetchSocialLinks = async () => {
    try {
      const docRef = doc(db, 'settings', 'socialLinks');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists() && docSnap.data().links) {
        const savedLinks = docSnap.data().links;
        // Merge with DEFAULT to ensure missing platforms still appear
        const merged = SOCIAL_LINKS.map(defaultLink => {
          const found = savedLinks.find((l: any) => l.id === defaultLink.id);
          return found ? { ...defaultLink, url: found.url } : defaultLink;
        });
        // Filter out empty URLs to not render them
        setSocialLinks(merged.filter(link => link.url && link.url.trim() !== ''));
      } else {
        setSocialLinks(SOCIAL_LINKS.filter(link => link.url && link.url.trim() !== ''));
      }
    } catch (err) {
      console.error('Fetch social links error:', err);
    }
  };

  const fetchProfile = async () => {
    try {
      const docRef = doc(db, 'settings', 'profile');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setAvatarUrl(docSnap.data().avatarUrl);
      }
    } catch (err) {
      console.error('Fetch profile error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const compressedBlob = await compressImage(file);
      const storageRef = ref(storage, `profile/avatar.webp`);
      await uploadBytes(storageRef, compressedBlob);
      const url = await getDownloadURL(storageRef);
      
      await setDoc(doc(db, 'settings', 'profile'), { avatarUrl: url }, { merge: true });
      setAvatarUrl(url);
    } catch (err) {
      console.error('Upload error:', err);
      alert('上傳失敗，請稍後再試。');
    } finally {
      setUploading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full max-w-full mx-auto px-6 lg:px-12 xl:px-24 py-10"
    >
      

      <div className="flex flex-col md:flex-row gap-12 items-start">
        {/* Left: Avatar & Intro */}
        <div className="w-full md:w-1/3 flex flex-col items-center text-center space-y-6">
          <div className="relative group">
            <div className="w-48 h-48 rounded-full border-4 border-[var(--theme-color,#d4af37)] overflow-hidden bg-[#fafafa] flex items-center justify-center">
              {loading ? (
                <div className="w-8 h-8 border-2 border-[var(--theme-color,#d4af37)] border-t-transparent rounded-full animate-spin" />
              ) : avatarUrl ? (
                <img loading="lazy" src={avatarUrl} alt="瑪阿" className="w-full h-full object-cover" />
              ) : (
                <span className="text-4xl font-black text-gray-300">瑪阿</span>
              )}
            </div>
            
            {isAdmin && (
              <label className="absolute inset-0 bg-black/50 text-white flex flex-col items-center justify-center rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                {uploading ? (
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Upload size={24} className="mb-2" />
                    <span className="text-xs tracking-widest">更換頭像</span>
                    <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} disabled={uploading} />
                  </>
                )}
              </label>
            )}
          </div>

          <div>
            <SectionTitle className="!mb-2">瑪阿</SectionTitle>
            <p className="text-sm text-[var(--theme-color,#d4af37)] tracking-widest font-bold mb-6">龍契局・承契者</p>
            <div className="text-sm text-gray-600 tracking-widest leading-loose text-left">
              <p>我是瑪阿，龍契局的承契者。</p>
              <br/>
              <p>平時活躍於臉書，會分享作品與創作日常；</p>
              <p>偶爾也會在圖奇進行直播，紀錄繪圖過程與即時互動。</p>
              <br/>
              <p>若你在不同地方看見我，那大多都是同一個人。</p>
              <p>歡迎找我聊天</p>
            </div>
          </div>
        </div>

        {/* Right: Social Links */}
        <div className="w-full md:w-2/3">
          <h3 className="text-2xl font-black tracking-widest mb-8 border-b-2 border-[var(--theme-color,#d4af37)] pb-4">追蹤我</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {socialLinks.map((link) => (
              <a 
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="window-box-octagon !p-4 flex items-center justify-between hover:bg-[var(--theme-color,#d4af37)] hover:text-[#fafafa] transition-colors group"
              >
                <span className="font-bold tracking-widest">{link.label}</span>
                <span className="text-xs tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">前往 &rarr;</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
