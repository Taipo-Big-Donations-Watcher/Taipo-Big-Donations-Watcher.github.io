/**
 * AM730 Restaurant Donations Scraper
 * 
 * Scrapes donation list from AM730 article about restaurants donating for fire relief.
 * URL: https://www.am730.com.hk/生活/大埔宏福苑五級火-熱心捐款賑災食肆一覽-bakehouse-beans-mister-donut-華御結-持續更新-/624097
 */

const { fetchHtml, parseHtml, createDonationRecord } = require('./base');

const SOURCE_URL = 'https://www.am730.com.hk/%E7%94%9F%E6%B4%BB/%E5%A4%A7%E5%9F%94%E5%AE%8F%E7%A6%8F%E8%8B%91%E4%BA%94%E7%B4%9A%E7%81%AB-%E7%86%B1%E5%BF%83%E6%8D%90%E6%AC%BE%E8%B3%91%E7%81%BD%E9%A3%9F%E8%82%86%E4%B8%80%E8%A6%BD-bakehouse-beans-mister-donut-%E8%8F%AF%E5%BE%A1%E7%B5%90-%E6%8C%81%E7%BA%8C%E6%9B%B4%E6%96%B0-/624097';
const SOURCE_NAME = 'AM730 (餐廳捐款)';

/**
 * Parse donation from h2 header text
 * Examples:
 * "Bakehouse捐20萬賑災"
 * "香港區Mister Donut捐100萬"
 * "Beans捐100萬協助街坊災民"
 * "華御結捐300萬現金及餐飲券"
 * "韓印紅捐贈20萬現金券＋韓國水及韓國蛋"
 * 
 * @param {string} text 
 * @returns {Object|null}
 */
function parseDonationFromH2(text) {
  if (!text) return null;
  
  // Pattern: Entity捐X萬 (with optional prefix like "香港區")
  const patterns = [
    /^(?:香港區)?(.+?)(?:捐出|捐贈|捐款|捐)\s*(\d+(?:,\d{3})*(?:\.\d+)?)\s*(萬|億|百萬)?/,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      let entity = match[1].trim();
      const numPart = match[2].replace(/,/g, '');
      const unit = match[3] || '';
      
      let amount = parseFloat(numPart);
      if (unit === '萬') amount *= 10000;
      else if (unit === '億') amount *= 100000000;
      else if (unit === '百萬') amount *= 1000000;
      
      if (entity && amount > 0) {
        return {
          entity: entity,
          amount: amount,
        };
      }
    }
  }
  
  return null;
}

/**
 * Scrape donations from AM730
 * @returns {Promise<Object[]>}
 */
async function scrape() {
  console.log(`\n=== Scraping: ${SOURCE_NAME} ===`);
  console.log(`  URL: ${SOURCE_URL}`);
  
  try {
    // AM730 content is server-rendered, use regular fetch
    const html = await fetchHtml(SOURCE_URL);
    const $ = parseHtml(html);
    
    const donations = [];
    const seen = new Set();
    
    // Parse h2 headers which contain donation info
    $('h2').each((i, el) => {
      const text = $(el).text().trim();
      
      // Try to parse donation from h2 text
      const parsed = parseDonationFromH2(text);
      if (parsed && parsed.entity) {
        const key = parsed.entity.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          
          const donation = createDonationRecord({
            entity: parsed.entity,
            totalValue: parsed.amount,
            cashValue: parsed.amount,
            capital: '香港',
            industry: '餐飲',
            type: '企業',
            note: '',
            primarySource: SOURCE_URL,
            secondarySource: '',
            verificationLink: '',
          });
          
          donations.push(donation);
          console.log(`  Found: ${parsed.entity} - $${parsed.amount?.toLocaleString() || 'N/A'}`);
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

module.exports = { scrape, SOURCE_NAME, SOURCE_URL };

