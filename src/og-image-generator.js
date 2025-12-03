const { registerFont, createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');
const https = require('https');

/**
 * Download font file if it doesn't exist
 * @param {string} url 
 * @param {string} dest 
 */
function downloadFont(url, dest) {
  if (fs.existsSync(dest)) {
    const stats = fs.statSync(dest);
    if (stats.size > 0) {
      return Promise.resolve();
    }
    // Delete empty/corrupt file
    fs.unlinkSync(dest);
  }
  
  // Ensure directory exists
  const dir = path.dirname(dest);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  return new Promise((resolve, reject) => {
    const request = https.get(url, (response) => {
      // Handle redirects
      if (response.statusCode === 302 || response.statusCode === 301) {
        downloadFont(response.headers.location, dest).then(resolve).catch(reject);
        return;
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download font: ${response.statusCode}`));
        return;
      }
      
      console.log(`Downloading font to ${dest}...`);
      const file = fs.createWriteStream(dest);
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        console.log('Font downloaded.');
        resolve();
      });

      file.on('error', (err) => {
        fs.unlink(dest, () => {});
        reject(err);
      });
    });
    
    request.on('error', (err) => {
      if (fs.existsSync(dest)) fs.unlinkSync(dest);
      reject(err);
    });
  });
}

// Helper to format money
function formatMoney(amount) {
  if (amount >= 100000000) { // 100M+
    return (amount / 100000000).toFixed(2) + '億';
  } else if (amount >= 10000) { // 10k+
    return (amount / 10000).toFixed(1) + '萬';
  }
  return amount.toLocaleString();
}

function formatMoneyEn(amount) {
  if (amount >= 1000000) { // 1M+
    return (amount / 1000000).toFixed(1) + 'M';
  } else if (amount >= 1000) { // 1k+
    return (amount / 1000).toFixed(0) + 'k';
  }
  return amount.toLocaleString();
}

/**
 * Generate OG Images (EN and ZH)
 * @param {number} totalAmount - Total donation amount in HKD
 * @param {string} outputDir - Directory to save images
 * @param {string} buildTime - ISO date string
 */
async function generateOgImages(totalAmount, outputDir, buildTime) {
  const width = 1200;
  const height = 630;
  
  // Setup Font
  const fontPath = path.join(process.cwd(), 'fonts', 'NotoSansCJKtc-Bold.otf');
  try {
    await downloadFont('https://github.com/googlefonts/noto-cjk/raw/main/Sans/OTF/TraditionalChinese/NotoSansCJKtc-Bold.otf', fontPath);
    registerFont(fontPath, { family: 'Noto Sans HK' });
    console.log('Registered font: Noto Sans HK');
  } catch (err) {
    console.error('Error setting up font:', err);
    // Continue with fallback
  }
  
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const date = new Date(buildTime);
  const dateZh = date.toLocaleDateString('zh-HK', { year: 'numeric', month: 'long', day: 'numeric' });
  const dateEn = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  const configs = [
    {
      lang: 'zh',
      label: `截止 ${dateZh}，捐款承諾已達`,
      amountText: 'HK$' + totalAmount.toLocaleString(),
      filename: 'og-image-zh.png'
    },
    {
      lang: 'en',
      label: `As of ${dateEn}, the total pledged donation has reached`,
      amountText: 'HK$' + totalAmount.toLocaleString(),
      filename: 'og-image-en.png'
    }
  ];

  for (const config of configs) {
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // 1. Background - Apple style light gradient
    const bgGradient = ctx.createLinearGradient(0, 0, width, height);
    bgGradient.addColorStop(0, '#ffffff');
    bgGradient.addColorStop(1, '#f0f2f5');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // 2. Text 1: Label (Small, Black)
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = '#1d1d1f'; // Apple dark gray
    
    // Font selection - Use simpler font family to ensure it loads
    const labelFontSize = 40;
    ctx.font = `bold ${labelFontSize}px "Noto Sans HK", Arial, sans-serif`;
    
    // Draw Label above center
    ctx.fillText(config.label, width / 2, height / 2 - 40);

    // 3. Text 2: Amount (Big, Gradient)
    ctx.textBaseline = 'top';
    const amountFontSize = 100;
    ctx.font = `900 ${amountFontSize}px "Noto Sans HK", Arial, sans-serif`;
    
    // Measure text to center gradient correctly
    const textMetrics = ctx.measureText(config.amountText);
    const textWidth = textMetrics.width;
    
    // Create text gradient (Blue-Purple)
    const bluePurple = ctx.createLinearGradient(width/2 - textWidth/2, 0, width/2 + textWidth/2, 0);
    bluePurple.addColorStop(0, '#4158D0');
    bluePurple.addColorStop(1, '#C850C0');
    
    ctx.fillStyle = bluePurple;
    // Draw Amount below center
    ctx.fillText(config.amountText, width / 2, height / 2 - 20);

    // 4. Save
    const buffer = canvas.toBuffer('image/png');
    const filePath = path.join(outputDir, config.filename);
    fs.writeFileSync(filePath, buffer);
    console.log(`Generated OG Image: ${filePath}`);
  }
}

module.exports = { generateOgImages };
