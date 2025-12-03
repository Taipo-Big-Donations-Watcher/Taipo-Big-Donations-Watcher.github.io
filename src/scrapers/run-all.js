/**
 * Run All Scrapers
 * 
 * Main entry point to run all scrapers and aggregate results.
 * Clears the auto-update tab, runs all scrapers, then writes all new entries
 * followed by logs at the bottom.
 */

const { fetchExistingDonations, writeAllToAutoUpdateTab } = require('./sheet-writer');
const { findMatch } = require('./entity-matcher');
const { recordToRow, closeBrowser } = require('./base');

// Import all scrapers
const poleungkuk = require('./poleungkuk');
const stheadline = require('./stheadline');
const redcrossChina = require('./redcross-china');
const whaleagent = require('./whaleagent');
const weibo = require('./weibo');
const am730 = require('./am730');
const ulifestyle = require('./ulifestyle');

const ALL_SCRAPERS = [
  { name: 'Po Leung Kuk', module: poleungkuk },
  { name: 'Sing Tao Headlines', module: stheadline },
  { name: 'China Red Cross', module: redcrossChina },
  { name: 'WhaleAgent', module: whaleagent },
  { name: 'Weibo', module: weibo },
  { name: 'AM730', module: am730 },
  { name: 'ULifestyle', module: ulifestyle },
];

/**
 * Run all scrapers sequentially, aggregate results, and write once
 */
async function runAll() {
  console.log('='.repeat(60));
  console.log('Tai Po Fire Donations Watcher - Auto-Scraper');
  console.log('='.repeat(60));
  console.log(`Time: ${new Date().toISOString()}`);
  console.log(`Scrapers: ${ALL_SCRAPERS.length}`);
  console.log('');
  
  // Fetch existing donations once (for comparison across all scrapers)
  console.log('Fetching existing donations from main sheet...');
  const existingDonations = await fetchExistingDonations();
  console.log(`  Found ${existingDonations.size} existing entries\n`);
  
  // Collect all new donations and logs
  const allNewDonations = [];
  const allLogs = [];
  const results = [];
  
  for (const scraper of ALL_SCRAPERS) {
    console.log(`\n${'─'.repeat(50)}`);
    console.log(`Running: ${scraper.name}`);
    console.log('─'.repeat(50));
    
    try {
      // Scrape data
      const scrapedDonations = await scraper.module.scrape();
      
      // Compare with existing
      const newDonations = [];
      const matchedDonations = [];
      
      for (const donation of scrapedDonations) {
        const matchResult = findMatch(donation.entity, existingDonations);
        
        if (matchResult.matched) {
          matchedDonations.push({
            ...donation,
            matchedWith: matchResult.matchedEntity,
            matchReason: matchResult.reason,
          });
        } else {
          newDonations.push(donation);
        }
      }
      
      console.log(`  Found ${scrapedDonations.length} total, ${newDonations.length} NEW, ${matchedDonations.length} already exist`);
      
      // Log match details
      if (matchedDonations.length > 0 && matchedDonations.length <= 15) {
        console.log('  Matched entries:');
        for (const m of matchedDonations) {
          console.log(`    "${m.entity}" → "${m.matchedWith}" (${m.matchReason})`);
        }
      } else if (matchedDonations.length > 15) {
        console.log(`  Matched entries: (showing first 15 of ${matchedDonations.length})`);
        for (const m of matchedDonations.slice(0, 15)) {
          console.log(`    "${m.entity}" → "${m.matchedWith}" (${m.matchReason})`);
        }
      }
      
      // Add to aggregated lists
      allNewDonations.push(...newDonations);
      allLogs.push({
        sourceName: scraper.name,
        sourceUrl: scraper.module.SOURCE_URL,
        totalScraped: scrapedDonations.length,
        newCount: newDonations.length,
        matchedCount: matchedDonations.length,
        status: 'Success',
      });
      
      results.push({
        name: scraper.name,
        success: true,
        newCount: newDonations.length,
        matchedCount: matchedDonations.length,
      });
      
    } catch (error) {
      console.error(`  Failed: ${error.message}`);
      
      allLogs.push({
        sourceName: scraper.name,
        sourceUrl: scraper.module.SOURCE_URL,
        totalScraped: 0,
        newCount: 0,
        matchedCount: 0,
        status: 'Error',
        error: error.message,
      });
      
      results.push({
        name: scraper.name,
        success: false,
        error: error.message,
      });
    }
  }
  
  // Close the browser if it was used
  console.log('\n' + '─'.repeat(50));
  console.log('Cleaning up...');
  console.log('─'.repeat(50));
  await closeBrowser();
  
  // Write all results to sheet at once
  console.log('\n' + '─'.repeat(50));
  console.log('Writing to 自動更新列表...');
  console.log('─'.repeat(50));
  
  await writeAllToAutoUpdateTab(allNewDonations, allLogs);
  
  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  
  let totalNew = 0;
  let totalMatched = 0;
  let successCount = 0;
  let failCount = 0;
  
  for (const result of results) {
    const status = result.success ? '✓' : '✗';
    const newCount = result.newCount || 0;
    const matchedCount = result.matchedCount || 0;
    
    console.log(`${status} ${result.name}: ${newCount} new, ${matchedCount} matched${result.error ? ` (Error: ${result.error})` : ''}`);
    
    if (result.success) {
      successCount++;
      totalNew += newCount;
      totalMatched += matchedCount;
    } else {
      failCount++;
    }
  }
  
  console.log('─'.repeat(60));
  console.log(`Total: ${totalNew} new entries, ${totalMatched} already exist`);
  console.log(`Scrapers: ${successCount} succeeded, ${failCount} failed`);
  console.log('='.repeat(60));
  
  return {
    success: failCount === 0,
    results,
    summary: {
      totalNew,
      totalMatched,
      successCount,
      failCount,
    },
  };
}

// Allow running directly
if (require.main === module) {
  const clearFirst = process.argv.includes('--clear');
  
  runAll({ clearFirst })
    .then(result => {
      console.log('\nDone!');
      process.exit(result.success ? 0 : 1);
    })
    .catch(err => {
      console.error('Fatal error:', err);
      process.exit(1);
    });
}

module.exports = { runAll, ALL_SCRAPERS };

