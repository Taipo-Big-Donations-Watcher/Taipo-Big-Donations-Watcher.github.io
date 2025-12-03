/**
 * Weibo Scraper
 * 
 * Scrapes donation posts from Weibo accounts (using mobile site m.weibo.cn).
 * Mobile site doesn't require login and shows full post content.
 */

const { fetchRenderedHtml, parseHtml, createDonationRecord } = require('./base');

const SOURCE_NAME = 'Weibo (微博)';
const SOURCE_URL = 'https://m.weibo.cn';

// Weibo accounts to scrape
const WEIBO_ACCOUNTS = [
  {
    id: '7747325954',
    name: '上海復星公益基金會',
    url: 'https://m.weibo.cn/u/7747325954',
  },
  // Add more accounts here as needed
];

/**
 * Parse amount from Weibo post text
 * @param {string} text 
 * @returns {{amount: number, isHKD: boolean}|null}
 */
function parseAmount(text) {
  // Match patterns like: 30万元人民币, 50万人民币, 60万人民币, 100万港元, 捐赠350万人民币
  // Must have 万/億/百万 followed by 元 or currency to be a valid donation amount
  // This prevents matching like counts (1.8万) or other numbers
  const amountMatch = text.match(/捐[赠款]\s*(\d+(?:\.\d+)?)\s*(万|億|百万)\s*(?:元)?\s*(人民币|港[币元])?/);
  
  if (!amountMatch) {
    // Try alternative pattern: 捐款100万元人民币
    const altMatch = text.match(/(\d+(?:\.\d+)?)\s*(万|億|百万)\s*元?\s*(人民币|港[币元])/);
    if (!altMatch) return null;
    
    const num = parseFloat(altMatch[1]);
    const unit = altMatch[2];
    const currency = altMatch[3];
    
    let multiplier = 1;
    if (unit === '万') multiplier = 10000;
    else if (unit === '億') multiplier = 100000000;
    else if (unit === '百万') multiplier = 1000000;
    
    const amount = num * multiplier;
    const isHKD = currency && (currency.includes('港'));
    
    return { amount, isHKD };
  }
  
  const num = parseFloat(amountMatch[1]);
  const unit = amountMatch[2];
  const currency = amountMatch[3];
  
  let multiplier = 1;
  if (unit === '万') multiplier = 10000;
  else if (unit === '億') multiplier = 100000000;
  else if (unit === '百万') multiplier = 1000000;
  
  const amount = num * multiplier;
  const isHKD = currency && (currency.includes('港'));
  
  return { amount, isHKD };
}

/**
 * Extract entity name from post text
 * @param {string} text 
 * @returns {string|null}
 */
function extractEntityName(text) {
  // Look for patterns like: 演员@展轩, @章若楠, 艺人@xxx, 爱心艺人章昊
  const patterns = [
    /(?:演员|艺人|歌手|明星|爱心艺人)\s*@(\S+?)(?:\s|通过|捐|向|$)/,
    /@(\S+?)(?:\s+通过|捐赠|捐款)/,
    /(?:演员|艺人|歌手|明星|爱心艺人)\s*(\S+?)(?:通过|向|捐赠|捐款)/,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      let name = match[1].trim();
      // Remove trailing punctuation or common suffixes
      name = name.replace(/[:：,，。]$/, '');
      // Skip if it's just a hashtag or empty
      if (name && !name.startsWith('#') && name.length > 1) {
        return name;
      }
    }
  }
  
  return null;
}

/**
 * Scrape a single Weibo account
 * @param {Object} account 
 * @returns {Promise<Object[]>}
 */
async function scrapeAccount(account) {
  console.log(`  Scraping: ${account.name} (${account.id})`);
  
  const html = await fetchRenderedHtml(account.url, {
    waitTime: 4000,
    mobile: true,
  });
  
  const $ = parseHtml(html);
  const bodyText = $('body').text();
  
  // Split into potential posts (by date patterns or newlines)
  const posts = bodyText.split(/\d{1,2}-\d{1,2}\s+\d{1,2}:\d{1,2}/).filter(p => p.length > 50);
  
  const donations = [];
  const seen = new Set();
  
  for (const post of posts) {
    // Must mention Hong Kong fire
    if (!post.includes('香港') && !post.includes('大埔') && !post.includes('火灾')) {
      continue;
    }
    
    // Must mention donation
    if (!post.includes('捐') && !post.includes('赠')) {
      continue;
    }
    
    // Extract amount first - skip if no amount specified
    const amountInfo = parseAmount(post);
    if (!amountInfo) continue;
    
    // Extract entity name
    const entity = extractEntityName(post);
    if (!entity) continue;
    
    // Avoid duplicates
    const key = entity.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    
    // Convert RMB to HKD if needed
    const hkdAmount = amountInfo.isHKD 
      ? amountInfo.amount 
      : Math.round(amountInfo.amount * 1.1);
    
    // Only add note for non-HKD donations with original amount in original currency
    let note = '';
    if (!amountInfo.isHKD) {
      // Format as Chinese style: e.g. "30萬人民幣"
      const amountInWan = amountInfo.amount / 10000;
      note = `${amountInWan}萬人民幣`;
    }
    
    const donation = createDonationRecord({
      entity: entity,
      group: '',
      totalValue: hkdAmount,
      cashValue: hkdAmount,
      goodsValue: null,
      capital: '中國',
      industry: '娛樂',
      type: '藝人',
      note: note,
      receiver: account.name,
      primarySource: account.url,
      secondarySource: '',
      verificationLink: account.url,
      dateOfAnnouncement: '',
    });
    
    donations.push(donation);
    console.log(`    Found: ${entity} - $${hkdAmount.toLocaleString()} HKD`);
  }
  
  return donations;
}

/**
 * Scrape all configured Weibo accounts
 * @returns {Promise<Object[]>}
 */
async function scrape() {
  console.log(`\n=== Scraping: ${SOURCE_NAME} ===`);
  console.log(`  Accounts: ${WEIBO_ACCOUNTS.length}`);
  
  const allDonations = [];
  
  for (const account of WEIBO_ACCOUNTS) {
    try {
      const donations = await scrapeAccount(account);
      allDonations.push(...donations);
    } catch (error) {
      console.error(`  Error scraping ${account.name}: ${error.message}`);
    }
  }
  
  console.log(`  Total parsed: ${allDonations.length} donations`);
  
  return allDonations;
}

module.exports = { scrape, SOURCE_NAME, SOURCE_URL, WEIBO_ACCOUNTS };

