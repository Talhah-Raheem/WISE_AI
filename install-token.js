// install-token.js
// Usage: node install-token.js <token>

if (process.argv.length < 3) {
  console.error('Usage: node install-token.js <your-school-token>');
  process.exit(1);
}

const token = process.argv[2];
console.log(`
WISE AI Reflect - Token Installation Instructions

To install this token in the extension:
1. Open Chrome and click the WISE AI Reflect extension icon
2. Press F12 to open DevTools
3. Go to the Console tab
4. Paste this command and press Enter:

chrome.storage.sync.set({ clientToken: '${token}' }, () => {
  console.log('Token installed successfully! You can close DevTools now.');
});

5. Close DevTools and test by submitting a reflection
`);
