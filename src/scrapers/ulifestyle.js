/**
 * ULifestyle Donations Scraper
 * 
 * Scrapes donation list from ULifestyle article about celebrity donations.
 * URL: https://hk.ulifestyle.com.hk/topic/detail/20082848
 * 
 * The page contains HTML tables with donor names and amounts.
 */

const { fetchHtml, parseHtml, createDonationRecord } = require('./base');

const SOURCE_URL = 'https://hk.ulifestyle.com.hk/topic/detail/20082848';
const SOURCE_NAME = 'ULifestyle (港生活)';

/**
 * Parse amount string to number
 * @param {string} amountStr - e.g., "100萬港元", "2000萬港元", "50萬港幣", "5億韓幣"
 * @returns {{ amount: number, originalNote: string }|null}
 */
function parseAmount(amountStr) {
  if (!amountStr || typeof amountStr !== 'string') return null;
  
  // Determine currency
  let currency = 'HKD';
  if (amountStr.includes('人民幣') || amountStr.includes('RMB')) {
    currency = 'RMB';
  } else if (amountStr.includes('韓幣') || amountStr.includes('韓元') || amountStr.includes('韓圜')) {
    currency = 'KRW';
  } else if (amountStr.includes('台幣') || amountStr.includes('台元')) {
    currency = 'TWD';
  }
  
  // Extract number with unit using regex
  // Pattern: number followed by optional unit (萬/億/百萬)
  const match = amountStr.match(/(\d+(?:,\d{3})*(?:\.\d+)?)\s*(萬|億|百萬)?/);
  if (!match) return null;
  
  let num = parseFloat(match[1].replace(/,/g, ''));
  if (isNaN(num)) return null;
  
  const unit = match[2] || '';
  let multiplier = 1;
  if (unit === '萬') multiplier = 10000;
  else if (unit === '億') multiplier = 100000000;
  else if (unit === '百萬') multiplier = 1000000;
  
  let amount = num * multiplier;
  
  // Convert to HKD if needed
  let hkdAmount = amount;
  let originalNote = '';
  
  if (currency === 'RMB') {
    hkdAmount = Math.round(amount * 1.1); // Approximate RMB to HKD
    originalNote = `${num}${unit}人民幣`;
  } else if (currency === 'KRW') {
    hkdAmount = Math.round(amount * 0.0059); // Approximate KRW to HKD
    originalNote = `${num}${unit}韓元`;
  } else if (currency === 'TWD') {
    hkdAmount = Math.round(amount * 0.24); // Approximate TWD to HKD
    originalNote = `${num}${unit}台幣`;
  }
  
  return {
    amount: hkdAmount,
    originalNote: originalNote,
  };
}

/**
 * Determine entity type based on name
 * @param {string} name 
 * @returns {string}
 */
function determineType(name) {
  if (name.includes('基金') || name.includes('基金會')) {
    return '基金';
  }
  if (name.includes('公司') || name.includes('集團') || name.includes('娛樂')) {
    return '企業';
  }
  if (name.includes('後援會') || name.includes('歌迷會') || name.includes('粉絲')) {
    return '粉絲團';
  }
  // Most entries in this article are artists
  return '藝人';
}

/**
 * Determine capital (origin) based on name and context
 * @param {string} name 
 * @param {string} sectionTitle - Current section title
 * @returns {string}
 */
function determineCapital(name, sectionTitle) {
  // Check section title first
  if (sectionTitle.includes('韓國')) return '韓國';
  if (sectionTitle.includes('中國')) return '中國';
  if (sectionTitle.includes('台灣')) return '台灣';
  if (sectionTitle.includes('香港')) return '香港';
  
  // Check name for hints
  if (name.includes('SM ') || name.includes('YG ') || name.includes('JYP ') || 
      name.includes('HYBE') || name.includes('WAKEONE') || name.includes('CJ')) {
    return '韓國';
  }
  
  // Default to Hong Kong for this article
  return '香港';
}

/**
 * Scrape donations from ULifestyle
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
    
    let currentSection = '香港藝人'; // Default section
    
    // Track section headers
    $('h2').each((i, el) => {
      const text = $(el).text().trim();
      if (text.includes('韓國')) currentSection = '韓國藝人';
      else if (text.includes('中國')) currentSection = '中國藝人';
      else if (text.includes('台灣')) currentSection = '台灣藝人';
      else if (text.includes('香港')) currentSection = '香港藝人';
    });
    
    // Parse tables - the article has multiple tables with donor info
    $('table').each((tableIdx, table) => {
      // Get section context from nearby h2
      let sectionContext = '香港';
      $(table).prevAll('h2').first().each((i, h2) => {
        const h2Text = $(h2).text().trim();
        if (h2Text.includes('韓國')) sectionContext = '韓國';
        else if (h2Text.includes('中國')) sectionContext = '中國';
        else if (h2Text.includes('台灣')) sectionContext = '台灣';
      });
      
      $(table).find('tr').each((rowIdx, row) => {
        const cells = $(row).find('td');
        if (cells.length >= 2) {
          const entityText = $(cells[0]).text().trim();
          const amountText = $(cells[1]).text().trim();
          
          // Skip header rows
          if (entityText.includes('捐贈藝人') || entityText.includes('捐贈金額') ||
              entityText.includes('公司') && amountText.includes('金額')) {
            return;
          }
          
          // Skip non-monetary entries like "首場收益" or "演唱會收益"
          if (amountText.includes('收益') || amountText.includes('盈利') || 
              amountText.includes('產品') && !amountText.match(/\d/)) {
            return;
          }
          
          if (entityText && amountText) {
            const parsed = parseAmount(amountText);
            if (parsed && parsed.amount > 0) {
              const key = entityText.toLowerCase().replace(/\s+/g, '');
              if (!seen.has(key)) {
                seen.add(key);
                
                const type = determineType(entityText);
                const capital = determineCapital(entityText, sectionContext);
                
                const donation = createDonationRecord({
                  entity: entityText,
                  totalValue: parsed.amount,
                  cashValue: parsed.amount,
                  capital: capital,
                  industry: '演藝',
                  type: type,
                  note: parsed.originalNote || '',
                  primarySource: SOURCE_URL,
                  secondarySource: '',
                  verificationLink: '',
                });
                
                donations.push(donation);
                console.log(`  Found: ${entityText} - $${parsed.amount?.toLocaleString() || 'N/A'} (${capital})`);
              }
            }
          }
        }
      });
    });
    
    console.log(`  Total parsed: ${donations.length} donations`);
    
    return donations;
    
  } catch (error) {
    console.error(`  Error scraping: ${error.message}`);
    throw error;
  }
}

module.exports = { scrape, SOURCE_NAME, SOURCE_URL };

