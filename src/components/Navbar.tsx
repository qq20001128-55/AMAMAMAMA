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
  const isAdmin = user?.email === 'sara20001128@gmail.com';

  return (
    <nav className="fixed top-0 left-0 right-0 bg-[#fafafa]/90 backdrop-blur-md z-50 border-b-2 border-[#53565b]">
      <div className="max-w-7xl mx-auto px-2 sm:px-6 h-auto min-h-[80px] py-2 sm:py-0 flex flex-wrap items-center justify-between">
        <button 
          onClick={() => setPage('home')}
          className="text-lg sm:text-2xl font-black tracking-widest hover:text-[#53565b] transition-colors flex items-center gap-2 mb-1 sm:mb-0"
        >
          {siteConfig?.logoUrl ? (
            <img src={siteConfig.logoUrl} alt="Logo" crossOrigin="anonymous" className="h-6 sm:h-8 w-auto object-contain" />
          ) : (
            <span className="w-6 h-6 sm:w-8 sm:h-8 border-2 border-[#53565b] flex items-center justify-center text-xs sm:text-sm font-bold bg-[#53565b] text-[#fafafa]">龍</span>
          )}
          <span className="hidden min-[375px]:inline whitespace-nowrap">龍契局</span>
        </button>

        <div className="flex items-center gap-2 sm:gap-4 md:gap-8 flex-wrap justify-center flex-1 sm:flex-none">
          <button 
            onClick={() => setPage('order')}
            className={`text-[10px] sm:text-sm tracking-widest hover:text-[#53565b] transition-colors whitespace-nowrap ${currentPage === 'order' ? 'text-[#53565b] font-bold' : 'text-[#53565b]'}`}
          >
            填寫願望
          </button>
          <button 
            onClick={() => setPage('pricelist')}
            className={`text-[10px] sm:text-sm tracking-widest hover:text-[#53565b] transition-colors whitespace-nowrap ${currentPage === 'pricelist' ? 'text-[#53565b] font-bold' : 'text-[#53565b]'}`}
          >
            價目表
          </button>
          <button 
            onClick={() => setPage('tracking')}
            className={`text-[10px] sm:text-sm tracking-widest hover:text-[#53565b] transition-colors whitespace-nowrap ${currentPage === 'tracking' ? 'text-[#53565b] font-bold' : 'text-[#53565b]'}`}
          >
            追蹤進度
          </button>
          <button 
            onClick={() => setPage('portfolio')}
            className={`text-[10px] sm:text-sm tracking-widest hover:text-[#53565b] transition-colors whitespace-nowrap ${currentPage === 'portfolio' ? 'text-[#53565b] font-bold' : 'text-[#53565b]'}`}
          >
            作品集
          </button>
          
          <div className="flex items-center gap-2 sm:gap-4 border-l-2 border-[#53565b] pl-2 sm:pl-8 overflow-hidden">
            <button 
              onClick={() => setPage('follow')}
              className={`text-[10px] sm:text-sm tracking-widest hover:text-[#53565b] transition-colors whitespace-nowrap ${currentPage === 'follow' ? 'text-[#53565b] font-bold' : 'text-[#53565b]'}`}
            >
              追蹤我
            </button>
            {isAdmin && (
              <button 
                onClick={() => setPage('admin')}
                className={`flex items-center gap-1 sm:gap-2 text-[10px] sm:text-sm tracking-widest hover:text-[#53565b] transition-colors whitespace-nowrap ${currentPage === 'admin' ? 'text-[#53565b] font-bold' : 'text-[#53565b]'}`}
              >
                <Settings size={14} className="sm:w-[18px] sm:h-[18px]" />
                <span className="hidden lg:inline">後台管理</span>
              </button>
            )}
            {user && (
              <button 
                onClick={logout}
                className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-sm text-[#53565b] hover:text-[#53565b] transition-colors whitespace-nowrap"
              >
                <UserIcon size={14} className="sm:w-[18px] sm:h-[18px]" />
                <span className="hidden lg:inline">登出</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
