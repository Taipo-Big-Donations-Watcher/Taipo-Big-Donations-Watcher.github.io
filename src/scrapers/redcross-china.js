/**
 * China Red Cross Scraper
 * 
 * Scrapes donation articles from China Red Cross official website.
 * URL: https://www.redcross.org.cn
 */

const { fetchHtml, parseHtml, parseAmount, createDonationRecord, sleep } = require('./base');
const { writeToAutoUpdateTab, appendLogOnly } = require('./sheet-writer');

const SOURCE_URL = 'https://www.redcross.org.cn';
const SOURCE_NAME = 'China Red Cross (中國紅十字會)';

/**
 * Find donation-related article links from the homepage
 * @returns {Promise<Array<{title: string, url: string}>>}
 */
async function findDonationArticles() {
  console.log('  Fetching homepage for donation articles...');
  
  const html = await fetchHtml(SOURCE_URL);
  const $ = parseHtml(html);
  
  const articles = [];
  
  // Find all links that mention donations to Hong Kong fire
  $('a').each((i, el) => {
    const title = $(el).attr('title') || $(el).text().trim();
    const href = $(el).attr('href');
    
    if (!href || !title) return;
    
    // Only interested in Hong Kong fire donation articles
    if ((title.includes('香港') || title.includes('大埔')) && 
        (title.includes('捐') || title.includes('火灾') || title.includes('救援'))) {
      
      // Build full URL
      let fullUrl = href;
      if (href.startsWith('/')) {
        fullUrl = SOURCE_URL + href;
      } else if (!href.startsWith('http')) {
        fullUrl = SOURCE_URL + '/' + href;
      }
      
      // Avoid duplicates
      if (!articles.some(a => a.url === fullUrl)) {
        articles.push({ title, url: fullUrl });
      }
    }
  });
  
  console.log(`  Found ${articles.length} potential donation articles`);
  return articles;
}

/**
 * Parse a single donation article
 * @param {string} url 
 * @param {string} title 
 * @returns {Promise<Object|null>}
 */
async function parseDonationArticle(url, title) {
  try {
    const html = await fetchHtml(url);
    const $ = parseHtml(html);
    
    // Get article content
    const content = $('body').text();
    
    // Extract entity and amount from title
    // Examples:
    // "杭州灵隐寺捐赠1000万元人民币紧急驰援香港大埔火灾救援"
    // "刘亦菲女士捐赠150万元人民币紧急驰援香港大埔火灾救援"
    // "湖北省长江证券公益慈善基金会捐赠100万元人民币紧急驰援香港大埔火灾救援"
    
    // Try to extract amount from title first
    let amount = null;
    const amountMatch = title.match(/(\d+(?:\.\d+)?)(万|億|百万)(?:元)?(?:人民币|港元)?/);
    if (amountMatch) {
      const num = parseFloat(amountMatch[1]);
      const unit = amountMatch[2];
      let multiplier = 1;
      if (unit === '万') multiplier = 10000;
      else if (unit === '億') multiplier = 100000000;
      else if (unit === '百万') multiplier = 1000000;
      amount = num * multiplier;
    }
    
    if (!amount) {
      return null;
    }
    
    // Extract entity name (before 捐赠/捐款)
    let entity = title;
    const entityMatch = title.match(/^(.+?)(?:捐赠|捐款|通过)/);
    if (entityMatch) {
      entity = entityMatch[1].trim();
    }
    
    // Determine currency (RMB vs HKD)
    const isRMB = title.includes('人民币') || !title.includes('港元');
    
    // Convert RMB to HKD (approximate rate: 1 RMB ≈ 1.1 HKD)
    const hkdAmount = isRMB ? Math.round(amount * 1.1) : amount;
    
    // Determine type
    let type = '企業';
    if (entity.includes('寺') || entity.includes('庙') || entity.includes('教')) {
      type = '宗教團體';
    } else if (entity.includes('女士') || entity.includes('先生')) {
      type = '個人';
    } else if (entity.includes('基金') || entity.includes('基金会')) {
      type = '基金';
    }
    
    return createDonationRecord({
      entity: entity,
      group: '',
      totalValue: hkdAmount,
      cashValue: hkdAmount,
      goodsValue: null,
      capital: '中國',
      industry: '',
      type: type,
      note: `via ${SOURCE_NAME}, original: ${amount.toLocaleString()} ${isRMB ? 'RMB' : 'HKD'}`,
      receiver: '中國紅十字會',
      primarySource: url,
      secondarySource: '',
      verificationLink: '',
      dateOfAnnouncement: '',
    });
    
  } catch (error) {
    console.error(`  Error parsing article ${url}: ${error.message}`);
    return null;
  }
}

/**
 * Scrape donations from China Red Cross
 * @returns {Promise<Object[]>}
 */
async function scrape() {
  console.log(`\n=== Scraping: ${SOURCE_NAME} ===`);
  console.log(`  URL: ${SOURCE_URL}`);
  
  try {
    const articles = await findDonationArticles();
    const donations = [];
    
    for (const article of articles) {
      // Skip aggregate articles
      if (article.title.includes('携手各界') || article.title.includes('1553万')) {
        console.log(`  Skipping aggregate article: ${article.title}`);
        continue;
      }
      
      // Only process individual donation articles
      if (article.title.match(/捐赠?\d+/)) {
        console.log(`  Processing: ${article.title.substring(0, 40)}...`);
        
        const donation = await parseDonationArticle(article.url, article.title);
        if (donation) {
          donations.push(donation);
          console.log(`  Found: ${donation.entity} - $${donation.totalValue?.toLocaleString() || 'N/A'} HKD`);
        }
        
        // Be polite - don't hammer the server
        await sleep(500);
      }
    }
    
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
        status: 'No individual donations found',
        message: 'Only aggregate articles or page structure changed',
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

