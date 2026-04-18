const fs = require('fs');
const path = require('path');

function replaceInDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      replaceInDir(fullPath);
    } else if (fullPath.endsWith('.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Add loading="lazy" if not present
      content = content.replace(/<img(?![^>]*loading="lazy")/g, '<img loading="lazy"');
      
      fs.writeFileSync(fullPath, content, 'utf8');
    }
  }
}

replaceInDir(path.join(__dirname, 'src', 'components'));
console.log('Done replacement');
