const fs = require('fs');
const path = require('path');

const walkSync = function(dir, filelist) {
  files = fs.readdirSync(dir);
  filelist = filelist || [];
  files.forEach(function(file) {
    if (fs.statSync(dir + '/' + file).isDirectory()) {
      if (file !== 'node_modules' && file !== '.git') {
        filelist = walkSync(dir + '/' + file, filelist);
      }
    }
    else {
      if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.css')) {
        filelist.push(dir + '/' + file);
      }
    }
  });
  return filelist;
};

const replaceInFiles = () => {
  const files = walkSync('src');
  files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    const original = content;
    // We'll replace hardcoded colors with var() or dark theme colors
    content = content.replace(/text-\[\#53565b\]/g, 'text-[var(--theme-color,#d4af37)]');
    content = content.replace(/border-\[\#53565b\]/g, 'border-[var(--theme-color,#d4af37)]');
    content = content.replace(/bg-\[\#53565b\]/g, 'bg-[var(--theme-color,#d4af37)]');
    content = content.replace(/bg-white\/[0-9]+/g, 'bg-black/40');
    // content = content.replace(/bg-white(?!([a-zA-Z0-9\-]+))/g, 'bg-transparent'); // risky, let's target specifically
    content = content.replace(/text-gray-800/g, 'text-gray-200');
    content = content.replace(/text-gray-700/g, 'text-gray-300');
    content = content.replace(/bg-gray-50/g, 'bg-[#1a1a1a]');
    content = content.replace(/bg-gray-100/g, 'bg-[#2a2a2a]');
    content = content.replace(/border-gray-200/g, 'border-gray-700');
    content = content.replace(/border-gray-100/g, 'border-gray-800');

    if (content !== original) {
      fs.writeFileSync(file, content, 'utf8');
      console.log('Updated:', file);
    }
  });
};

replaceInFiles();
console.log('Finished updating colors');
