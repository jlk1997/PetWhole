const fs = require('fs');
const path = require('path');

// Path to the file we need to modify
const easycomJsPath = path.join(__dirname, 'node_modules', '@dcloudio', 'vite-plugin-uni', 'dist', 'configureServer', 'easycom.js');

// Read the original file
let content = fs.readFileSync(easycomJsPath, 'utf8');

// Replace the problematic code - original line using debounce without third parameter
const originalLine = `const refreshEasycom = uni_shared_1.debounce(refresh, 100);`;

// New implementation with custom debounce function
const newContent = content.replace(originalLine, `
// Custom debounce implementation to avoid the destructuring issue
function customDebounce(fn, delay) {
    let timeout;
    const newFn = function() {
        clearTimeout(timeout);
        const timerFn = () => fn.apply(this, arguments);
        timeout = setTimeout(timerFn, delay);
    };
    newFn.cancel = function() {
        clearTimeout(timeout);
    };
    return newFn;
}
const refreshEasycom = customDebounce(refresh, 100);`);

// Write the file back
fs.writeFileSync(easycomJsPath, newContent, 'utf8');

console.log('Successfully patched easycom.js'); 