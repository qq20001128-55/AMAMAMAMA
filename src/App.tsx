/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db, signInWithGoogle } from './firebase';
import Navbar from './components/Navbar';
import OrderForm from './components/OrderForm';
import OrderTracking from './components/OrderTracking';
import Portfolio from './components/Portfolio';
import AdminDashboard from './components/AdminDashboard';
import FollowMe from './components/FollowMe';
import PriceList from './components/PriceList';
import CommissionQueue from './components/CommissionQueue';
import PaymentInfo from './components/PaymentInfo';
import { motion, AnimatePresence } from 'motion/react';
import { SectionTitle } from './components/SectionTitle';
import { cn } from './lib/utils';

type Page = 'home' | 'order' | 'tracking' | 'portfolio' | 'admin' | 'follow' | 'pricelist' | 'payment';

export default function App() {
  const [page, setPage] = useState<Page>('home');
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [commissionStatus, setCommissionStatus] = useState<'open' | 'closed'>('open');
  const [siteConfig, setSiteConfig] = useState<any>({});

  const [socialLinks, setSocialLinks] = useState<any[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'global'), (doc) => {
      if (doc.exists()) {
        setCommissionStatus(doc.data().commissionStatus);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'siteConfig'), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setSiteConfig(data);
        if (data.homeBgUrl) document.documentElement.style.setProperty('--home-bg-url', `url("${data.homeBgUrl}")`);
        if (data.pageBgUrl) document.documentElement.style.setProperty('--page-bg-url', `url("${data.pageBgUrl}")`);
        if (data.themeColor) document.documentElement.style.setProperty('--theme-color', data.themeColor);
        
        let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
        if (!link) {
          link = document.createElement('link');
          link.rel = 'icon';
          document.head.appendChild(link);
        }
        link.href = data.faviconUrl || '/favicon.png';
      }
    });

    const unsubSocial = onSnapshot(doc(db, 'settings', 'socialLinks'), (doc) => {
      if (doc.exists() && doc.data().links) {
        setSocialLinks(doc.data().links);
      }
    });

    return () => {
      unsub();
      unsubSocial();
    };
  }, []);

  useEffect(() => {
    if (page === 'home') {
      document.body.classList.add('is-home');
    } else {
      document.body.classList.remove('is-home');
    }
  }, [page]);

  if (!isAuthReady) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#0d0d0d]">
        <div className="w-8 h-8 border-2 border-[var(--theme-color,#d4af37)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const renderPage = () => {
    switch (page) {
      case 'home':
        return (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full"
          >
            {/* Hero Section */}
            <div className="relative min-h-[100vh] flex flex-col justify-center items-center pb-48 md:pb-0">
              {/* Center Landing Image Layer */}
              <div className="absolute inset-0 landing-gradient pointer-events-none z-0"></div>

              {/* Central Main Title */}
              <div className="mb-12 md:mb-16 -mt-32 md:-mt-48 relative z-10 mx-auto w-[80vw] md:w-[50vw]">
                {siteConfig.titleStyleUrl ? (
                  <img loading="lazy" src={siteConfig.titleStyleUrl} alt="龍契局" className="max-h-[30vh] md:max-h-[35vh] object-contain mx-auto" crossOrigin="anonymous" />
                ) : (
                  <h1 className="text-6xl md:text-9xl font-black tracking-[0.2em] text-[var(--theme-color,#d4af37)] mx-auto text-center font-serif drop-shadow-2xl">
                    龍契局
                  </h1>
                )}
              </div>
              
              {/* Horizontal Subtext */}
              <div className="hidden md:flex absolute top-1/2 -translate-y-1/2 left-[15%] flex-row-reverse gap-6 text-[var(--theme-color,#d4af37)] z-10" style={{ writingMode: 'vertical-rl', textOrientation: 'upright' }}>
                <div className="text-lg tracking-[0.5em] leading-relaxed drop-shadow-md decoration-slice pointer-events-none">
                  但凡所求，皆可成交<br/>
                  願望可託，因果自承。
                </div>
              </div>
              
              <div className="hidden md:flex absolute top-1/2 -translate-y-1/2 right-[15%] flex-row-reverse gap-6 text-[var(--theme-color,#d4af37)] z-10" style={{ writingMode: 'vertical-rl', textOrientation: 'upright' }}>
                <div className="text-lg tracking-[0.5em] leading-relaxed drop-shadow-md decoration-slice pointer-events-none">
                  世間有一局，名為龍契。<br/>
                  不問來歷，不問善惡，
                </div>
              </div>

              {/* Mobile Subtext fallback */}
              <div className="md:hidden mt-8 mb-6 text-center text-sm tracking-[0.3em] text-[var(--theme-color,#d4af37)]/80 leading-loose mx-6 px-4 py-6 border-y border-[var(--theme-color,#d4af37)]/30 backdrop-blur-sm bg-black/20 z-10 w-full max-w-[80vw]">
                <p>世間有一局，名為龍契。</p>
                <p>不問來歷，不問善惡，</p>
                <p>但凡所求，皆可成交</p>
                <p>願望可託，因果自承。</p>
              </div>

              {/* Mobile Action Buttons (Displayed flex in column on mobile) */}
              <div className="md:hidden flex flex-col items-center gap-4 w-full px-6 z-20 pb-12">
                 <button 
                    onClick={() => setPage('order')}
                    disabled={commissionStatus === 'closed'}
                    className="group relative flex items-center justify-center w-full max-w-sm h-16 bg-black/80 backdrop-blur-md border border-[var(--theme-color,#d4af37)] disabled:opacity-50 disabled:grayscale transition-all duration-500 shadow-[0_0_15px_rgba(212,175,55,0.1)]"
                 >
                   {siteConfig.bottomRightBgUrl && (
                     <div className="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-overlay" style={{ backgroundImage: `url(${siteConfig.bottomRightBgUrl})`}}></div>
                   )}
                   <div className="relative z-10 flex flex-col items-center">
                      <span className={cn("text-lg font-black tracking-[0.5em] ml-[0.35em]", commissionStatus === 'closed' ? "text-red-500" : "text-white")}>
                        {commissionStatus === 'closed' ? '局門暫閉' : '締結契約'}
                      </span>
                      <span className="text-[8px] text-[var(--theme-color,#d4af37)] font-mono mt-1 tracking-widest opacity-80 uppercase">
                        {commissionStatus === 'closed' ? 'COMMISSION CLOSED' : 'INITIATE CONTRACT'}
                      </span>
                   </div>
                 </button>

                 <button 
                   onClick={() => {
                     document.getElementById('commission-queue-section')?.scrollIntoView({ behavior: 'smooth' });
                   }} 
                   className="group relative overflow-hidden glass-card w-full max-w-sm h-16 p-3 text-center flex flex-col justify-center items-center border border-[var(--theme-color,#d4af37)]/30"
                 >
                   {siteConfig.bottomLeftBgUrl && (
                     <div className="absolute inset-0 bg-cover bg-center opacity-40 mix-blend-overlay" style={{ backgroundImage: `url(${siteConfig.bottomLeftBgUrl})`}}></div>
                   )}
                   <div className="relative z-10 text-center">
                     <div className="text-[10px] text-[var(--theme-color,#d4af37)] font-mono opacity-80 mb-1 tracking-widest uppercase">Announcement</div>
                     <div className="font-bold tracking-[0.2em] text-white text-sm">站內公告</div>
                   </div>
                 </button>
              </div>

              {/* Desktop Bottom Left Utility Cards */}
              <div className="hidden md:block absolute bottom-12 left-12 xl:left-24 z-20">
                 <div className="group relative flex flex-col w-[24rem] h-24 bg-black/50 backdrop-blur-md border border-[var(--theme-color,#d4af37)] transition-all duration-500 overflow-hidden text-left shadow-[0_0_15px_rgba(212,175,55,0.1)] hover:shadow-[0_0_25px_rgba(212,175,55,0.3)]">
                    {siteConfig.bottomLeftBgUrl && (
                      <div className="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-overlay transition-opacity duration-500 group-hover:opacity-60 pointer-events-none" style={{ backgroundImage: `url(${siteConfig.bottomLeftBgUrl})`}}></div>
                    )}
                    
                    {/* Split into two exact halves vertically */}
                    <div className="flex-1 flex flex-col h-full relative z-10 w-full">
                       {/* Top Button: Announcement */}
                       <button 
                         onClick={() => {
                           document.getElementById('commission-queue-section')?.scrollIntoView({ behavior: 'smooth' });
                         }}
                         className="flex-1 flex w-full text-left items-center justify-between px-6 border-b border-[var(--theme-color,#d4af37)]/50 hover:bg-[var(--theme-color,#d4af37)]/20 transition-colors group/btn1"
                       >
                         <div className="flex items-center gap-4">
                           <span className="text-white text-[15px] font-bold tracking-[0.2em] group-hover/btn1:text-[var(--theme-color,#d4af37)] transition-colors">站內公告</span>
                           <span className="text-[10px] text-[var(--theme-color,#d4af37)]/90 font-mono tracking-widest uppercase">Announcement</span>
                         </div>
                         <span className="text-[var(--theme-color,#d4af37)] text-xl group-hover/btn1:translate-x-2 transition-transform">&raquo;</span>
                       </button>
                       
                       {/* Bottom Button: Tracking */}
                       <button 
                         onClick={() => setPage('tracking')}
                         className="flex-1 flex w-full text-left items-center justify-between px-6 hover:bg-[var(--theme-color,#d4af37)]/20 transition-colors group/btn2"
                       >
                         <div className="flex items-center gap-4">
                           <span className="text-white text-[15px] font-bold tracking-[0.2em] group-hover/btn2:text-[var(--theme-color,#d4af37)] transition-colors">委託進度</span>
                           <span className="text-[10px] text-[var(--theme-color,#d4af37)]/90 font-mono tracking-widest uppercase">Track Order</span>
                         </div>
                         <span className="text-[var(--theme-color,#d4af37)] text-xl group-hover/btn2:translate-x-2 transition-transform">&raquo;</span>
                       </button>
                    </div>
                 </div>
              </div>

              {/* Desktop Bottom Right Main Button */}
              <div className="hidden md:block absolute bottom-12 right-12 z-20">
                 <button 
                    onClick={() => setPage('order')}
                    disabled={commissionStatus === 'closed'}
                    className="group relative flex items-center justify-center w-56 md:w-64 h-20 md:h-24 bg-black/50 backdrop-blur-md border border-[var(--theme-color,#d4af37)] disabled:opacity-50 disabled:grayscale transition-all duration-500 hover:bg-[var(--theme-color,#d4af37)]/20 shadow-[0_0_15px_rgba(212,175,55,0.1)] hover:shadow-[0_0_25px_rgba(212,175,55,0.3)]"
                 >
                   {siteConfig.bottomRightBgUrl && (
                     <div className="absolute inset-0 bg-cover bg-center opacity-30 group-hover:opacity-60 transition-opacity mix-blend-overlay" style={{ backgroundImage: `url(${siteConfig.bottomRightBgUrl})`}}></div>
                   )}
                   {/* Decorative slash */}
                   <div className="absolute top-0 right-0 w-6 md:w-8 h-6 md:h-8 border-t border-r border-[var(--theme-color,#d4af37)] translate-x-2 -translate-y-2 opacity-50 group-hover:translate-x-3 group-hover:-translate-y-3 transition-transform"></div>
                   <div className="absolute bottom-0 left-0 w-6 md:w-8 h-6 md:h-8 border-b border-l border-[var(--theme-color,#d4af37)] -translate-x-2 translate-y-2 opacity-50 group-hover:-translate-x-3 group-hover:translate-y-3 transition-transform"></div>
                   
                   <div className="relative z-10 flex flex-col items-center">
                      <span className={cn("text-xl md:text-2xl font-black tracking-[0.5em] ml-[0.35em]", commissionStatus === 'closed' ? "text-red-500" : "text-white group-hover:text-[var(--theme-color,#d4af37)] transition-colors")}>
                        {commissionStatus === 'closed' ? '局門暫閉' : '締結契約'}
                      </span>
                      <span className="text-[8px] md:text-[10px] text-[var(--theme-color,#d4af37)] font-mono mt-2 tracking-widest opacity-80 group-hover:opacity-100">
                        {commissionStatus === 'closed' ? 'COMMISSION CLOSED' : 'INITIATE CONTRACT'}
                      </span>
                   </div>
                 </button>
              </div>

              {/* Bottom Center Scroll Text */}
              <div className="hidden md:flex absolute bottom-6 left-1/2 -translate-x-1/2 flex-col items-center opacity-60">
                 <div className="text-center text-[var(--theme-color,#d4af37)] text-xs md:text-sm tracking-[0.4em] leading-loose mb-4">
                   此地承願，亦收代價。<br/>
                   恭候大駕。<br/>
                   瑪阿，在此為你書契。
                 </div>
                 <span className="text-[10px] font-mono tracking-[0.4em] text-[var(--theme-color,#d4af37)] mb-2 animate-bounce">SCROLL</span>
                 <div className="w-[1px] h-12 bg-gradient-to-b from-[var(--theme-color,#d4af37)] to-transparent"></div>
              </div>
            </div>
            
            {/* Scrollable Content Below Hero */}
            <div id="commission-queue-section" className="relative z-10 w-full bg-[#0d0d0d] pt-20 pb-32">
              <CommissionQueue />
            </div>
          </motion.div>
        );
      case 'order':
        return <OrderForm onBack={() => setPage('home')} commissionStatus={commissionStatus} onPaymentInfoClick={() => setPage('payment')} />;
      case 'tracking':
        return <OrderTracking onBack={() => setPage('home')} />;
      case 'portfolio':
        return <Portfolio onBack={() => setPage('home')} />;
      case 'pricelist':
        return <PriceList onBack={() => setPage('home')} />;
      case 'payment':
        return <PaymentInfo onBack={() => setPage('order')} />;
      case 'follow':
        return <FollowMe onBack={() => setPage('home')} user={user} />;
      case 'admin':
        return <AdminDashboard onBack={() => setPage('home')} user={user} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen text-gray-200 font-serif relative overflow-x-hidden md:overflow-hidden">
      <Navbar setPage={setPage} currentPage={page} user={user} siteConfig={siteConfig} socialLinks={socialLinks} />
      
      <main className={cn("relative z-10 min-h-[calc(100vh)]", page === 'home' ? "" : (page === 'admin' ? "pt-20 px-2 sm:px-6 w-full" : "pt-32 px-6 pb-20 w-full max-w-7xl mx-auto"))}>
        <AnimatePresence mode="wait">
          {renderPage()}
        </AnimatePresence>
      </main>
      
      {page !== 'home' && (
        <footer className="py-6 mt-12 border-t border-[var(--theme-color,#d4af37)]/30 text-center text-xs text-gray-500 tracking-widest relative z-10">
          <span 
            onDoubleClick={() => !user && signInWithGoogle()} 
            className="cursor-default select-none transition-colors hover:text-gray-300"
          >
            &copy; {new Date().getFullYear()} 龍契局. All Rights Reserved.
          </span>
        </footer>
      )}
    </div>
  );
}
