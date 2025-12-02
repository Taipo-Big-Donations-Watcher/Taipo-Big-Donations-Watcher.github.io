/**
 * Entity Matcher
 * 
 * Robust entity name matching with:
 * - Two-way substring matching
 * - Simplified ↔ Traditional Chinese conversion
 * - Fuzzy matching for celebrity names
 * - False positive protection
 */

const OpenCC = require('opencc-js');

// Create converters
const s2t = OpenCC.Converter({ from: 'cn', to: 'hk' }); // Simplified to Traditional (HK)
const t2s = OpenCC.Converter({ from: 'hk', to: 'cn' }); // Traditional (HK) to Simplified

// Minimum length for substring matching to avoid false positives
// 2 characters is OK for Chinese (東亞), but need more for English
const MIN_SUBSTRING_LENGTH_CN = 2;
const MIN_SUBSTRING_LENGTH_EN = 4;

// Common prefixes that should NOT trigger a match alone
const FALSE_POSITIVE_PREFIXES = [
  '中國', '中国', '香港', '台灣', '台湾',
  '李', '張', '陳', '王', '黃', '林', '劉', '吳', '周', '鄭',
  '藝人', '先生', '小姐', '女士', '夫婦', '一家',
  '集團', '集团', '公司', '基金', '銀行', '银行',
  '捐', '捐款', '捐贈', '捐赠',
];

// Words to strip for comparison
const STRIP_WORDS = [
  '藝人', '先生', '小姐', '女士', '夫婦', '夫妇', '一家',
  '及', '與', '与', '和', '、', '/', ',', '，',
  '（', '）', '(', ')', '「', '」', '"', '"',
  '有限公司', '股份有限公司', 'Limited', 'Ltd', 'Ltd.',
  '集團', '集团', 'Group',
  '基金會', '基金会', 'Foundation',
  '慈善', 'Charity',
  '控股', 'Holdings',
  '國際', '国际', 'International',
  '香港', 'Hong Kong', 'HK',
  '度', // For matching "361度集團" with "361集團"
  '零售', // For matching "DFI零售集團" with "DFI集團"
  '啟動', '緊急', '宣布', '承諾', '累計', '首批', '追加', // Action words in headlines
  '萬元', '元', '人民幣', '物資', // Amount-related words in headlines
  '證券', '银行', '銀行', // Financial institution suffixes
];

// Separator patterns for splitting names
const SEPARATOR_PATTERN = /[、\/,，及與与和\s]+/;

/**
 * Escape special regex characters
 * @param {string} str 
 * @returns {string}
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Normalize organization names with common variations
 * e.g., "紅十字總會" and "紅十字會總會" should match
 * @param {string} name 
 * @returns {string}
 */
function normalizeOrgName(name) {
  if (!name) return '';
  
  let normalized = name;
  
  // "紅十字總會" → "紅十字會總會" (add missing 會)
  normalized = normalized.replace(/紅十字總會/g, '紅十字會總會');
  normalized = normalized.replace(/红十字总会/g, '红十字会总会');
  
  return normalized;
}

/**
 * Normalize a name for comparison
 * @param {string} name 
 * @returns {string}
 */
function normalizeName(name) {
  if (!name) return '';
  
  let normalized = name.trim().toLowerCase();
  
  // Remove stock codes like (0384)
  normalized = normalized.replace(/\s*[（(]\d+[)）]\s*/g, '');
  
  // Remove common suffixes/prefixes for cleaner matching
  for (const word of STRIP_WORDS) {
    const escaped = escapeRegex(word.toLowerCase());
    normalized = normalized.replace(new RegExp(escaped, 'gi'), '');
  }
  
  // Collapse whitespace
  normalized = normalized.replace(/\s+/g, '');
  
  return normalized;
}

/**
 * Extract core names from a combined entity string
 * e.g., "藝人張智霖先生 及 袁詠儀小姐一家" -> ["張智霖", "袁詠儀"]
 * e.g., "方力申/香港游泳學校/一瀧游泳" -> ["方力申", "香港游泳學校", "一瀧游泳"]
 * 
 * @param {string} name 
 * @returns {string[]}
 */
function extractCoreNames(name) {
  if (!name) return [];
  
  // First, split by separators
  const parts = name.split(SEPARATOR_PATTERN).filter(p => p.trim());
  
  const coreNames = [];
  
  for (let part of parts) {
    // Remove titles and suffixes
    let cleaned = part;
    for (const word of STRIP_WORDS) {
      const escaped = escapeRegex(word);
      cleaned = cleaned.replace(new RegExp(escaped, 'gi'), '');
    }
    cleaned = cleaned.trim();
    
    // Only keep if it has meaningful content
    if (cleaned.length >= 2) {
      coreNames.push(cleaned);
    }
  }
  
  return coreNames;
}

/**
 * Check if a string contains Chinese characters
 * @param {string} str 
 * @returns {boolean}
 */
function containsChinese(str) {
  return /[\u4e00-\u9fff]/.test(str);
}

/**
 * Get minimum length based on content type
 * @param {string} str 
 * @returns {number}
 */
function getMinLength(str) {
  return containsChinese(str) ? MIN_SUBSTRING_LENGTH_CN : MIN_SUBSTRING_LENGTH_EN;
}

/**
 * Check if a name is too generic to match alone
 * @param {string} name 
 * @returns {boolean}
 */
function isTooGeneric(name) {
  const normalized = name.trim().toLowerCase();
  const minLen = getMinLength(normalized);
  
  // Too short
  if (normalized.length < minLen) {
    return true;
  }
  
  // Check against false positive prefixes
  for (const prefix of FALSE_POSITIVE_PREFIXES) {
    if (normalized === prefix.toLowerCase()) {
      return true;
    }
  }
  
  return false;
}

/**
 * Check if two names match using substring matching
 * @param {string} name1 
 * @param {string} name2 
 * @returns {boolean}
 */
function substringMatch(name1, name2) {
  const n1 = normalizeName(name1);
  const n2 = normalizeName(name2);
  
  if (!n1 || !n2) return false;
  
  // Exact match after normalization
  if (n1 === n2) return true;
  
  // Two-way substring matching
  // But only if the shorter string is meaningful enough
  const shorter = n1.length <= n2.length ? n1 : n2;
  const longer = n1.length <= n2.length ? n2 : n1;
  
  // Avoid matching if shorter name is too generic
  if (isTooGeneric(shorter)) {
    return false;
  }
  
  // Check if shorter is contained in longer
  if (longer.includes(shorter)) {
    return true;
  }
  
  return false;
}

/**
 * Check if two entity names match (with Chinese conversion)
 * @param {string} scrapedName - Name from scraper
 * @param {string} existingName - Name from main donation list
 * @returns {{matched: boolean, reason: string}}
 */
function matchEntities(scrapedName, existingName) {
  if (!scrapedName || !existingName) {
    return { matched: false, reason: 'empty' };
  }
  
  // Normalize org names first (handle variations like 紅十字總會 vs 紅十字會總會)
  const normalizedScraped = normalizeOrgName(scrapedName);
  const normalizedExisting = normalizeOrgName(existingName);
  
  // Direct comparison (with normalized names)
  if (substringMatch(normalizedScraped, normalizedExisting)) {
    return { matched: true, reason: 'direct' };
  }
  
  // Try with Simplified → Traditional conversion
  const scrapedTraditional = s2t(normalizedScraped);
  if (substringMatch(scrapedTraditional, normalizedExisting)) {
    return { matched: true, reason: 's2t' };
  }
  
  // Try with Traditional → Simplified conversion
  const existingSimplified = t2s(normalizedExisting);
  if (substringMatch(normalizedScraped, existingSimplified)) {
    return { matched: true, reason: 't2s' };
  }
  
  // Try matching core names (for celebrity groups)
  const scrapedCores = extractCoreNames(scrapedName);
  const existingCores = extractCoreNames(existingName);
  
  // Also get traditional versions of scraped cores
  const scrapedCoresTraditional = scrapedCores.map(c => s2t(c));
  
  // Check if any core names match
  for (const sc of [...scrapedCores, ...scrapedCoresTraditional]) {
    for (const ec of existingCores) {
      const scMinLen = getMinLength(sc);
      const ecMinLen = getMinLength(ec);
      
      if (sc.length >= scMinLen && ec.length >= ecMinLen) {
        // Direct match of core names
        if (sc.toLowerCase() === ec.toLowerCase()) {
          return { matched: true, reason: 'core-exact' };
        }
        // Substring match of core names (but be careful)
        if (sc.length >= scMinLen && ec.length >= ecMinLen) {
          if (sc.toLowerCase().includes(ec.toLowerCase()) || 
              ec.toLowerCase().includes(sc.toLowerCase())) {
            // Additional check: avoid matching single-character surnames
            if (!isTooGeneric(sc) && !isTooGeneric(ec)) {
              return { matched: true, reason: 'core-substring' };
            }
          }
        }
      }
    }
  }
  
  // For multi-person entries, check if ALL core names from one match in the other
  if (scrapedCores.length >= 2 && existingCores.length >= 2) {
    const scrapedSet = new Set(scrapedCores.map(c => normalizeName(c)));
    const existingSet = new Set(existingCores.map(c => normalizeName(c)));
    
    // Check if at least 2 names match
    let matchCount = 0;
    for (const sc of scrapedSet) {
      for (const ec of existingSet) {
        if (sc === ec || sc.includes(ec) || ec.includes(sc)) {
          matchCount++;
          break;
        }
      }
    }
    
    if (matchCount >= 2) {
      return { matched: true, reason: 'multi-person' };
    }
  }
  
  return { matched: false, reason: 'no-match' };
}

/**
 * Find matching entity in a list
 * @param {string} scrapedName 
 * @param {Map<string, Object>} existingDonations - Map of normalized names to donation objects
 * @returns {{matched: boolean, matchedEntity: string|null, reason: string}}
 */
function findMatch(scrapedName, existingDonations) {
  for (const [key, donation] of existingDonations) {
    const existingName = donation.entity;
    const result = matchEntities(scrapedName, existingName);
    
    if (result.matched) {
      return {
        matched: true,
        matchedEntity: existingName,
        reason: result.reason,
      };
    }
  }
  
  return { matched: false, matchedEntity: null, reason: 'no-match' };
}

// Export for testing
module.exports = {
  normalizeName,
  extractCoreNames,
  isTooGeneric,
  substringMatch,
  matchEntities,
  findMatch,
  s2t,
  t2s,
};

