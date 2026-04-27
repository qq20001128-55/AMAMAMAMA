import React from 'react';

export const SectionTitle = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <div className={`flex items-center justify-center mb-8 ${className}`}>
    <h2 className="section-title-decorated text-3xl md:text-4xl font-black tracking-widest text-[var(--theme-color,#d4af37)] m-0">
      {children}
    </h2>
  </div>
);
