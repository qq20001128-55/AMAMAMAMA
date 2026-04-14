const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.css')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('src');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;
  
  content = content.replace(/#8b0000/g, '#1a1a1a');
  content = content.replace(/bg-red-50/g, 'bg-gray-100');
  content = content.replace(/ring-red-50/g, 'ring-gray-100');
  content = content.replace(/text-green-700/g, 'text-gray-800');
  content = content.replace(/bg-green-700/g, 'bg-gray-800');
  content = content.replace(/border-green-700/g, 'border-gray-800');
  content = content.replace(/hover:bg-green-50/g, 'hover:bg-gray-100');
  content = content.replace(/hover:bg-green-800/g, 'hover:bg-gray-900');
  content = content.replace(/hover:bg-red-50/g, 'hover:bg-gray-100');
  content = content.replace(/hover:bg-red-900/g, 'hover:bg-gray-900');
  content = content.replace(/text-\[#d4af37\]/g, 'text-gray-300');
  
  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Updated', file);
  }
});
