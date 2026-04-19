import React from 'react';
import { User } from 'firebase/auth';
import { User as UserIcon, Settings } from 'lucide-react';
import { logout } from '../firebase';

interface NavbarProps {
  setPage: (page: any) => void;
  currentPage: string;
  user: User | null;
  siteConfig?: any;
}

export default function Navbar({ setPage, currentPage, user, siteConfig }: NavbarProps) {
  // Check if user is admin
  const isAdmin = true; // user?.email === 'sara20001128@gmail.com';

  return (
    <nav className="fixed top-0 left-0 right-0 bg-[#fafafa]/90 backdrop-blur-md z-50 border-b-2 border-[#53565b]">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <button 
          onClick={() => setPage('home')}
          className="text-2xl font-black tracking-widest hover:text-[#53565b] transition-colors flex items-center gap-2"
        >
          {siteConfig?.logoUrl ? (
            <img src={siteConfig.logoUrl} alt="Logo" crossOrigin="anonymous" className="h-8 w-auto object-contain" />
          ) : (
            <span className="w-8 h-8 border-2 border-[#53565b] flex items-center justify-center text-sm font-bold bg-[#53565b] text-[#fafafa]">龍</span>
          )}
          龍契局
        </button>

        <div className="flex items-center gap-8">
          <button 
            onClick={() => setPage('order')}
            className={`text-sm tracking-widest hover:text-[#53565b] transition-colors ${currentPage === 'order' ? 'text-[#53565b] font-bold' : 'text-[#53565b]'}`}
          >
            填寫願望
          </button>
          <button 
            onClick={() => setPage('pricelist')}
            className={`text-sm tracking-widest hover:text-[#53565b] transition-colors ${currentPage === 'pricelist' ? 'text-[#53565b] font-bold' : 'text-[#53565b]'}`}
          >
            價目表
          </button>
          <button 
            onClick={() => setPage('tracking')}
            className={`text-sm tracking-widest hover:text-[#53565b] transition-colors ${currentPage === 'tracking' ? 'text-[#53565b] font-bold' : 'text-[#53565b]'}`}
          >
            追蹤進度
          </button>
          <button 
            onClick={() => setPage('portfolio')}
            className={`text-sm tracking-widest hover:text-[#53565b] transition-colors ${currentPage === 'portfolio' ? 'text-[#53565b] font-bold' : 'text-[#53565b]'}`}
          >
            作品集
          </button>
          
          <div className="flex items-center gap-4 border-l-2 border-[#53565b] pl-8">
            <button 
              onClick={() => setPage('follow')}
              className={`text-sm tracking-widest hover:text-[#53565b] transition-colors ${currentPage === 'follow' ? 'text-[#53565b] font-bold' : 'text-[#53565b]'}`}
            >
              追蹤我
            </button>
            {isAdmin && (
              <button 
                onClick={() => setPage('admin')}
                className={`flex items-center gap-2 text-sm tracking-widest hover:text-[#53565b] transition-colors ${currentPage === 'admin' ? 'text-[#53565b] font-bold' : 'text-[#53565b]'}`}
              >
                <Settings size={18} />
                <span className="hidden sm:inline">後台管理</span>
              </button>
            )}
            {user && (
              <button 
                onClick={logout}
                className="flex items-center gap-2 text-sm text-[#53565b] hover:text-[#53565b] transition-colors"
              >
                <UserIcon size={18} />
                <span className="hidden sm:inline">登出</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
