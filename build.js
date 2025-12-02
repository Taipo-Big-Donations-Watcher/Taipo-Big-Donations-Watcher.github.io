#!/usr/bin/env node
/**
 * Build Script
 * 
 * Fetches data from Google Sheets and generates static HTML pages.
 * Generates bilingual versions (English and Chinese).
 * 
 * Usage: node build.js
 * 
 * Output: dist/ folder with generated HTML files
 */

const fs = require('fs');
const path = require('path');
const { fetchDonations, fetchSeoPages } = require('./src/sheets-api');
const { 
  processDonations, 
  calculateStats, 
  parseSeoPageConfig, 
  applyFilter,
  translateDonations 
} = require('./src/data-processor');

const DIST_DIR = path.join(__dirname, 'dist');
const TEMPLATE_PATH = path.join(__dirname, 'template.html');
const I18N_DIR = path.join(__dirname, 'src', 'i18n');

const LANGUAGES = ['en', 'zh'];
const DEFAULT_LANG = 'zh';
const SITE_URL = 'https://taipo-big-donations-watcher.github.io';

// Google Sheets URL for raw data badge
const SHEETS_URL = 'https://docs.google.com/spreadsheets/d/1Bi2WDSCOLrxYh2E46ZDfpGMSfWyYWC0slThLGF3Dg-k/edit';

// Track all generated pages for sitemap
const generatedPages = [];

/**
 * Load i18n translation file
 */
function loadI18n(lang) {
  const filePath = path.join(I18N_DIR, `${lang}.json`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Translation file not found: ${filePath}`);
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

/**
 * Ensure directory exists
 */
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Read the HTML template
 */
function readTemplate() {
  if (!fs.existsSync(TEMPLATE_PATH)) {
    throw new Error('template.html not found. Please create it first.');
  }
  return fs.readFileSync(TEMPLATE_PATH, 'utf-8');
}

/**
 * Replace template placeholders with i18n strings
 * @param {string} template 
 * @param {Object} i18n 
 * @param {Object} extras - Additional replacements
 * @returns {string}
 */
function applyI18n(template, i18n, extras = {}) {
  let html = template;
  
  // Replace i18n placeholders
  const allReplacements = { ...i18n, ...extras };
  
  for (const [key, value] of Object.entries(allReplacements)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    html = html.replace(regex, value || '');
  }
  
  return html;
}

/**
 * Inject JSON data into the template
 * @param {string} html 
 * @param {Object[]} donations 
 * @returns {string}
 */
function injectData(html, donations) {
  return html.replace(
    /<script type="application\/json" id="donation-data">[\s\S]*?<\/script>/,
    `<script type="application/json" id="donation-data">\n${JSON.stringify(donations, null, 2)}\n    </script>`
  );
}

/**
 * Generate pages for a specific language
 */
function generateLangPages(template, donations, stats, lang, buildTime) {
  const i18n = loadI18n(lang);
  const langDir = path.join(DIST_DIR, lang);
  ensureDir(langDir);
  
  // Translate donations for this language
  const translatedDonations = translateDonations(donations, lang);
  
  // Sort by amount (highest first)
  const sortedDonations = [...translatedDonations].sort((a, b) => {
    const aVal = a.amountRaw || 0;
    const bVal = b.amountRaw || 0;
    return bVal - aVal;
  });
  
  // Prepare page variables
  // Use relative paths for language switcher (works with file:// and http://)
  // Include index.html for file:// compatibility
  const otherLang = lang === 'en' ? 'zh' : 'en';
  const pageVars = {
    base_url: SITE_URL,
    sheets_url: SHEETS_URL,
    favicon_path: '../favicon.png',
    build_time: buildTime,
    switch_language_url: `../${otherLang}/index.html`,
    footer_disclaimer: lang === 'zh' 
      ? '資料來源於公開宣佈。如有錯誤，歡迎指正。'
      : 'Data sourced from public announcements. Corrections welcome.',
    page_description: i18n.page_description
      .replace('{count}', stats.totalCount.toLocaleString())
      .replace('{amount}', '$' + stats.totalAmount.toLocaleString()),
  };
  
  // Apply i18n and inject data
  let html = applyI18n(template, i18n, pageVars);
  html = injectData(html, sortedDonations);
  
  // Write index.html for this language
  fs.writeFileSync(path.join(langDir, 'index.html'), html);
  console.log(`  ✓ /${lang}/index.html (${donations.length} donations)`);
  
  // Track for sitemap
  generatedPages.push({
    path: `/${lang}/`,
    priority: '1.0',
    changefreq: 'daily',
  });
  
  return { langDir, i18n, translatedDonations };
}

/**
 * Generate About pages for each language
 */
function generateAboutPages(template, donations, stats, buildTime) {
  console.log('Generating about pages...');
  
  for (const lang of LANGUAGES) {
    const i18n = loadI18n(lang);
    const otherLang = lang === 'en' ? 'zh' : 'en';
    
    // Calculate default summary (no filters)
    const count = donations.length;
    const totalAmount = stats.totalAmount;
    const amountStr = '$' + totalAmount.toLocaleString('en-HK');
    const today = new Date().toLocaleDateString(
      lang === 'zh' ? 'zh-HK' : 'en-US',
      { year: 'numeric', month: 'long', day: 'numeric' }
    );
    
    let staticSummary;
    if (lang === 'zh') {
      staticSummary = `截至 ${today}，<strong>${count}</strong>位捐款者 已承諾捐出 <strong>${amountStr}</strong> 支援火災救援。`;
    } else {
      staticSummary = `As of ${today}, <strong>${count}</strong> entities have pledged to donate <strong>${amountStr}</strong> for the fire relief efforts.`;
    }
    
    // About Content (Bilingual)
    const contentEn = `
      <div class="about-content">
        <h2>About This Project</h2>
        <p>The <strong>Tai Po Fire Donations Watcher</strong> is a community-driven initiative to track and consolidate pledged donations regarding the Tai Po Wang Fuk Court fire on November 26, 2025.</p>
        
        <p>I started this project because I noticed various news outlets reporting on major donors, but the information often conflicted—some entities appeared on one list but not another, and there was no central, reliable source to consolidate everything. This tracker aims to fill that gap.</p>
        
        <h3>Purpose</h3>
        <ul>
          <li><strong>Clarity:</strong> Providing a centralized source of truth for all public donations.</li>
          <li><strong>Encouragement:</strong> Visualizing contributions to encourage more support.</li>
          <li><strong>Watchdog:</strong> Tracking how funds are transferred to those in need.</li>
          <li><strong>Memorial:</strong> Memorializing the lives lost and highlighting the irreplaceable loss.</li>
        </ul>
        
        <h3>Data Source & Disclaimer</h3>
        <p>All data is sourced from public announcements and news reports. The database is hosted on Google Sheets and syncs every 6 hours. The source data is collected semi-manually, so there's bound to be something missing or incorrect.</p>
        <p><strong>Note on potential duplicates:</strong> Some donations may overlap due to the nature of how organizations collect and pass around funds. For example, China Red Cross collects money from various entities (which are listed here individually), and there's also an entry for China Red Cross transferring the collected money to Hong Kong Red Cross. I don't have a perfect solution to avoid these types of duplication yet—if you have suggestions, please let me know!</p>
        
        <h3>Contact & Corrections</h3>
        <p>If you notice something missing, incorrect, or duplicated—or if you want to provide a source or additional information—please reach out:</p>
        <ul>
          <li><strong>Telegram:</strong> <a href="https://t.me/ayip002" target="_blank">@ayip002</a></li>
          <li><strong>Google Sheets:</strong> <a href="${SHEETS_URL}" target="_blank">Leave a comment directly on the data</a></li>
        </ul>
        
        <h3>About Me</h3>
        <p>I'm Angus, a small business owner and co-founder of <a href="https://www.mediastudio.hk" target="_blank">Media Studio Hong Kong</a>, a content creation and commercial production company based in Hong Kong.</p>
      </div>
    `;
    
    const contentZh = `
      <div class="about-content">
        <h2>關於本項目</h2>
        <p><strong>大埔火災捐款追蹤器</strong>是一個民間發起的項目，旨在追蹤及整合各界就 2025 年 11 月 26 日大埔宏福苑火災的承諾捐款。</p>
        
        <p>我開始這個項目，是因為我留意到各大新聞媒體報導的捐款名單經常互相矛盾——有些機構出現在某份名單上，卻不在另一份名單中，而且沒有一個集中可靠的來源整合所有資訊。這個追蹤器希望填補這個空白。</p>
        
        <h3>目的</h3>
        <ul>
          <li><strong>資訊透明：</strong> 整合零散報導，建立單一的公開資料庫。</li>
          <li><strong>鼓勵捐助：</strong> 展示各界支援，鼓勵更多人參與。</li>
          <li><strong>公眾監察：</strong> 追蹤善款去向，確保落實到位。</li>
          <li><strong>悼念反思：</strong> 紀錄逝者，強調生命無價。</li>
        </ul>
        
        <h3>數據來源及免責聲明</h3>
        <p>所有數據均源自公開的新聞報導及官方聲明。數據庫存放於 Google Sheets，每 6 小時自動同步。由於數據是半人手收集，難免會有遺漏或錯誤。</p>
        <p><strong>關於可能的重複項目：</strong> 由於各機構收集及轉交善款的方式，部分捐款可能會重複計算。例如，中國紅十字會從不同機構收集善款（這些機構會分別列出），而中國紅十字會將善款轉交香港紅十字會時又會有另一個條目。我暫時未有完美的方法避免這類重複——如果你有建議，歡迎聯絡我！</p>
        
        <h3>聯絡與更正</h3>
        <p>如果你發現有遺漏、錯誤或重複的資料，或者想提供來源或補充資訊，請透過以下方式聯絡我：</p>
        <ul>
          <li><strong>Telegram：</strong> <a href="https://t.me/ayip002" target="_blank">@ayip002</a></li>
          <li><strong>Google Sheets：</strong> <a href="${SHEETS_URL}" target="_blank">直接在數據表上留言</a></li>
        </ul>
        
        <h3>關於我</h3>
        <p>我是 Angus，一位小型企業老闆，<a href="https://www.mediastudio.hk" target="_blank">Media Studio Hong Kong</a> 的聯合創辦人，這是一家位於香港的內容創作及廣告製作公司。</p>
      </div>
    `;
    
    const aboutContent = lang === 'zh' ? contentZh : contentEn;
    
    const pageVars = {
      base_url: SITE_URL,
      sheets_url: SHEETS_URL,
      favicon_path: '../../favicon.png',
      build_time: buildTime,
      switch_language_url: `../../${otherLang}/about/index.html`,
      footer_disclaimer: i18n.footer_disclaimer_pre + ' ' + i18n.footer_corrections,
      page_description: lang === 'zh' ? '關於大埔火災捐款追蹤器項目' : 'About the Tai Po Fire Donations Watcher project',
      site_title: (lang === 'zh' ? '關於 - ' : 'About - ') + i18n.site_title,
    };
    
    let html = applyI18n(template, i18n, pageVars);
    
    // Inject static summary into the h2#dynamic-summary
    html = html.replace(
      /<h2 class="summary-text" id="dynamic-summary"><\/h2>/,
      `<h2 class="summary-text" id="dynamic-summary">${staticSummary}</h2>`
    );
    
    // Replace controls and table-container with about content
    html = html.replace(
      /<div class="controls">[\s\S]*?<\/div>\s*<div class="table-container">[\s\S]*?<\/table>\s*<\/div>/,
      aboutContent
    );
    
    // Hide no-results div
    html = html.replace(
      /<div id="no-results"[^>]*>[\s\S]*?<\/div>/,
      ''
    );
    
    // Add about page styles
    const aboutCss = `<style>
      .about-content {
        max-width: 800px;
        margin: 0 auto 40px;
        line-height: 1.8;
      }
      .about-content h2 {
        margin-top: 0;
        margin-bottom: 20px;
        color: var(--heading-color);
      }
      .about-content h3 {
        margin-top: 30px;
        margin-bottom: 15px;
        color: var(--accent-color);
      }
      .about-content p {
        margin-bottom: 15px;
      }
      .about-content ul {
        padding-left: 25px;
        margin-bottom: 20px;
      }
      .about-content li {
        margin-bottom: 10px;
      }
      .about-content a {
        color: var(--accent-color);
      }
    </style>`;
    html = html.replace('</head>', aboutCss + '</head>');
    
    // Output
    const outputDir = path.join(DIST_DIR, lang, 'about');
    ensureDir(outputDir);
    fs.writeFileSync(path.join(outputDir, 'index.html'), html);
    console.log(`  ✓ /${lang}/about/index.html`);
    
    // Track for sitemap
    generatedPages.push({
      path: `/${lang}/about/`,
      priority: '0.5',
      changefreq: 'monthly',
    });
  }
}

/**
 * Generate root redirect page
 */
function generateRootRedirect(defaultLang) {
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta http-equiv="refresh" content="0; url=/${defaultLang}/">
  <title>Redirecting...</title>
  <link rel="canonical" href="${SITE_URL}/${defaultLang}/">
</head>
<body>
  <p>Redirecting to <a href="/${defaultLang}/">/${defaultLang}/</a>...</p>
</body>
</html>`;
  
  fs.writeFileSync(path.join(DIST_DIR, 'index.html'), html);
  console.log('  ✓ /index.html (language redirect)');
}

/**
 * Generate SEO-specific pages for both languages
 */
function generateSeoPages(template, donations, seoConfigs, buildTime) {
  if (!seoConfigs || seoConfigs.length === 0) {
    console.log('No SEO pages to generate.');
    return;
  }
  
  console.log(`Generating ${seoConfigs.length} SEO pages...`);
  
  for (const lang of LANGUAGES) {
    const i18n = loadI18n(lang);
    
    seoConfigs.forEach(config => {
      if (!config || !config.slug) return;
      
      // Filter donations
      const filteredDonations = applyFilter(donations, config.filterConfig);
      const translatedDonations = translateDonations(filteredDonations, lang);
      
      // Page variables
      const title = lang === 'en' ? config.titleEn : config.titleZh;
      const description = lang === 'en' ? config.descriptionEn : config.descriptionZh;
      const otherLang = lang === 'en' ? 'zh' : 'en';
      
      const pageVars = {
        base_url: SITE_URL,
        sheets_url: SHEETS_URL,
        favicon_path: '../../favicon.png',
        build_time: buildTime,
        site_title: title || i18n.site_title,
        page_description: description || i18n.page_description,
        switch_language_url: `../../${otherLang}/${config.slug}/index.html`,
        footer_disclaimer: lang === 'zh' 
          ? '資料來源於公開宣佈。如有錯誤，歡迎指正。'
          : 'Data sourced from public announcements. Corrections welcome.',
      };
      
      let html = applyI18n(template, i18n, pageVars);
      html = injectData(html, translatedDonations);
      
      // Write to /{lang}/{slug}/index.html
      const outputDir = path.join(DIST_DIR, lang, config.slug);
      ensureDir(outputDir);
      fs.writeFileSync(path.join(outputDir, 'index.html'), html);
      console.log(`  ✓ /${lang}/${config.slug}/ (${filteredDonations.length} donations)`);
      
      // Track for sitemap
      generatedPages.push({
        path: `/${lang}/${config.slug}/`,
        priority: '0.8',
        changefreq: 'daily',
      });
    });
  }
}

/**
 * Generate sitemap.xml for SEO
 */
function generateSitemap(buildTime) {
  console.log('Generating sitemap.xml...');
  
  const lastmod = buildTime.split('T')[0]; // YYYY-MM-DD format
  
  const urls = generatedPages.map(page => `  <url>
    <loc>${SITE_URL}${page.path}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`).join('\n');
  
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
  
  fs.writeFileSync(path.join(DIST_DIR, 'sitemap.xml'), sitemap);
  console.log(`  ✓ sitemap.xml (${generatedPages.length} URLs)`);
}

/**
 * Generate robots.txt
 */
function generateRobotsTxt() {
  console.log('Generating robots.txt...');
  
  const robotsTxt = `User-agent: *
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`;
  
  fs.writeFileSync(path.join(DIST_DIR, 'robots.txt'), robotsTxt);
  console.log('  ✓ robots.txt');
}

/**
 * Generate a JSON data file for potential API use
 */
function generateDataJson(donations, stats, buildTime) {
  console.log('Generating data.json...');
  
  const data = {
    buildTime,
    stats: {
      totalCount: stats.totalCount,
      totalAmount: stats.totalAmount,
      totalCash: stats.totalCash,
      totalGoods: stats.totalGoods,
      withKnownAmount: stats.withKnownAmount,
    },
    byCapital: stats.byCapital,
    byIndustry: stats.byIndustry,
    byType: stats.byType,
    donations,
  };
  
  fs.writeFileSync(
    path.join(DIST_DIR, 'data.json'),
    JSON.stringify(data, null, 2)
  );
  console.log('  ✓ data.json');
}

/**
 * Main build function
 */
async function build() {
  const buildTime = new Date().toISOString();
  console.log('='.repeat(50));
  console.log('Tai Po Fire Donations Watcher - Build');
  console.log('='.repeat(50));
  console.log(`Build time: ${buildTime}\n`);
  
  try {
    // Ensure output directory exists
    ensureDir(DIST_DIR);
    
    // Read template
    const template = readTemplate();
    console.log('✓ Template loaded\n');
    
    // Fetch data from Google Sheets
    console.log('Fetching data from Google Sheets...');
    const { headers, rows } = await fetchDonations();
    console.log(`  ✓ Fetched ${rows.length} donation records\n`);
    
    // Process data (pass headers for dynamic column detection)
    console.log('Processing data...');
    const donations = processDonations(rows, headers);
    const stats = calculateStats(donations);
    console.log(`  ✓ Processed ${donations.length} valid donations`);
    console.log(`  ✓ Total pledged: HKD ${stats.totalAmount.toLocaleString()}`);
    console.log(`  ✓ Known amounts: ${stats.withKnownAmount}/${stats.totalCount}\n`);
    
    // Generate pages for each language
    console.log('Generating bilingual pages...');
    for (const lang of LANGUAGES) {
      generateLangPages(template, donations, stats, lang, buildTime);
    }
    
    // Generate About pages
    generateAboutPages(template, donations, stats, buildTime);
    
    // Generate root redirect
    generateRootRedirect(DEFAULT_LANG);
    
    // Fetch and generate SEO pages
    console.log('\nFetching SEO page configurations...');
    const seoData = await fetchSeoPages();
    if (seoData) {
      const seoConfigs = seoData.rows
        .map(parseSeoPageConfig)
        .filter(Boolean);
      generateSeoPages(template, donations, seoConfigs, buildTime);
    }
    
    // Generate data.json
    console.log('');
    generateDataJson(donations, stats, buildTime);
    
    // Generate sitemap and robots.txt
    console.log('');
    generateSitemap(buildTime);
    generateRobotsTxt();
    
    // Copy favicon
    const faviconSrc = path.join(__dirname, 'favicon.png');
    const faviconDest = path.join(DIST_DIR, 'favicon.png');
    if (fs.existsSync(faviconSrc)) {
      fs.copyFileSync(faviconSrc, faviconDest);
      console.log('  ✓ favicon.png');
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('Build complete!');
    console.log(`Output: ${DIST_DIR}`);
    console.log('');
    console.log('Generated:');
    console.log('  /index.html        (language redirect)');
    console.log('  /en/index.html     (English version)');
    console.log('  /zh/index.html     (Chinese version)');
    console.log('  /data.json         (JSON API)');
    console.log('  /sitemap.xml       (SEO sitemap)');
    console.log('  /robots.txt        (crawler rules)');
    console.log('  /favicon.png       (site icon)');
    console.log('='.repeat(50));
    
  } catch (error) {
    console.error('\n❌ Build failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run build
build();
