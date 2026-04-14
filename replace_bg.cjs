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
  
  // Replace background color
  content = content.replace(/#faf9f6/g, '#d9d9d6');
  content = content.replace(/#f3f0e9/g, '#d9d9d6'); // Remove old grid background color
  
  // Replace button color
  // We'll replace #1a1a1a with #53565b in button classes and some borders to match the new theme
  // Actually, let's just replace #1a1a1a with #53565b globally to soften the black, as requested "按鈕一律#53565b" might imply a softer dark tone overall, but let's stick to buttons and borders if possible.
  // The user said "整個底顏色要#d9d9d6，按鈕一律#53565b"
  
  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Updated', file);
  }
});
