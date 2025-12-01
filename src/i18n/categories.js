/**
 * Category Translation Mappings
 * 
 * Provides bilingual translations for Capital, Industry, and Type categories.
 */

const CAPITAL_MAP = {
  '香港': { en: 'Hong Kong', zh: '香港' },
  '中國': { en: 'China', zh: '中國' },
  '美國': { en: 'USA', zh: '美國' },
  '英國': { en: 'UK', zh: '英國' },
  '韓國': { en: 'South Korea', zh: '韓國' },
  '日本': { en: 'Japan', zh: '日本' },
  '澳門': { en: 'Macau', zh: '澳門' },
  '台灣': { en: 'Taiwan', zh: '台灣' },
  '馬來西亞': { en: 'Malaysia', zh: '馬來西亞' },
  '新加坡': { en: 'Singapore', zh: '新加坡' },
  '加拿大': { en: 'Canada', zh: '加拿大' },
  '瑞士': { en: 'Switzerland', zh: '瑞士' },
  '法國': { en: 'France', zh: '法國' },
  '荷蘭': { en: 'Netherlands', zh: '荷蘭' },
  '國際': { en: 'International', zh: '國際' },
};

const INDUSTRY_MAP = {
  // Finance & Business
  '金融': { en: 'Finance', zh: '金融' },
  '金融科技': { en: 'FinTech', zh: '金融科技' },
  '投資': { en: 'Investment', zh: '投資' },
  '博彩': { en: 'Gaming', zh: '博彩' },
  
  // Tech
  '科技': { en: 'Technology', zh: '科技' },
  '電商': { en: 'E-commerce', zh: '電商' },
  '外送平台': { en: 'Delivery Platform', zh: '外送平台' },
  '出行平台': { en: 'Ride-hailing', zh: '出行平台' },
  
  // Real Estate & Construction
  '房地產': { en: 'Real Estate', zh: '房地產' },
  '建築': { en: 'Construction', zh: '建築' },
  '建材': { en: 'Building Materials', zh: '建材' },
  '地產代理': { en: 'Real Estate Agency', zh: '地產代理' },
  
  // Consumer
  '食品飲料': { en: 'Food & Beverage', zh: '食品飲料' },
  '零售': { en: 'Retail', zh: '零售' },
  '服裝': { en: 'Apparel', zh: '服裝' },
  '服裝零售': { en: 'Fashion Retail', zh: '服裝零售' },
  '珠寶零售': { en: 'Jewelry', zh: '珠寶零售' },
  '美妝零售': { en: 'Beauty Retail', zh: '美妝零售' },
  '美妝': { en: 'Beauty', zh: '美妝' },
  '鐘錶零售': { en: 'Watch Retail', zh: '鐘錶零售' },
  '消費品': { en: 'Consumer Goods', zh: '消費品' },
  
  // Entertainment & Media
  '娛樂': { en: 'Entertainment', zh: '娛樂' },
  '傳媒': { en: 'Media', zh: '傳媒' },
  '遊戲': { en: 'Gaming', zh: '遊戲' },
  
  // Transport & Logistics
  '物流': { en: 'Logistics', zh: '物流' },
  '交通運輸': { en: 'Transportation', zh: '交通運輸' },
  '航空': { en: 'Aviation', zh: '航空' },
  '航運': { en: 'Shipping', zh: '航運' },
  '旅遊': { en: 'Travel', zh: '旅遊' },
  
  // Healthcare
  '醫療': { en: 'Healthcare', zh: '醫療' },
  '醫藥': { en: 'Pharmaceutical', zh: '醫藥' },
  
  // Industrial
  '電訊': { en: 'Telecommunications', zh: '電訊' },
  '能源': { en: 'Energy', zh: '能源' },
  '礦業': { en: 'Mining', zh: '礦業' },
  '鋁業': { en: 'Aluminum', zh: '鋁業' },
  '家電': { en: 'Home Appliances', zh: '家電' },
  '電子製造': { en: 'Electronics Manufacturing', zh: '電子製造' },
  '精密製造': { en: 'Precision Manufacturing', zh: '精密製造' },
  '製造業': { en: 'Manufacturing', zh: '製造業' },
  '傢俬製造': { en: 'Furniture Manufacturing', zh: '傢俬製造' },
  '紡織': { en: 'Textile', zh: '紡織' },
  '造紙': { en: 'Paper', zh: '造紙' },
  '機械製造': { en: 'Machinery', zh: '機械製造' },
  
  // Automotive
  '汽車': { en: 'Automotive', zh: '汽車' },
  '汽車服務': { en: 'Auto Services', zh: '汽車服務' },
  '電動車': { en: 'Electric Vehicles', zh: '電動車' },
  
  // Agriculture
  '農牧業': { en: 'Agriculture', zh: '農牧業' },
  
  // Crypto
  '加密貨幣': { en: 'Cryptocurrency', zh: '加密貨幣' },
  
  // Services
  '專業服務': { en: 'Professional Services', zh: '專業服務' },
  '酒店': { en: 'Hotels', zh: '酒店' },
  
  // Organizations
  '慈善': { en: 'Charity', zh: '慈善' },
  '政府': { en: 'Government', zh: '政府' },
  '商會': { en: 'Chamber of Commerce', zh: '商會' },
  '社團': { en: 'Association', zh: '社團' },
  '商業網絡': { en: 'Business Network', zh: '商業網絡' },
  
  // Conglomerates
  '綜合企業': { en: 'Conglomerate', zh: '綜合企業' },
};

const TYPE_MAP = {
  '企業': { en: 'Enterprise', zh: '企業' },
  '機構': { en: 'Organization', zh: '機構' },
  '個人': { en: 'Individual', zh: '個人' },
  '藝人': { en: 'Celebrity', zh: '藝人' },
  '社團': { en: 'Association', zh: '社團' },
  '政府': { en: 'Government', zh: '政府' },
  '基金': { en: 'Foundation', zh: '基金' },
};

/**
 * Translate a category value to the specified language
 * @param {string} category - 'capital', 'industry', or 'type'
 * @param {string} value - The original Chinese value
 * @param {string} lang - Target language ('en' or 'zh')
 * @returns {string} Translated value or original if not found
 */
function translateCategory(category, value, lang) {
  if (!value) return '';
  
  let map;
  switch (category) {
    case 'capital':
      map = CAPITAL_MAP;
      break;
    case 'industry':
      map = INDUSTRY_MAP;
      break;
    case 'type':
      map = TYPE_MAP;
      break;
    default:
      return value;
  }
  
  const translation = map[value];
  if (translation && translation[lang]) {
    return translation[lang];
  }
  
  // Return original value if no translation found
  return value;
}

/**
 * Get all unique values for a category with translations
 * @param {string} category - 'capital', 'industry', or 'type'
 * @returns {Object} Map of original values to translations
 */
function getCategoryMap(category) {
  switch (category) {
    case 'capital':
      return CAPITAL_MAP;
    case 'industry':
      return INDUSTRY_MAP;
    case 'type':
      return TYPE_MAP;
    default:
      return {};
  }
}

module.exports = {
  CAPITAL_MAP,
  INDUSTRY_MAP,
  TYPE_MAP,
  translateCategory,
  getCategoryMap,
};

