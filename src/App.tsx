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
import { motion, AnimatePresence } from 'motion/react';

type Page = 'home' | 'order' | 'tracking' | 'portfolio' | 'admin' | 'follow' | 'pricelist';

export default function App() {
  const [page, setPage] = useState<Page>('home');
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [commissionStatus, setCommissionStatus] = useState<'open' | 'closed'>('open');

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

  if (!isAuthReady) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-2 border-[#1a1a1a] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const renderPage = () => {
    switch (page) {
      case 'home':
        return (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-4xl mx-auto px-6 py-20 text-center"
          >
            <div className="mb-12 relative inline-block">
              <h1 className="text-6xl md:text-8xl font-black tracking-widest text-[#1a1a1a] mb-8" style={{ writingMode: 'vertical-rl', textOrientation: 'upright', height: '400px' }}>
                龍契局
              </h1>
              <div className="absolute top-0 -right-16 md:-right-24 h-full flex flex-col items-center justify-center">
                <div className="w-[2px] h-full bg-[#8b0000] opacity-20"></div>
                <div className="absolute w-8 h-8 border-2 border-[#8b0000] rotate-45 bg-[#faf9f6]"></div>
              </div>
            </div>
            
            <div className="text-lg text-gray-600 mb-16 max-w-lg mx-auto space-y-2 tracking-widest leading-loose">
              <p>世間有一局，名為龍契。</p>
              <p>不問來歷，不問善惡，</p>
              <p>但凡所求，皆可成交——</p>
              <p>願望可託，因果自承。</p>
              <p>此地承願，亦收代價。</p>
              <br/>
              <p>恭候大駕。</p>
              <br/>
              <p>瑪阿，在此為你書契。</p>
            </div>

            <div className="flex flex-col sm:flex-row flex-wrap gap-6 justify-center">
              <button 
                onClick={() => setPage('order')}
                disabled={commissionStatus === 'closed'}
                className="btn-primary text-lg px-12 py-4"
              >
                {commissionStatus === 'open' ? '締結契約' : '局門暫閉'}
              </button>
              <button 
                onClick={() => setPage('pricelist')}
                className="btn-secondary text-lg px-12 py-4"
              >
                價目表
              </button>
              <button 
                onClick={() => setPage('tracking')}
                className="btn-secondary text-lg px-12 py-4"
              >
                探問因果
              </button>
              <button 
                onClick={() => setPage('portfolio')}
                className="btn-secondary text-lg px-12 py-4"
              >
                過往卷宗
              </button>
            </div>
          </motion.div>
        );
      case 'order':
        return <OrderForm onBack={() => setPage('home')} commissionStatus={commissionStatus} />;
      case 'tracking':
        return <OrderTracking onBack={() => setPage('home')} />;
      case 'portfolio':
        return <Portfolio onBack={() => setPage('home')} />;
      case 'pricelist':
        return <PriceList onBack={() => setPage('home')} />;
      case 'follow':
        return <FollowMe onBack={() => setPage('home')} user={user} />;
      case 'admin':
        return <AdminDashboard onBack={() => setPage('home')} user={user} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#faf9f6] text-[#1a1a1a] font-serif">
      <Navbar setPage={setPage} currentPage={page} user={user} />
      <main className="pt-20">
        <AnimatePresence mode="wait">
          {renderPage()}
        </AnimatePresence>
      </main>
      <footer className="py-10 border-t-2 border-[#1a1a1a] text-center text-xs text-gray-500 tracking-widest mt-20 relative">
        <span 
          onDoubleClick={() => !user && signInWithGoogle()} 
          className="cursor-default select-none"
        >
          &copy; {new Date().getFullYear()} 龍契局. All Rights Reserved.
        </span>
      </footer>
    </div>
  );
}
