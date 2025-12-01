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
const DEFAULT_LANG = 'en';
const SITE_URL = 'https://taipo-big-donations-watcher.github.io';

// Google Sheets URL for raw data badge
const SHEETS_URL = 'https://docs.google.com/spreadsheets/d/1dg6LxT5JElZZ5-owLMlD6uIFMsLpTfPU2cYCk5j79TI/edit?usp=sharing';

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
function generateAboutPages(template, buildTime) {
  console.log('Generating about pages...');
  
  for (const lang of LANGUAGES) {
    const i18n = loadI18n(lang);
    const otherLang = lang === 'en' ? 'zh' : 'en';
    
    // About Content (Bilingual)
    const contentEn = `
      <div class="intro">
        <h2>About This Project</h2>
        <p>The <strong>Tai Po Fire Donations Watcher</strong> is a community-driven initiative to track and consolidate pledged donations regarding the Tai Po Wang Fuk Court fire on November 26, 2025.</p>
        
        <h3>Purpose</h3>
        <ul>
          <li><strong>Clarity:</strong> Providing a centralized source of truth for all public donations.</li>
          <li><strong>Encouragement:</strong> Visualizing contributions to encourage more support.</li>
          <li><strong>Watchdog:</strong> Tracking how funds are transferred to those in need.</li>
          <li><strong>Memorial:</strong> Memorializing the lives lost and highlighting the irreplaceable loss.</li>
        </ul>
        
        <h3>Data Source</h3>
        <p>All data is sourced from public announcements and news reports. The database is hosted on Google Sheets and syncs every 6 hours.</p>
        
        <h3>Contact & Corrections</h3>
        <p>If you find any errors or missing information, please <a href="${SHEETS_URL}" target="_blank">comment on the Google Sheet</a> or contact us via the links in the footer.</p>
      </div>
    `;
    
    const contentZh = `
      <div class="intro">
        <h2>關於本項目</h2>
        <p><strong>大埔火災捐款追蹤器</strong>是一個民間發起的項目，旨在追蹤及整合各界就 2025 年 11 月 26 日大埔宏福苑火災的承諾捐款。</p>
        
        <h3>目的</h3>
        <ul>
          <li><strong>資訊透明：</strong> 整合零散報導，建立單一的公開資料庫。</li>
          <li><strong>鼓勵捐助：</strong> 展示各界支援，鼓勵更多人參與。</li>
          <li><strong>公眾監察：</strong> 追蹤善款去向，確保落實到位。</li>
          <li><strong>悼念反思：</strong> 紀錄逝者，強調生命無價。</li>
        </ul>
        
        <h3>數據來源</h3>
        <p>所有數據均源自公開的新聞報導及官方聲明。數據庫存放於 Google Sheets，每 6 小時自動同步。</p>
        
        <h3>聯絡與更正</h3>
        <p>如發現數據有誤，歡迎在 <a href="${SHEETS_URL}" target="_blank">Google Sheets</a> 上留言或透過頁腳連結聯絡我們。</p>
      </div>
    `;
    
    const content = lang === 'zh' ? contentZh : contentEn;
    
    // Reuse template but replace the main content area
    // We need to strip the table and controls from the template or hide them
    // Since our template is rigid, let's just use a simple replacement trick
    
    const pageVars = {
      base_url: SITE_URL,
      sheets_url: SHEETS_URL,
      favicon_path: '../../favicon.png',
      build_time: buildTime,
      switch_language_url: `../../${otherLang}/about/index.html`,
      footer_disclaimer: i18n.footer_disclaimer_pre + ' ' + i18n.footer_corrections,
      page_description: i18n.page_description,
      site_title: (lang === 'zh' ? '關於 - ' : 'About - ') + i18n.site_title,
    };
    
    let html = applyI18n(template, i18n, pageVars);
    
    // Replace the main dynamic content area with static about content
    // We'll look for specific markers in the template or just replace the whole body content structure
    // A better way given the template structure is to hide controls/stats and inject content
    
    // Let's use a regex to inject our content into the .intro div and hide the rest
    html = html.replace(
      /<div class="intro">[\s\S]*?<\/div>/,
      content
    );
    
    // Hide stats, controls, and table using inline CSS injection
    const hideCss = `<style>
      .stats, .controls, .table-container, #no-results { display: none !important; }
      .intro { max-width: 800px; margin: 0 auto 40px; }
      .intro h2 { margin-top: 0; }
      .intro h3 { margin-top: 25px; margin-bottom: 10px; color: var(--accent-color); }
      .intro ul { padding-left: 20px; margin-bottom: 20px; }
      .intro li { margin-bottom: 8px; }
    </style>`;
    html = html.replace('</head>', hideCss + '</head>');
    
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
  <script>
    // Detect browser language and redirect
    const lang = navigator.language || navigator.userLanguage;
    if (lang.startsWith('zh')) {
      window.location.href = '/zh/';
    } else {
      window.location.href = '/en/';
    }
  </script>
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
    generateAboutPages(template, buildTime);
    
    // Generate root redirect
    generateRootRedirect(DEFAULT_LANG);
    
    // Fetch and generate SEO pages
    console.log('\nFetching SEO page configurations...');
    const seoData = await fetchSeoPages();
    let seoConfigs = [];
    
    if (seoData) {
      seoConfigs = seoData.rows
        .map(parseSeoPageConfig)
        .filter(Boolean);
    }
    
    // Manual override for "Over 1M" page
    seoConfigs.push({
        slug: 'donations-over-1m',
        titleEn: 'Donations Over HK$1 Million - Tai Po Fire Relief',
        titleZh: '超過100萬港元之捐款 - 大埔火災救援',
        descriptionEn: 'List of major donations for Tai Po fire relief exceeding HK$1 Million.',
        descriptionZh: '大埔宏福苑火災救援：超過100萬港元之大額承諾捐款名單。',
        filterConfig: { minAmount: 1000000, sort: 'value-desc' }
    });

    if (seoConfigs.length > 0) {
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
