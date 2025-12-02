/**
 * Po Leung Kuk Scraper
 * 
 * Scrapes donation list from Po Leung Kuk's Tai Po Fire Support page.
 * URL: https://www.poleungkuk.org.hk/news/taipofiresupport
 */

const { fetchHtml, parseHtml, parseAmount, createDonationRecord } = require('./base');
const { writeToAutoUpdateTab, appendLogOnly } = require('./sheet-writer');

const SOURCE_URL = 'https://www.poleungkuk.org.hk/news/taipofiresupport';
const SOURCE_NAME = 'Po Leung Kuk (保良局)';

/**
 * Parse a donation entry from the text
 * Examples:
 * "(1) 梁安琪慈善基金、保良局副主席何猷亨先生及何猷君先生及奚夢瑤小姐一家捐出共港幣3,000,000元"
 * "(2) 保良局永恆愛心之星郭富城先生通過郭富城國際關愛慈善基金捐出港幣1,000,000元"
 * 
 * @param {string} text 
 * @returns {Object|null}
 */
function parseDonationEntry(text) {
  // Remove leading number like "(1)" or "(2）"
  let cleaned = text.replace(/^\s*\(\d+[）\)]\s*/, '').trim();
  
  // Pattern: [Entity] 捐出(共)港幣X元
  // Some have "通過" in the middle indicating the receiver
  
  // Try to extract amount first
  const amountMatch = cleaned.match(/捐出(?:共)?港幣([\d,]+)元/);
  if (!amountMatch) {
    return null;
  }
  
  const amountStr = amountMatch[1];
  const amount = parseAmount(amountStr);
  
  // Extract entity name (everything before 捐出 or 通過)
  let entityPart = cleaned.split(/捐出|通過/)[0].trim();
  
  // Check for receiver (通過 indicates the receiver)
  let receiver = '';
  const throughMatch = cleaned.match(/通過([^捐]+)捐出/);
  if (throughMatch) {
    receiver = throughMatch[1].trim();
  }
  
  // Clean up entity name
  // Remove titles like "先生", "小姐", "一家" at the end for cleaner matching
  // But keep them in the full name
  const entity = entityPart;
  
  // Determine type based on keywords
  let type = '';
  if (entity.includes('藝人') || entity.includes('先生') || entity.includes('小姐') || entity.includes('夫婦')) {
    type = '藝人';
  } else if (entity.includes('基金')) {
    type = '基金';
  } else if (entity.includes('公司') || entity.includes('Limited')) {
    type = '企業';
  }
  
  return createDonationRecord({
    entity: entity,
    group: '',
    totalValue: amount,
    cashValue: amount, // Assume all cash unless specified
    goodsValue: null,
    capital: '香港', // Assume HK for Po Leung Kuk donations
    industry: '',
    type: type,
    note: `via ${SOURCE_NAME}`,
    receiver: receiver || '保良局扶弱基金',
    primarySource: SOURCE_URL,
    secondarySource: '',
    verificationLink: '',
    dateOfAnnouncement: '',
  });
}

/**
 * Scrape donations from Po Leung Kuk
 * @returns {Promise<Object[]>}
 */
async function scrape() {
  console.log(`\n=== Scraping: ${SOURCE_NAME} ===`);
  console.log(`  URL: ${SOURCE_URL}`);
  
  try {
    const html = await fetchHtml(SOURCE_URL);
    const $ = parseHtml(html);
    
    // Find the donation list section
    // The donations are in <p> tags after "鳴謝以下大額捐款善長："
    const contentDiv = $('.ckec');
    
    if (!contentDiv.length) {
      throw new Error('Could not find content div (.ckec)');
    }
    
    const donations = [];
    let foundDonationSection = false;
    
    contentDiv.find('p').each((i, el) => {
      const text = $(el).text().trim();
      
      // Start capturing after we see the donation list header
      if (text.includes('鳴謝以下大額捐款善長')) {
        foundDonationSection = true;
        return;
      }
      
      // Stop if we hit the photo section
      if (text.includes('相片連結') || text.includes('相片一')) {
        foundDonationSection = false;
        return;
      }
      
      // Parse donation entries - split by (number) pattern since multiple can be in one <p>
      if (foundDonationSection && text.match(/\(\d+/)) {
        // Split the text by entry markers like "(1)", "(2)", etc.
        const entries = text.split(/(?=\(\d+[）\)])/);
        
        for (const entry of entries) {
          if (entry.match(/^\s*\(\d+/)) {
            const donation = parseDonationEntry(entry);
            if (donation) {
              donations.push(donation);
              console.log(`  Found: ${donation.entity} - $${donation.totalValue?.toLocaleString() || 'N/A'}`);
            }
          }
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

