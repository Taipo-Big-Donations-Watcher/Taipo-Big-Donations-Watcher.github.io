/**
 * Sing Tao Headlines Scraper
 * 
 * Scrapes donation list from Sing Tao Headlines article.
 * URL: https://www.stheadline.com/realtime-finance/3521753/...
 */

const { fetchHtml, parseHtml, parseAmount, createDonationRecord } = require('./base');
const { writeToAutoUpdateTab, appendLogOnly } = require('./sheet-writer');

const SOURCE_URL = 'https://www.stheadline.com/realtime-finance/3521753/%E5%A4%A7%E5%9F%94%E5%AE%8F%E7%A6%8F%E8%8B%91%E4%BA%94%E7%B4%9A%E7%81%AB%E5%90%84%E5%A4%A7%E4%BC%81%E6%A5%AD%E6%8D%90%E6%AC%BE%E9%80%BE13%E5%84%84-%E4%B8%AD%E8%B3%87%E8%87%B3%E5%B0%91%E6%8D%90%E9%80%BE7%E5%84%84-%E7%A7%91%E4%BC%81%E6%96%B0%E5%A2%9E%E5%8A%A0%E5%AF%86%E5%B9%A3%E9%8C%A2%E5%8C%85%E5%8B%9F%E6%8D%90';
const SOURCE_NAME = 'Sing Tao Headlines (星島日報)';

/**
 * Parse donation from h2 header text
 * Examples:
 * "李嘉誠捐3000萬 基金會額外5000萬後續支援"
 * "公益金撥款5000萬成立援助基金"
 * "霍英東基金會捐贈3000萬"
 * "DFI集團捐1000萬及500萬物資"
 * 
 * @param {string} text 
 * @returns {Object|null}
 */
function parseDonationFromH2(text) {
  // Skip non-donation headers
  if (!text || text.includes('大埔宏福苑五級火機構捐助')) {
    return null;
  }
  
  // Extract amounts in various formats
  // Pattern: X萬, X億, X元, 1000萬, etc.
  const amounts = [];
  
  // Match amounts like "3000萬", "5000萬", "1億"
  const amountMatches = text.matchAll(/(\d+(?:,\d{3})*(?:\.\d+)?)(萬|億|百萬)/g);
  for (const match of amountMatches) {
    const num = parseFloat(match[1].replace(/,/g, ''));
    const unit = match[2];
    let multiplier = 1;
    if (unit === '萬') multiplier = 10000;
    else if (unit === '億') multiplier = 100000000;
    else if (unit === '百萬') multiplier = 1000000;
    amounts.push(num * multiplier);
  }
  
  if (amounts.length === 0) {
    return null;
  }
  
  // Sum up the amounts (some entries have multiple donations)
  const totalAmount = amounts.reduce((a, b) => a + b, 0);
  
  // Extract entity name (before 捐/撥款/捐贈/捐出)
  let entity = text;
  
  // Try different patterns to extract entity name
  const entityPatterns = [
    /^(.+?)(?:捐贈|捐出|捐款|撥款|撥出|捐)\d/,  // Entity捐X萬
    /^(.+?)(?:捐贈|捐出|捐款|撥款|撥出|捐)/,     // Entity捐
  ];
  
  for (const pattern of entityPatterns) {
    const match = text.match(pattern);
    if (match) {
      entity = match[1].trim();
      break;
    }
  }
  
  // Clean up entity name
  entity = entity.replace(/^\s*[-•·]\s*/, ''); // Remove bullet points
  
  // Determine if it includes goods
  let cashValue = totalAmount;
  let goodsValue = null;
  
  if (text.includes('物資') || text.includes('服務')) {
    // If mentioned goods, try to split
    // e.g., "捐1000萬及500萬物資"
    const goodsMatch = text.match(/(\d+(?:,\d{3})*)(萬|億|百萬)(?:元)?(?:的)?物資/);
    if (goodsMatch) {
      const goodsNum = parseFloat(goodsMatch[1].replace(/,/g, ''));
      const unit = goodsMatch[2];
      let multiplier = 1;
      if (unit === '萬') multiplier = 10000;
      else if (unit === '億') multiplier = 100000000;
      goodsValue = goodsNum * multiplier;
      cashValue = totalAmount - goodsValue;
    }
  }
  
  // Determine type based on keywords
  let type = '企業';
  if (entity.includes('基金') || entity.includes('基金會')) {
    type = '基金';
  } else if (entity.includes('先生') || entity.includes('女士') || entity.includes('夫人') || entity.includes('太太')) {
    type = '個人';
  }
  
  return createDonationRecord({
    entity: entity,
    group: '',
    totalValue: totalAmount,
    cashValue: cashValue > 0 ? cashValue : null,
    goodsValue: goodsValue,
    capital: '香港', // Default, may need adjustment
    industry: '',
    type: type,
    note: `via ${SOURCE_NAME}`,
    receiver: '',
    primarySource: '',
    secondarySource: SOURCE_URL,
    verificationLink: '',
    dateOfAnnouncement: '',
  });
}

/**
 * Scrape donations from Sing Tao Headlines
 * @returns {Promise<Object[]>}
 */
async function scrape() {
  console.log(`\n=== Scraping: ${SOURCE_NAME} ===`);
  console.log(`  URL: ${SOURCE_URL}`);
  
  try {
    const html = await fetchHtml(SOURCE_URL);
    const $ = parseHtml(html);
    
    const donations = [];
    const seen = new Set();
    
    // Find all h2 headers in the article
    $('h2').each((i, el) => {
      const text = $(el).text().trim();
      
      if (!text) return;
      
      const donation = parseDonationFromH2(text);
      if (donation && donation.entity) {
        // Deduplicate by entity name
        const key = donation.entity.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          donations.push(donation);
          console.log(`  Found: ${donation.entity} - $${donation.totalValue?.toLocaleString() || 'N/A'}`);
        }
      }
    });
    
    console.log(`  Total parsed: ${donations.length} donations`);
    
    return donations;
    
  } catch (error) {
    console.error(`  Error scraping: ${error.message}`);
    throw error;
  }
}

/**
 * Run scraper and write results to sheet
 */
async function run() {
  try {
    const donations = await scrape();
    
    if (donations.length === 0) {
      await appendLogOnly(SOURCE_NAME, {
        sourceUrl: SOURCE_URL,
        status: 'No donations found',
        message: 'Page structure may have changed',
      });
      return { success: true, count: 0 };
    }
    
    const result = await writeToAutoUpdateTab(donations, SOURCE_NAME, {
      sourceUrl: SOURCE_URL,
      status: 'Success',
    });
    
    return { success: true, ...result };
    
  } catch (error) {
    await appendLogOnly(SOURCE_NAME, {
      sourceUrl: SOURCE_URL,
      status: 'Error',
      error: error.message,
    });
    return { success: false, error: error.message };
  }
}

// Allow running directly
if (require.main === module) {
  run()
    .then(result => {
      console.log('\n=== Result ===');
      console.log(result);
      process.exit(result.success ? 0 : 1);
    })
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { scrape, run, SOURCE_NAME, SOURCE_URL };

