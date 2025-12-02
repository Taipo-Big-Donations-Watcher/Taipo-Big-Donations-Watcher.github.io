/**
 * China Red Cross Scraper
 * 
 * Scrapes donation articles from China Red Cross official website.
 * Uses Puppeteer to render JavaScript-loaded content on the news list page.
 * URL: https://www.redcross.org.cn/html/NewsList.html?type=news&cla=newrdjz
 */

const { fetchRenderedHtml, parseHtml, createDonationRecord, sleep } = require('./base');

const SOURCE_URL = 'https://www.redcross.org.cn';
const NEWS_LIST_URL = 'https://www.redcross.org.cn/html/NewsList.html?type=news&cla=newrdjz';
const SOURCE_NAME = 'China Red Cross (中國紅十字會)';

// Pages to check (only first 2 pages have relevant entries)
const PAGES_TO_CHECK = 2;

/**
 * Find donation-related article links from the JS-rendered news list pages
 * @returns {Promise<Array<{title: string, url: string}>>}
 */
async function findDonationArticles() {
  console.log('  Fetching news list pages (with JS rendering)...');
  
  const articles = [];
  
  // Fetch the news list page with JS rendering
  console.log(`  Loading page 1...`);
  const html = await fetchRenderedHtml(NEWS_LIST_URL, {
    waitTime: 3000,
    waitForSelector: 'a[href*="NewsContent"]', // Wait for article links to load
  });
  
  const $ = parseHtml(html);
  
  // Debug: check what we got
  const allLinks = $('a').length;
  console.log(`  Found ${allLinks} total links on page`);
  
  // Extract donation articles
  $('a').each((i, el) => {
    const title = $(el).attr('title') || $(el).text().trim();
    const href = $(el).attr('href');
    
    if (!href || !title) return;
    
    // Only interested in Hong Kong fire donation articles
    if ((title.includes('香港') || title.includes('大埔')) && 
        (title.includes('捐') || title.includes('火灾') || title.includes('救援') || title.includes('驰援'))) {
      
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
  
  console.log(`  Found ${articles.length} donation articles from page 1`);
  
  // Try to load page 2 if we haven't found many articles
  if (PAGES_TO_CHECK > 1) {
    try {
      console.log(`  Loading page 2...`);
      // Page 2 might be loaded by clicking a button or via URL parameter
      const page2Url = `${NEWS_LIST_URL}&page=2`;
      const html2 = await fetchRenderedHtml(page2Url, {
        waitTime: 3000,
      });
      
      const $2 = parseHtml(html2);
      let page2Count = 0;
      
      $2('a').each((i, el) => {
        const title = $2(el).attr('title') || $2(el).text().trim();
        const href = $2(el).attr('href');
        
        if (!href || !title) return;
        
        if ((title.includes('香港') || title.includes('大埔')) && 
            (title.includes('捐') || title.includes('火灾') || title.includes('救援') || title.includes('驰援'))) {
          
          let fullUrl = href;
          if (href.startsWith('/')) {
            fullUrl = SOURCE_URL + href;
          } else if (!href.startsWith('http')) {
            fullUrl = SOURCE_URL + '/' + href;
          }
          
          if (!articles.some(a => a.url === fullUrl)) {
            articles.push({ title, url: fullUrl });
            page2Count++;
          }
        }
      });
      
      console.log(`  Found ${page2Count} additional articles from page 2`);
      
    } catch (error) {
      console.log(`  Warning: Could not fetch page 2: ${error.message}`);
    }
  }
  
  console.log(`  Total: ${articles.length} potential donation articles`);
  return articles;
}

/**
 * Parse donation info directly from title (no need to fetch article page)
 * @param {string} title 
 * @param {string} url 
 * @returns {Object|null}
 */
function parseDonationFromTitle(title, url) {
  // Examples:
  // "杭州灵隐寺捐赠1000万元人民币紧急驰援香港大埔火灾救援"
  // "刘亦菲女士捐赠150万元人民币紧急驰援香港大埔火灾救援"
  // "得力集团有限公司捐赠500万元港币紧急驰援香港大埔火灾救援"
  // "奥克斯集团有限公司捐赠3000万元港币紧急驰援香港大埔火灾救援"
  
  // Try to extract amount
  let amount = null;
  const amountMatch = title.match(/(\d+(?:\.\d+)?)(万|億|百万)(?:元)?(?:人民币|港[币元])?/);
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
  const isHKD = title.includes('港币') || title.includes('港元');
  
  // Convert RMB to HKD (approximate rate: 1 RMB ≈ 1.1 HKD)
  const hkdAmount = isHKD ? amount : Math.round(amount * 1.1);
  
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
    note: `via ${SOURCE_NAME}, original: ${amount.toLocaleString()} ${isHKD ? 'HKD' : 'RMB'}`,
    receiver: '中國紅十字會',
    primarySource: url,
    secondarySource: '',
    verificationLink: '',
    dateOfAnnouncement: '',
  });
}

/**
 * Scrape donations from China Red Cross
 * @returns {Promise<Object[]>}
 */
async function scrape() {
  console.log(`\n=== Scraping: ${SOURCE_NAME} ===`);
  console.log(`  URL: ${NEWS_LIST_URL}`);
  
  try {
    const articles = await findDonationArticles();
    const donations = [];
    const seen = new Set();
    
    for (const article of articles) {
      // Skip aggregate articles
      if (article.title.includes('携手各界') || 
          article.title.includes('1553万') ||
          article.title.includes('砥砺奋进') ||
          article.title.includes('爱心企业驰援') ||
          article.title.includes('法治路')) {
        continue;
      }
      
      // Only process individual donation articles (must have amount pattern)
      if (article.title.match(/捐赠?\d+/)) {
        // Parse directly from title (faster, no need to fetch each article)
        const donation = parseDonationFromTitle(article.title, article.url);
        if (donation) {
          // Deduplicate by entity name
          const key = donation.entity.toLowerCase();
          if (!seen.has(key)) {
            seen.add(key);
            donations.push(donation);
            console.log(`  Found: ${donation.entity} - $${donation.totalValue?.toLocaleString() || 'N/A'} HKD`);
          }
        }
      }
    }
    
    console.log(`  Total parsed: ${donations.length} donations`);
    
    return donations;
    
  } catch (error) {
    console.error(`  Error scraping: ${error.message}`);
    throw error;
  }
}

module.exports = { scrape, SOURCE_NAME, SOURCE_URL };
