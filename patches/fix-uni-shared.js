const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '../node_modules/@dcloudio/uni-shared/dist/uni-shared.cjs.js');

console.log('📝 Patching uni-shared.cjs.js...');

try {
  // Read the file
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Check if the file contains the problematic debounce function
  if (content.includes('function debounce(')) {
    // Replace the problematic debounce implementation with a safer one
    content = content.replace(
      /function debounce\(.*?\{[\s\S]*?return function[\s\S]*?\};?\s*\}/m,
      `function debounce(fn, delay) {
  let timer = null;
  return function(...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
}`
    );
    
    // Write the modified content back to the file
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('✅ Successfully patched uni-shared.cjs.js!');
  } else {
    console.log('⚠️ Could not find the debounce function in uni-shared.cjs.js.');
  }
} catch (error) {
  console.error('❌ Error patching uni-shared.cjs.js:', error);
} 