/**
 * Generate Column Suggestions - Comprehensive Version
 * 
 * Uses knowledge base to accurately identify industries for all entities.
 */

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// Comprehensive entity → industry mapping (based on knowledge base)
const ENTITY_INDUSTRY_MAP = {
  // Agriculture & Livestock (農牧業)
  '溫氏股份': '農牧業',

  // Food & Beverage (餐飲)
  '譚仔三哥米線': '餐飲',
  '譚仔雲南米線': '餐飲',
  '麥當勞香港': '餐飲',
  '膳心小館': '餐飲',
  '加多寶集團': '餐飲',
  '蜜雪冰城': '餐飲',
  '瑞幸咖啡': '餐飲',
  '鍋圈': '餐飲',
  '海天味業': '餐飲',
  '農夫山泉': '餐飲',
  '百威亞太': '餐飲',
  '茶百道': '餐飲',
  '美心集團': '餐飲',
  '百勝中國': '餐飲',
  '小菜園': '餐飲',
  '大家樂集團': '餐飲',
  '南順': '餐飲',
  '同珍集團': '餐飲',

  // Finance & Insurance (金融)
  '安達人壽香港': '金融',
  '馬會': '博彩',
  '李嘉誠基金會': '慈善',
  '公益金': '慈善',
  '馬雲基金': '慈善',
  '滙豐和恒生銀行': '金融',
  '李文達與蔡美靈慈善基金': '慈善',
  '騰訊公益慈善基金會': '慈善',
  '霍英東基金會': '慈善',
  '邵氏基金會': '慈善',
  '保誠保險': '金融',
  '中銀香港': '金融',
  '友邦香港': '金融',
  '華潤慈善基金': '慈善',
  '宏利': '金融',
  '建設銀行': '金融',
  '招商銀行': '金融',
  '國泰海通': '金融',
  '太平洋保險': '金融',
  '港交所': '金融',
  '光大集團': '金融',
  '中國平安': '金融',
  '萬通保險與雲鋒金融': '金融',
  '富途證券': '金融',
  '上海復星公益基金會': '慈善',
  '星展香港': '金融',
  'UBS瑞銀集團': '金融',
  '富衛保險': '金融',
  '農業銀行': '金融',
  '高瓴投資': '金融',
  '華泰證券 + 南方基金': '金融',
  '中國工商銀行': '金融',
  '興業銀行': '金融',
  '香港永明金融 Sun Life': '金融',
  '渣打銀行香港': '金融',
  '東亞銀行': '金融',
  '上海銀行': '金融',
  '大新銀行': '金融',
  '民生銀行': '金融',
  'ZA Bank': '金融',
  '上海商業銀行': '金融',
  '匯添富基金': '金融',
  '陽光保險集團': '金融',
  '紅杉慈善基金': '慈善',
  '置地公司基金會': '慈善',
  '方樹福堂基金及方潤華基金': '慈善',
  '大灣區青年公益': '慈善',
  '香港青年學生動力基金': '慈善',
  '保良局': '慈善',
  '仁濟醫院': '慈善',
  '博愛醫院': '慈善',
  '東華三院': '慈善',
  '中國紅十字總會': '慈善',
  '香港醫學會慈善基金': '慈善',
  '水滴公司': '金融',

  // Real Estate (房地產)
  '領展': '房地產',
  '恒基兆業': '房地產',
  '九龍倉': '房地產',
  '新鴻基地產': '房地產',
  '信和集團及黃廷方慈善基金': '房地產',
  '恒隆集團': '房地產',
  '越秀集團': '房地產',
  '億京發展': '房地產',
  '嘉華集團': '房地產',
  '希慎興業': '房地產',
  '遠東發展': '房地產',
  '大生地產': '房地產',

  // Telecommunications (電訊)
  '香港電訊': '電訊',
  '和記電訊（香港）': '電訊',
  'SmarTone': '電訊',
  '中國移動香港': '電訊',

  // Technology (科技)
  '字節跳動': '科技',
  '螞蟻集團': '金融科技',
  '騰訊': '科技',
  '網易': '科技',
  '滴滴': '科技',
  '百度': '科技',
  '聯想香港': '科技',
  '小米': '科技',
  '香港小米基金會': '科技',
  '拼多多': '電商',
  '商湯科技': '科技',
  '小紅書': '科技',
  'HKTVMall': '電商',
  '優必選': '科技',
  '四方精創': '金融科技',
  'OPPO': '科技',
  '度小滿': '金融科技',
  '連連數字': '金融科技',
  '量化派': '金融科技',
  '雲工場': '科技',

  // Retail (零售)
  '國際家居零售': '零售',
  'UNIQLO 香港': '服裝零售',
  'DFI零售集團': '零售',
  '周大福': '珠寶零售',
  '莎莎': '美妝零售',
  '優品360': '零售',
  '老鋪黃金股份': '珠寶零售',
  '老鳳祥': '珠寶零售',
  '比優集團': '零售',
  '101watches': '鐘錶零售',

  // Apparel & Sportswear (服裝)
  '安踏': '服裝',
  '波司登集團': '服裝',
  '李寧': '服裝',
  '特步': '服裝',
  '361集團': '服裝',
  '中國利郎集團': '服裝',
  '都市麗人': '服裝',
  '飛達帽業': '服裝',
  '富貴鳥': '服裝',

  // Logistics (物流)
  '順豐': '物流',
  'J&T極兔速遞': '物流',
  'Lalamove': '物流',

  // Entertainment & Media (娛樂傳媒)
  '紫荊文化集團': '傳媒',
  'HYBE娛樂': '娛樂',
  'JYP娛樂': '娛樂',
  'SM事務所': '娛樂',
  'YG娛樂': '娛樂',
  '英皇集團': '娛樂',
  '鋒味控股': '娛樂',

  // Transportation (交通運輸)
  '香港航空': '航空',
  '中遠海運': '航運',
  '港鐵': '交通運輸',
  '九巴及龍運': '交通運輸',
  '城巴及漢思集團': '交通運輸',

  // Travel & Tourism (旅遊)
  '香港中旅集團': '旅遊',
  '攜程（Trip.com）': '旅遊',
  '同程旅行': '旅遊',
  '大航假期': '旅遊',
  'EGL東瀛遊': '旅遊',
  '永安旅遊': '旅遊',

  // Healthcare & Pharmaceutical (醫療)
  '康健醫療': '醫療',
  '中生製藥': '醫藥',

  // Automotive (汽車)
  '奇瑞汽車': '汽車',
  '比亞迪': '汽車',
  '吉利控股集團': '汽車',
  '小鵬汽車': '汽車',
  '賽力斯集團': '汽車',
  '和諧汽車': '汽車',
  '途虎養車': '汽車服務',
  '雅迪': '電動車',

  // Energy & Utilities (能源)
  '中電': '能源',
  '國家電網海外投資': '能源',
  '中國燃氣': '能源',

  // Mining & Materials (礦業)
  '紫金礦業': '礦業',
  '中國宏橋': '鋁業',
  '五礦集團': '礦業',
  '金川集團(香港)資源': '礦業',

  // Construction (建築)
  '中海外': '建築',
  '信義集團': '建材',

  // Consumer Goods (消費品)
  '恒安國際': '消費品',
  '藍月亮': '消費品',
  '泡泡瑪特': '消費品',
  'Casetify': '消費品',
  '歐萊雅': '美妝',

  // Manufacturing (製造業)
  '美的集團': '家電',
  '海爾智家': '家電',
  '立訊精密（香港）': '電子製造',
  '敏華控股': '傢俬製造',
  '玖龍紙業': '造紙',
  '南旋集團': '紡織',
  '天虹國際': '紡織',
  '震雄投資': '機械製造',
  '鷹普精密': '精密製造',
  '海偉股份': '製造業',

  // Cryptocurrency (加密貨幣)
  'Bitget': '加密貨幣',
  'Bright Hill': '加密貨幣',
  'AB Foundation': '加密貨幣',
  'Avenir Group': '加密貨幣',
  'Binance': '加密貨幣',
  'Crypto.com': '加密貨幣',
  'Gate': '加密貨幣',
  'HTX': '加密貨幣',
  'OKX': '加密貨幣',
  'Yunfeng Financial Group': '加密貨幣',
  'HashKey': '加密貨幣',
  'BingX': '加密貨幣',
  'MEXC': '加密貨幣',
  'KN Group': '加密貨幣',
  'Matrixport': '加密貨幣',
  'OSL': '加密貨幣',
  'ViaBTC': '加密貨幣',
  'DL Holdings': '加密貨幣',
  'Ju.com': '加密貨幣',
  'KuCoin': '加密貨幣',
  'BiFinance': '加密貨幣',
  'Cobo': '加密貨幣',
  'Nano Labs': '加密貨幣',
  'New Huo Technology': '加密貨幣',
  'RD Technologies': '加密貨幣',
  'MicroBit Capital': '加密貨幣',
  'UXUY HK': '加密貨幣',
  'SlowMist': '加密貨幣',
  'Sheldon': '加密貨幣',

  // E-commerce & Delivery (電商外送)
  '京東集團': '電商',
  '阿里巴巴': '電商',
  '美團': '外送平台',
  'Uber': '出行平台',

  // Hotels (酒店)
  '香格里拉集團': '酒店',

  // Gaming (遊戲)
  '愷英': '遊戲',

  // Professional Services (專業服務)
  '安永EY': '專業服務',
  '畢馬威KPMG': '專業服務',
  '羅兵咸永道基金（香港）': '專業服務',
  '德勤中國': '專業服務',

  // Conglomerates (綜合企業)
  '招商局': '綜合企業',
  '太古集團': '綜合企業',
  '嘉里集團': '綜合企業',
  '遼寧方大集團': '綜合企業',
  '北控集團': '綜合企業',
  '粵海集團': '綜合企業',
  '河北遠洋': '綜合企業',

  // Government (政府)
  '大埔宏福苑援助基金': '政府',
  '澳門政府': '政府',
  '中華全國婦女聯合會': '政府',

  // Social Organizations (社團)
  '中華總商會': '商會',
  '香港福建社團': '社團',
  '香港中華廠商聯合會': '商會',
  '香港北京社團總會': '社團',
  '香港江蘇社團總會': '社團',
  '香港中華出入口商會': '商會',
  '潮州商會慈善基金': '商會',
  '香港總商會': '商會',
  'BNI Foundation': '商業網絡',
  'BNI HK': '商業網絡',

  // Artists/Celebrities (藝人)
  '謝霆鋒': '娛樂',
  '梁朝偉及劉嘉玲': '娛樂',
  '張柏芝': '娛樂',
  '王嘉爾': '娛樂',
  '陳小春及應采兒': '娛樂',
  '古巨基': '娛樂',
  '容祖兒': '娛樂',
  '盧瀚霆 Anson Lo': '娛樂',
  'Angelababy 楊穎': '娛樂',
  'G.E.M. 鄧紫棋': '娛樂',
  '蔡卓妍': '娛樂',
  '姜濤': '娛樂',
  '吳千語': '娛樂',
  '文詠珊': '娛樂',
  '高海寧': '娛樂',
  '周深': '娛樂',
  'Super Junior': '娛樂',
  'I-DLE': '娛樂',
  'G-DRAGON': '娛樂',
  'YOSHIKI': '娛樂',
  'aespa': '娛樂',
  'NCT WISH': '娛樂',
  'EXO-CBX': '娛樂',
  'RIIZE': '娛樂',
  'WayV': '娛樂',
  '館長': '娛樂',
  'MAMA AWARDS': '娛樂',
  '韓紅愛心慈善基金': '慈善',

  // Business People (商人)
  '鍾培生': '投資',
  '楊受成': '娛樂',
  '呂耀東': '投資',
  '楊政龍': '投資',

  // Other specific entities
  '啟航1331': '投資',
  '交個朋友控股': '電商',
  '美聯集團': '地產代理',
};

// Capital (Country) mappings
const CAPITAL_PATTERNS = {
  '中資': '中國',
  '中國': '中國',
  '港資': '香港',
  '香港': '香港',
  '美資': '美國',
  '英資': '英國',
  '日資': '日本',
  '日本': '日本',
  '韓資': '韓國',
  '韓國': '韓國',
  '馬資': '馬來西亞',
  '加資': '加拿大',
  '澳門': '澳門',
  '台灣': '台灣',
  '新加坡': '新加坡',
  '瑞資': '瑞士',
  '法資': '法國',
  '荷資': '荷蘭',
  '幣圈': '國際',
};

// Type mappings
const TYPE_PATTERNS = {
  '企業': '企業',
  '公司': '企業',
  '機構': '機構',
  '基金': '基金',
  '藝人': '藝人',
  '商人': '個人',
  '名人': '個人',
  '網紅': '個人',
  '社團': '社團',
  '政府': '政府',
};

function loadEnv() {
  const envPath = path.join(__dirname, '.env.local');
  const content = fs.readFileSync(envPath, 'utf-8');
  const env = {};
  const lines = content.split('\n');
  let currentKey = null;
  let currentValue = '';
  let inBacktick = false;
  
  for (const line of lines) {
    if (inBacktick) {
      currentValue += '\n' + line;
      if (line.includes('`')) {
        inBacktick = false;
        env[currentKey] = currentValue.replace(/^`|`$/g, '').trim();
        currentKey = null;
        currentValue = '';
      }
    } else {
      const match = line.match(/^(\w+)=(.*)$/);
      if (match) {
        const key = match[1];
        let value = match[2];
        if (value.startsWith('`') && !value.endsWith('`')) {
          inBacktick = true;
          currentKey = key;
          currentValue = value;
        } else if (value.startsWith('`') && value.endsWith('`')) {
          env[key] = value.slice(1, -1);
        } else if (value.startsWith('"') && value.endsWith('"')) {
          env[key] = value.slice(1, -1);
        } else {
          env[key] = value;
        }
      }
    }
  }
  return env;
}

function inferCapital(group) {
  for (const [pattern, capital] of Object.entries(CAPITAL_PATTERNS)) {
    if (group.includes(pattern)) return capital;
  }
  return '';
}

function inferType(group) {
  for (const [pattern, type] of Object.entries(TYPE_PATTERNS)) {
    if (group.includes(pattern)) return type;
  }
  return '';
}

function inferIndustry(entity, group) {
  // First try exact match
  for (const [key, industry] of Object.entries(ENTITY_INDUSTRY_MAP)) {
    if (entity.includes(key) || key.includes(entity.split('（')[0])) {
      return industry;
    }
  }
  
  // Try partial match
  for (const [key, industry] of Object.entries(ENTITY_INDUSTRY_MAP)) {
    const entityClean = entity.replace(/（.*）/g, '').replace(/\(.*\)/g, '').trim();
    const keyClean = key.replace(/（.*）/g, '').replace(/\(.*\)/g, '').trim();
    if (entityClean.includes(keyClean) || keyClean.includes(entityClean)) {
      return industry;
    }
  }
  
  // Check group for crypto
  if (group.includes('幣圈')) return '加密貨幣';
  if (group.includes('藝人')) return '娛樂';
  
  return '';
}

async function generateSuggestions() {
  const env = loadEnv();
  const sheetId = env.GOOGLE_SHEET_ID;
  const serviceAccount = JSON.parse(env.GOOGLE_SERVICE_ACCOUNT);
  
  const auth = new google.auth.GoogleAuth({
    credentials: serviceAccount,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  
  const donationsResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: '捐款!A:B',
  });
  
  const rows = donationsResponse.data.values || [];
  
  console.log('=== Generating Column Suggestions ===\n');
  
  const suggestions = [];
  const stats = { capital: 0, industry: 0, type: 0 };
  const missingIndustry = [];
  
  rows.slice(1).forEach((row, i) => {
    const entity = row[0] || '';
    const group = row[1] || '';
    
    const capital = inferCapital(group);
    const industry = inferIndustry(entity, group);
    const type = inferType(group);
    
    if (capital) stats.capital++;
    if (industry) stats.industry++;
    if (type) stats.type++;
    
    if (!industry) {
      missingIndustry.push({ row: i + 2, entity, group });
    }
    
    suggestions.push({ row: i + 2, entity, group, capital, industry, type });
  });
  
  const total = rows.length - 1;
  console.log('=== Coverage Statistics ===');
  console.log(`Capital (Country): ${stats.capital}/${total} (${Math.round(stats.capital/total*100)}%)`);
  console.log(`Industry: ${stats.industry}/${total} (${Math.round(stats.industry/total*100)}%)`);
  console.log(`Type: ${stats.type}/${total} (${Math.round(stats.type/total*100)}%)`);
  
  // Generate TSV
  const csvLines = suggestions.map(s => `${s.capital}\t${s.industry}\t${s.type}`);
  const csvContent = csvLines.join('\n');
  
  const outputPath = path.join(__dirname, 'column-suggestions.tsv');
  fs.writeFileSync(outputPath, csvContent);
  console.log(`\nSaved to: ${outputPath}`);
  
  // Show missing industries
  if (missingIndustry.length > 0) {
    console.log(`\n=== Missing Industry (${missingIndustry.length} rows) ===`);
    missingIndustry.forEach(m => {
      console.log(`Row ${m.row}: ${m.entity} | ${m.group}`);
    });
  }
  
  // Show sample
  console.log('\n=== Sample (first 30 rows) ===');
  console.log('Row | Entity | Capital | Industry | Type');
  console.log('-'.repeat(80));
  suggestions.slice(0, 30).forEach(s => {
    const entityShort = s.entity.substring(0, 20).padEnd(20);
    console.log(`${s.row.toString().padStart(3)} | ${entityShort} | ${(s.capital || '-').padEnd(6)} | ${(s.industry || '-').padEnd(10)} | ${s.type || '-'}`);
  });
}

generateSuggestions().catch(console.error);
