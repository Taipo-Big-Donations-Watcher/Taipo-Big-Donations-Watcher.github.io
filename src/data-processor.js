/**
 * Data Processor Module
 * 
 * Transforms raw Google Sheets data into normalized JSON for the frontend.
 * Supports bilingual output (English and Chinese).
 */

const { translateCategory, getCategoryIcon } = require('./i18n/categories');

/**
 * Default column name to index mapping
 * This will be overridden by dynamic detection if headers are provided
 */
const DEFAULT_COLUMN_MAP = {
  entity: 0,
  group: 1,
  totalValue: 2,
  cashValue: 3,
  goodsValue: 4,
  capital: 5,
  industry: 6,
  type: 7,
  note: 8,
  through: 9,
  primarySource: 10,
  secondarySource: 11,
  verificationLink: 12,
  dateOfAnnouncement: 13,
  entityEn: -1, // Optional column, -1 means not present
};

/**
 * Build column map from headers
 * Supports dynamic column detection including optional "Entity (EN)" column
 * @param {string[]} headers 
 * @returns {Object}
 */
function buildColumnMap(headers) {
  const map = { ...DEFAULT_COLUMN_MAP };
  
  headers.forEach((header, index) => {
    const h = header.toLowerCase().trim();
    
    if (h === 'entity' || h === '捐款者') {
      map.entity = index;
    } else if (h === 'entity (en)' || h === 'entity_en' || h === '捐款者 (英文)') {
      map.entityEn = index;
    } else if (h === 'group' || h === '類別') {
      map.group = index;
    } else if (h.includes('promised donation value') || h.includes('總捐款')) {
      map.totalValue = index;
    } else if (h.includes('promised cash') || h.includes('現金')) {
      map.cashValue = index;
    } else if (h.includes('promised goods') || h.includes('物資')) {
      map.goodsValue = index;
    } else if (h.includes('capital') || h.includes('資本')) {
      map.capital = index;
    } else if (h === 'industry' || h === '行業') {
      map.industry = index;
    } else if (h === 'type' || h === '類型') {
      map.type = index;
    } else if (h === 'note' || h === '備註') {
      map.note = index;
    } else if (h === 'through' || h === '渠道') {
      map.through = index;
    } else if (h.includes('primary source') || h.includes('主要來源')) {
      map.primarySource = index;
    } else if (h.includes('secondary source') || h.includes('次要來源')) {
      map.secondarySource = index;
    } else if (h.includes('verification') || h.includes('核實')) {
      map.verificationLink = index;
    } else if (h.includes('date') || h.includes('日期')) {
      map.dateOfAnnouncement = index;
    }
  });
  
  return map;
}

/**
 * Parse a monetary value string to a number
 * Handles formats like: "$30,000,000", "30000000", "unclear", ""
 * @param {string} value 
 * @returns {number | null}
 */
function parseAmount(value) {
  if (!value || value.toLowerCase() === 'unclear' || value.trim() === '') {
    return null;
  }
  
  // Remove currency symbols, commas, spaces
  const cleaned = value.replace(/[$,\s]/g, '');
  const parsed = parseFloat(cleaned);
  
  return isNaN(parsed) ? null : parsed;
}

/**
 * Format a number as HKD currency string
 * @param {number | null} value 
 * @param {string} lang - 'en' or 'zh'
 * @returns {string}
 */
function formatAmount(value, lang = 'en') {
  if (value === null || value === undefined) {
    return lang === 'zh' ? '未知' : 'unclear';
  }
  
  return '$' + value.toLocaleString('en-HK');
}

/**
 * Transform a single row of sheet data into a donation object
 * @param {string[]} row 
 * @param {Object} columnMap 
 * @returns {Object}
 */
function transformRow(row, columnMap) {
  const getValue = (col) => {
    const idx = columnMap[col];
    return (idx >= 0 && row[idx]) ? row[idx] : '';
  };
  
  const totalValue = parseAmount(getValue('totalValue'));
  const cashValue = parseAmount(getValue('cashValue'));
  const goodsValue = parseAmount(getValue('goodsValue'));
  
  return {
    // Entity names (Chinese is primary, English is optional)
    entity: getValue('entity'),
    entityEn: getValue('entityEn') || '', // Empty if column doesn't exist
    
    // Original Chinese values (for reference/filtering)
    group: getValue('group'),
    capital: getValue('capital'),
    industry: getValue('industry'),
    type: getValue('type'),
    
    // Amounts
    amount: formatAmount(totalValue),
    amountRaw: totalValue,
    cashAmount: formatAmount(cashValue),
    cashAmountRaw: cashValue,
    goodsAmount: formatAmount(goodsValue),
    goodsAmountRaw: goodsValue,
    
    // Other fields
    note: getValue('note'),
    through: getValue('through'),
    primarySource: getValue('primarySource'),
    secondarySource: getValue('secondarySource'),
    verificationLink: getValue('verificationLink'),
    date: getValue('dateOfAnnouncement'),
  };
}

/**
 * Process all donation rows
 * @param {string[][]} rows - Data rows (without header)
 * @param {string[]} headers - Header row
 * @returns {Object[]}
 */
function processDonations(rows, headers = null) {
  const columnMap = headers ? buildColumnMap(headers) : DEFAULT_COLUMN_MAP;
  
  return rows
    .filter(row => row[columnMap.entity]) // Filter out empty rows
    .map(row => transformRow(row, columnMap));
}

/**
 * Translate donation data for a specific language
 * @param {Object} donation - Original donation object
 * @param {string} lang - 'en' or 'zh'
 * @returns {Object} - Translated donation object
 */
function translateDonation(donation, lang) {
  return {
    ...donation,
    // Use English entity name if available, otherwise use Chinese
    entityDisplay: lang === 'en' && donation.entityEn 
      ? donation.entityEn 
      : donation.entity,
    // Translated categories
    capitalDisplay: translateCategory('capital', donation.capital, lang),
    industryDisplay: translateCategory('industry', donation.industry, lang),
    industryIcon: getCategoryIcon('industry', donation.industry),
    typeDisplay: translateCategory('type', donation.type, lang),
    // Translated amount
    amountDisplay: formatAmount(donation.amountRaw, lang),
  };
}

/**
 * Translate all donations for a specific language
 * @param {Object[]} donations 
 * @param {string} lang - 'en' or 'zh'
 * @returns {Object[]}
 */
function translateDonations(donations, lang) {
  return donations.map(d => translateDonation(d, lang));
}

/**
 * Calculate summary statistics from donations
 * @param {Object[]} donations 
 * @returns {Object}
 */
function calculateStats(donations) {
  const stats = {
    totalCount: donations.length,
    totalAmount: 0,
    totalCash: 0,
    totalGoods: 0,
    byCapital: {},
    byIndustry: {},
    byType: {},
    withKnownAmount: 0,
  };
  
  donations.forEach(d => {
    // Totals
    if (d.amountRaw !== null) {
      stats.totalAmount += d.amountRaw;
      stats.withKnownAmount++;
    }
    if (d.cashAmountRaw !== null) {
      stats.totalCash += d.cashAmountRaw;
    }
    if (d.goodsAmountRaw !== null) {
      stats.totalGoods += d.goodsAmountRaw;
    }
    
    // By Capital
    const capital = d.capital || 'Unknown';
    if (!stats.byCapital[capital]) {
      stats.byCapital[capital] = { count: 0, amount: 0 };
    }
    stats.byCapital[capital].count++;
    if (d.amountRaw !== null) {
      stats.byCapital[capital].amount += d.amountRaw;
    }
    
    // By Industry
    const industry = d.industry || 'Unknown';
    if (!stats.byIndustry[industry]) {
      stats.byIndustry[industry] = { count: 0, amount: 0 };
    }
    stats.byIndustry[industry].count++;
    if (d.amountRaw !== null) {
      stats.byIndustry[industry].amount += d.amountRaw;
    }
    
    // By Type
    const type = d.type || 'Unknown';
    if (!stats.byType[type]) {
      stats.byType[type] = { count: 0, amount: 0 };
    }
    stats.byType[type].count++;
    if (d.amountRaw !== null) {
      stats.byType[type].amount += d.amountRaw;
    }
  });
  
  return stats;
}

/**
 * Parse SEO page configuration from sheet row
 * Expected columns: Slug | Title (EN) | Title (ZH) | Description (EN) | Description (ZH) | Filter Config
 * @param {string[]} row 
 * @returns {Object | null}
 */
function parseSeoPageConfig(row) {
  if (!row[0]) return null;
  
  let filterConfig = {};
  try {
    if (row[5]) {
      filterConfig = JSON.parse(row[5]);
    }
  } catch (e) {
    console.warn(`Invalid filter config for SEO page ${row[0]}:`, e.message);
  }
  
  return {
    slug: row[0],
    titleEn: row[1] || '',
    titleZh: row[2] || '',
    descriptionEn: row[3] || '',
    descriptionZh: row[4] || '',
    filterConfig,
  };
}

/**
 * Apply filter configuration to donations
 * @param {Object[]} donations 
 * @param {Object} filterConfig 
 * @returns {Object[]}
 */
function applyFilter(donations, filterConfig) {
  let result = [...donations];
  
  // Filter by capital
  if (filterConfig.capital) {
    result = result.filter(d => d.capital === filterConfig.capital);
  }
  
  // Filter by industry
  if (filterConfig.industry) {
    result = result.filter(d => d.industry === filterConfig.industry);
  }
  
  // Filter by type
  if (filterConfig.type) {
    result = result.filter(d => d.type === filterConfig.type);
  }
  
  // Filter by group (legacy)
  if (filterConfig.group) {
    result = result.filter(d => d.group === filterConfig.group);
  }
  
  // Sort
  if (filterConfig.sort) {
    const [field, direction] = filterConfig.sort.split('-');
    const multiplier = direction === 'desc' ? -1 : 1;
    
    result.sort((a, b) => {
      let aVal, bVal;
      
      if (field === 'value' || field === 'amount') {
        aVal = a.amountRaw || 0;
        bVal = b.amountRaw || 0;
      } else if (field === 'entity') {
        aVal = a.entity;
        bVal = b.entity;
      } else if (field === 'date') {
        aVal = a.date;
        bVal = b.date;
      } else {
        aVal = a[field];
        bVal = b[field];
      }
      
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return (aVal - bVal) * multiplier;
      }
      return String(aVal).localeCompare(String(bVal)) * multiplier;
    });
  }
  
  // Limit
  if (filterConfig.limit) {
    result = result.slice(0, filterConfig.limit);
  }
  
  return result;
}

module.exports = {
  DEFAULT_COLUMN_MAP,
  buildColumnMap,
  parseAmount,
  formatAmount,
  transformRow,
  processDonations,
  translateDonation,
  translateDonations,
  calculateStats,
  parseSeoPageConfig,
  applyFilter,
};
