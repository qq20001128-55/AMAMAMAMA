import React from 'react';

export const CloudBackground = () => {
  return (
    <div 
      className="fixed inset-0 pointer-events-none z-[-1]"
      style={{
        backgroundImage: `url("/cloud-pattern.png")`,
        backgroundRepeat: 'repeat',
        backgroundSize: '400px 400px',
        opacity: 0.15, // Slightly higher opacity since it's an image, adjust as needed
        mixBlendMode: 'multiply'
      }}
    />
  );
};
