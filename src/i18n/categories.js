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

// Industry with Emojis
const INDUSTRY_MAP = {
  // Finance & Business
  '金融': { en: 'Finance', zh: '金融', icon: '💰' },
  '金融科技': { en: 'FinTech', zh: '金融科技', icon: '💳' },
  '投資': { en: 'Investment', zh: '投資', icon: '📈' },
  '博彩': { en: 'Gaming', zh: '博彩', icon: '🎰' },
  
  // Tech
  '科技': { en: 'Technology', zh: '科技', icon: '💻' },
  '電商': { en: 'E-commerce', zh: '電商', icon: '🛍️' },
  '外送平台': { en: 'Delivery Platform', zh: '外送平台', icon: '🛵' },
  '出行平台': { en: 'Ride-hailing', zh: '出行平台', icon: '🚖' },
  
  // Real Estate & Construction
  '房地產': { en: 'Real Estate', zh: '房地產', icon: '🏢' },
  '建築': { en: 'Construction', zh: '建築', icon: '🏗️' },
  '建材': { en: 'Building Materials', zh: '建材', icon: '🧱' },
  '地產代理': { en: 'Real Estate Agency', zh: '地產代理', icon: '🔑' },
  
  // Consumer
  '食品飲料': { en: 'Food & Beverage', zh: '食品飲料', icon: '🍔' },
  '零售': { en: 'Retail', zh: '零售', icon: '🏪' },
  '服裝': { en: 'Apparel', zh: '服裝', icon: '👕' },
  '服裝零售': { en: 'Fashion Retail', zh: '服裝零售', icon: '👗' },
  '珠寶零售': { en: 'Jewelry', zh: '珠寶零售', icon: '💍' },
  '美妝零售': { en: 'Beauty Retail', zh: '美妝零售', icon: '💄' },
  '美妝': { en: 'Beauty', zh: '美妝', icon: '💅' },
  '鐘錶零售': { en: 'Watch Retail', zh: '鐘錶零售', icon: '⌚' },
  '消費品': { en: 'Consumer Goods', zh: '消費品', icon: '🛒' },
  
  // Entertainment & Media
  '娛樂': { en: 'Entertainment', zh: '娛樂', icon: '🎬' },
  '傳媒': { en: 'Media', zh: '傳媒', icon: '📰' },
  '遊戲': { en: 'Gaming', zh: '遊戲', icon: '🎮' },
  
  // Transport & Logistics
  '物流': { en: 'Logistics', zh: '物流', icon: '📦' },
  '交通運輸': { en: 'Transportation', zh: '交通運輸', icon: '🚌' },
  '航空': { en: 'Aviation', zh: '航空', icon: '✈️' },
  '航運': { en: 'Shipping', zh: '航運', icon: '🚢' },
  '旅遊': { en: 'Travel', zh: '旅遊', icon: '🧳' },
  
  // Healthcare
  '醫療': { en: 'Healthcare', zh: '醫療', icon: '⚕️' },
  '醫藥': { en: 'Pharmaceutical', zh: '醫藥', icon: '💊' },
  
  // Industrial
  '電訊': { en: 'Telecommunications', zh: '電訊', icon: '📡' },
  '能源': { en: 'Energy', zh: '能源', icon: '⚡' },
  '礦業': { en: 'Mining', zh: '礦業', icon: '⛏️' },
  '鋁業': { en: 'Aluminum', zh: '鋁業', icon: '🔩' },
  '家電': { en: 'Home Appliances', zh: '家電', icon: '🏠' },
  '電子製造': { en: 'Electronics Manufacturing', zh: '電子製造', icon: '🔌' },
  '精密製造': { en: 'Precision Manufacturing', zh: '精密製造', icon: '⚙️' },
  '製造業': { en: 'Manufacturing', zh: '製造業', icon: '🏭' },
  '傢俬製造': { en: 'Furniture Manufacturing', zh: '傢俬製造', icon: '🪑' },
  '紡織': { en: 'Textile', zh: '紡織', icon: '🧶' },
  '造紙': { en: 'Paper', zh: '造紙', icon: '📄' },
  '機械製造': { en: 'Machinery', zh: '機械製造', icon: '🤖' },
  
  // Automotive
  '汽車': { en: 'Automotive', zh: '汽車', icon: '🚗' },
  '汽車服務': { en: 'Auto Services', zh: '汽車服務', icon: '🔧' },
  '電動車': { en: 'Electric Vehicles', zh: '電動車', icon: '🔋' },
  
  // Agriculture
  '農牧業': { en: 'Agriculture', zh: '農牧業', icon: '🌾' },
  
  // Crypto
  '加密貨幣': { en: 'Cryptocurrency', zh: '加密貨幣', icon: '🪙' },
  
  // Services
  '專業服務': { en: 'Professional Services', zh: '專業服務', icon: '💼' },
  '酒店': { en: 'Hotels', zh: '酒店', icon: '🏨' },
  
  // Organizations
  '慈善': { en: 'Charity', zh: '慈善', icon: '❤️' },
  '政府': { en: 'Government', zh: '政府', icon: '🏛️' },
  '商會': { en: 'Chamber of Commerce', zh: '商會', icon: '🤝' },
  '社團': { en: 'Association', zh: '社團', icon: '👥' },
  '商業網絡': { en: 'Business Network', zh: '商業網絡', icon: '🌐' },
  
  // Conglomerates
  '綜合企業': { en: 'Conglomerate', zh: '綜合企業', icon: '🏢' },
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
 * Get icon for category value
 * @param {string} category - 'industry' only for now
 * @param {string} value - The original Chinese value
 * @returns {string} Icon or empty string
 */
function getCategoryIcon(category, value) {
  if (category === 'industry' && INDUSTRY_MAP[value]) {
    return INDUSTRY_MAP[value].icon || '';
  }
  return '';
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
  getCategoryIcon,
  getCategoryMap,
};
