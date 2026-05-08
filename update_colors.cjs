const fs = require('fs');
const path = require('path');

function walkSync(dir, filelist = []) {
  fs.readdirSync(dir).forEach(file => {
    const p = path.join(dir, file);
    if (fs.statSync(p).isDirectory()) {
      if (file !== 'node_modules' && file !== '.git') walkSync(p, filelist);
    } else {
      if (p.endsWith('.tsx') || p.endsWith('.ts') || p.endsWith('.css')) filelist.push(p);
    }
  });
  return filelist;
}

const files = walkSync('src');
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let orig = content;
  
  // replace black background
  content = content.replace(/bg-black(?![a-zA-Z0-9\-\/])/g, 'bg-[var(--bg-color,#000000)]');
  content = content.replace(/bg-\[\#000000\]/g, 'bg-[var(--bg-color,#000000)]');
  content = content.replace(/bg-\[\#0d0d0d\]/g, 'bg-[var(--bg-color,#0d0d0d)]');

  // replace box backgrounds
  content = content.replace(/bg-\[\#121212\]/g, 'bg-[var(--box-bg-color,#121212)]');
  content = content.replace(/bg-\[\#1a1a1a\]/g, 'bg-[var(--box-bg-color,#1a1a1a)]');
  content = content.replace(/bg-\[\#2a2a2a\]/g, 'bg-[var(--box-bg-color,#2a2a2a)]');
  content = content.replace(/bg-gray-900(?![a-zA-Z0-9\-\/])/g, 'bg-[var(--box-bg-color,#111827)]');
  content = content.replace(/bg-gray-800(?![a-zA-Z0-9\-\/])/g, 'bg-[var(--box-bg-color,#1f2937)]');

  // replace text white and fafafa
  content = content.replace(/text-white(?![a-zA-Z0-9\-\/])/g, 'text-[var(--text-main,#ffffff)]');
  content = content.replace(/text-\[\#fafafa\]/g, 'text-[var(--text-main,#fafafa)]');

  // replace text muted
  content = content.replace(/text-gray-400(?![a-zA-Z0-9\-\/])/g, 'text-[var(--text-muted,#9ca3af)]');
  content = content.replace(/text-gray-500(?![a-zA-Z0-9\-\/])/g, 'text-[var(--text-muted,#6b7280)]');

  // replace generic borders
  content = content.replace(/border-gray-700(?![a-zA-Z0-9\-\/])/g, 'border-[var(--border-color,#374151)]');
  content = content.replace(/border-gray-800(?![a-zA-Z0-9\-\/])/g, 'border-[var(--border-color,#1f2937)]');

  if (content !== orig) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Updated:', file);
  }
});
