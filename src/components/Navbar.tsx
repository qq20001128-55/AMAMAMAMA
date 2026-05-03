import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { Search, Mail, Settings, LogOut, Code, UserCircle } from 'lucide-react';
import { logout, signInWithGoogle } from '../firebase';
import { cn } from '../lib/utils';
import ContactForm from './ContactForm';

// We map generic IDs for social icons since some platforms don't have lucide icons.
const SOCIAL_ICONS: Record<string, any> = {
  fb: 'F', ig: 'I', threads: '@', x: 'X', twitch: 'Tw', yt: 'Y', artstation: 'A', plurk: 'P', bluesky: 'B', cara: 'C', mosir: 'M'
};

interface NavbarProps {
  setPage: (page: any) => void;
  currentPage: string;
  user: User | null;
  siteConfig?: any;
  socialLinks?: any[];
}

export default function Navbar({ setPage, currentPage, user, siteConfig, socialLinks = [] }: NavbarProps) {
  const isAdmin = user?.email === 'sara20001128@gmail.com';
  const [showContact, setShowContact] = useState(false);

  // Nav Items Data
  const mainNav = [
    { id: 'home', label: '首頁', en: 'HOME' },
    { id: 'pricelist', label: '價目', en: 'PRICE' },
    { id: 'order', label: '立契', en: 'ORDER' },
    { id: 'tracking', label: '追跡', en: 'TRACK' },
    { id: 'portfolio', label: '圖鑑', en: 'ARCHIVE' }
  ];

  const validSocialLinks = socialLinks.filter(l => l.url && l.url.trim() !== '');

  return (
    <>
      {/* Top Left Main Menu */}
      <nav className="fixed top-4 sm:top-6 left-4 sm:left-6 z-50 flex items-center gap-2 sm:gap-4 max-w-[70vw] sm:max-w-none flex-wrap sm:flex-nowrap">
        {siteConfig?.logoUrl && (
          <div className="mr-2 md:mr-4 cursor-pointer transform md:-translate-y-10 lg:-translate-y-12" onDoubleClick={signInWithGoogle}>
             <img src={siteConfig.logoUrl} alt="Icon" className="h-10 md:h-8 w-auto object-contain drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]" crossOrigin="anonymous" />
          </div>
        )}
        {mainNav.map(item => (
          <div 
            key={item.id}
            onClick={() => setPage(item.id)}
            className={cn(
              "nav-item",
              currentPage === item.id ? "active text-[var(--theme-color,#d4af37)] opacity-100 font-bold" : "text-white"
            )}
          >
            <div className="nav-box"></div>
            <span className="text-xs md:text-base tracking-widest font-black leading-none">{item.label}</span>
            <span className="text-[8px] md:text-[9px] tracking-widest font-mono opacity-60 mt-1">{item.en}</span>
          </div>
        ))}
      </nav>

      {/* Top Right Utility Icons */}
      <nav className="fixed top-4 sm:top-6 right-4 sm:right-6 z-50 flex gap-2 sm:gap-4 items-center scale-90 sm:scale-100 origin-top-right">
        <button 
          onClick={() => setPage('tracking')}
          className="text-white opacity-70 hover:opacity-100 hover:text-[var(--theme-color,#d4af37)] transition-all flex flex-col items-center gap-1"
          title="追跡 (搜尋進度)"
        >
          <Search size={22} />
        </button>
        <button 
          onClick={() => setShowContact(true)}
          className="text-white opacity-70 hover:opacity-100 hover:text-[var(--theme-color,#d4af37)] transition-all flex flex-col items-center gap-1"
          title="聯絡我們"
        >
          <Mail size={22} />
        </button>
        {isAdmin && (
          <button 
            onClick={() => setPage('admin')}
            className={cn("opacity-70 hover:opacity-100 transition-all flex flex-col items-center gap-1", currentPage === 'admin' ? "text-[var(--theme-color,#d4af37)] opacity-100" : "text-white hover:text-[var(--theme-color,#d4af37)]")}
            title="後台設定"
          >
            <Settings size={22} />
          </button>
        )}
      </nav>

      {/* Right Vertical Social Icons */}
      {validSocialLinks.length > 0 && (
        <div className="fixed right-4 sm:right-6 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-2 sm:gap-3">
          {validSocialLinks.map(link => (
            <a 
              key={link.id} 
              href={link.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-7 h-7 sm:w-8 sm:h-8 border border-white/20 bg-black/40 backdrop-blur-sm flex items-center justify-center text-white opacity-60 hover:opacity-100 hover:border-[var(--theme-color,#d4af37)] hover:text-[var(--theme-color,#d4af37)] transition-all group overflow-hidden"
              title={link.label}
            >
              {link.iconUrl ? (
                <img loading="lazy" src={link.iconUrl} alt={link.label} className="w-4 h-4 object-contain transform group-hover:scale-110 transition-transform opacity-80 group-hover:opacity-100" crossOrigin="anonymous" />
              ) : (
                <span className="font-mono font-bold text-xs transform group-hover:scale-110 transition-transform">
                  {SOCIAL_ICONS[link.id as string] || link.label[0]}
                </span>
              )}
            </a>
          ))}
          <div className="w-[1px] h-12 sm:h-20 bg-gradient-to-b from-white/30 to-transparent mx-auto mt-2"></div>
        </div>
      )}

      {/* Contact Modal */}
      {showContact && (
        <ContactForm onClose={() => setShowContact(false)} />
      )}
    </>
  );
}
