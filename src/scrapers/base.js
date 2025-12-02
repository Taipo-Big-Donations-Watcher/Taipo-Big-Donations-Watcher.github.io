/**
 * Base Scraper Utilities
 * 
 * Common functions for all scrapers including fetching, parsing, and normalization.
 */

const https = require('https');
const http = require('http');
const cheerio = require('cheerio');

/**
 * Fetch HTML from a URL with custom headers to avoid bot detection
 * @param {string} url 
 * @param {Object} options 
 * @returns {Promise<string>}
 */
async function fetchHtml(url, options = {}) {
  const defaultHeaders = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'zh-HK,zh;q=0.9,en;q=0.8',
    'Accept-Encoding': 'identity', // Don't request compression for simplicity
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
  };

  const headers = { ...defaultHeaders, ...options.headers };
  
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    
    const req = protocol.get(url, { headers, timeout: 30000 }, (res) => {
      // Handle redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const redirectUrl = res.headers.location.startsWith('http') 
          ? res.headers.location 
          : new URL(res.headers.location, url).href;
        return fetchHtml(redirectUrl, options).then(resolve).catch(reject);
      }
      
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
        return;
      }
      
      let data = '';
      res.setEncoding('utf8');
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

/**
 * Parse HTML string with cheerio
 * @param {string} html 
 * @returns {cheerio.CheerioAPI}
 */
function parseHtml(html) {
  return cheerio.load(html);
}

/**
 * Parse amount string to number (handles HKD formats)
 * @param {string} amountStr 
 * @returns {number|null}
 */
function parseAmount(amountStr) {
  if (!amountStr || typeof amountStr !== 'string') return null;
  
  // Remove currency symbols, commas, spaces
  let cleaned = amountStr.replace(/[HKD$,\s港幣元]/gi, '').trim();
  
  // Handle Chinese numerals for large numbers (萬 = 10,000, 億 = 100,000,000)
  if (cleaned.includes('萬')) {
    const num = parseFloat(cleaned.replace('萬', ''));
    return isNaN(num) ? null : num * 10000;
  }
  if (cleaned.includes('億')) {
    const num = parseFloat(cleaned.replace('億', ''));
    return isNaN(num) ? null : num * 100000000;
  }
  
  // Handle "million" / "百萬"
  if (cleaned.includes('百萬') || amountStr.toLowerCase().includes('million')) {
    const num = parseFloat(cleaned.replace('百萬', ''));
    return isNaN(num) ? null : num * 1000000;
  }
  
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Normalize entity name for comparison
 * @param {string} name 
 * @returns {string}
 */
function normalizeEntityName(name) {
  if (!name) return '';
  return name
    .trim()
    .replace(/\s+/g, ' ')           // Collapse whitespace
    .replace(/（/g, '(')            // Normalize brackets
    .replace(/）/g, ')')
    .replace(/\s*[,，]\s*/g, ',')   // Normalize commas
    .toLowerCase();
}

/**
 * Create a donation record in the standard schema
 * @param {Object} data 
 * @returns {Object}
 */
function createDonationRecord(data) {
  return {
    entity: data.entity || '',
    group: data.group || '',
    totalValue: data.totalValue || null,
    cashValue: data.cashValue || null,
    goodsValue: data.goodsValue || null,
    capital: data.capital || '',
    industry: data.industry || '',
    type: data.type || '',
    note: data.note || '',
    receiver: data.receiver || '',
    primarySource: data.primarySource || '',
    secondarySource: data.secondarySource || '',
    verificationLink: data.verificationLink || '',
    dateOfAnnouncement: data.dateOfAnnouncement || '',
  };
}

/**
 * Convert donation record to sheet row array
 * @param {Object} record 
 * @returns {string[]}
 */
function recordToRow(record) {
  return [
    record.entity,
    record.group,
    record.totalValue !== null ? record.totalValue.toString() : '',
    record.cashValue !== null ? record.cashValue.toString() : '',
    record.goodsValue !== null ? record.goodsValue.toString() : '',
    record.capital,
    record.industry,
    record.type,
    record.note,
    record.receiver,
    record.primarySource,
    record.secondarySource,
    record.verificationLink,
    record.dateOfAnnouncement,
  ];
}

/**
 * Sleep for a specified number of milliseconds
 * @param {number} ms 
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  fetchHtml,
  parseHtml,
  parseAmount,
  normalizeEntityName,
  createDonationRecord,
  recordToRow,
  sleep,
};

