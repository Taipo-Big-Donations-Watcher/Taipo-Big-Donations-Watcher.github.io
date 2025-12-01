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
const BASE_URL = ''; // Set to your domain if needed for absolute URLs

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
    base_url: BASE_URL,
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
  
  return { langDir, i18n, translatedDonations };
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
        base_url: BASE_URL,
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
    });
  }
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
    
    console.log('\n' + '='.repeat(50));
    console.log('Build complete!');
    console.log(`Output: ${DIST_DIR}`);
    console.log('');
    console.log('Generated:');
    console.log('  /index.html        (language redirect)');
    console.log('  /en/index.html     (English version)');
    console.log('  /zh/index.html     (Chinese version)');
    console.log('  /data.json         (JSON API)');
    console.log('='.repeat(50));
    
  } catch (error) {
    console.error('\n❌ Build failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run build
build();
