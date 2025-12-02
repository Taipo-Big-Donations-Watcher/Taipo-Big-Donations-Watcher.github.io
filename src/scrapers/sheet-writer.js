/**
 * Sheet Writer
 * 
 * Writes scraped data to the 自動更新列表 tab and logs below the data.
 */

const { google } = require('googleapis');
const { loadEnv, loadServiceAccount } = require('../sheets-api');
const { recordToRow } = require('./base');
const { findMatch, s2t } = require('./entity-matcher');

const AUTO_UPDATE_TAB = '自動更新列表';
const DONATIONS_TAB = '捐款';

/**
 * Create authenticated Google Sheets client with WRITE permissions
 */
async function createWriteClient() {
  const env = loadEnv();
  const serviceAccount = loadServiceAccount(env);
  
  const auth = new google.auth.GoogleAuth({
    credentials: serviceAccount,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return {
    sheets: google.sheets({ version: 'v4', auth }),
    sheetId: env.GOOGLE_SHEET_ID,
  };
}

/**
 * Fetch existing donations from 捐款 tab for comparison
 * @returns {Promise<Map<string, Object>>} Map of normalized entity name to donation data
 */
async function fetchExistingDonations() {
  const { sheets, sheetId } = await createWriteClient();
  
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${DONATIONS_TAB}!A:N`,
  });
  
  const rows = response.data.values || [];
  if (rows.length < 2) return new Map();
  
  const headers = rows[0];
  const entityIdx = 0; // Entity is first column
  
  const donations = new Map();
  
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row[entityIdx]) continue;
    
    const entityName = row[entityIdx].trim().toLowerCase();
    donations.set(entityName, {
      entity: row[0] || '',
      group: row[1] || '',
      totalValue: row[2] || '',
      cashValue: row[3] || '',
      goodsValue: row[4] || '',
      capital: row[5] || '',
      industry: row[6] || '',
      type: row[7] || '',
      note: row[8] || '',
      receiver: row[9] || '',
      primarySource: row[10] || '',
      secondarySource: row[11] || '',
      verificationLink: row[12] || '',
      dateOfAnnouncement: row[13] || '',
    });
  }
  
  return donations;
}

/**
 * Clear the 自動更新列表 tab (except header row)
 */
async function clearAutoUpdateTab() {
  const { sheets, sheetId } = await createWriteClient();
  
  // Get current data to find the range to clear
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${AUTO_UPDATE_TAB}!A:Z`,
  });
  
  const rows = response.data.values || [];
  if (rows.length <= 1) return; // Only header or empty
  
  // Clear everything below header
  await sheets.spreadsheets.values.clear({
    spreadsheetId: sheetId,
    range: `${AUTO_UPDATE_TAB}!A2:Z${rows.length + 100}`, // +100 for safety
  });
  
  console.log(`  Cleared ${AUTO_UPDATE_TAB} tab (kept header)`);
}

/**
 * Compare scraped donations against existing list
 * Returns new and matched donations without writing to sheet
 * @param {Object[]} scrapedDonations - Array of donation records
 * @param {string} sourceName - Name of the scraper source
 * @param {Map} existingDonations - Map of existing donations
 * @returns {Object} { newDonations, matchedDonations }
 */
function compareWithExisting(scrapedDonations, sourceName, existingDonations) {
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
      // Add source name to the donation for tracking
      newDonations.push({
        ...donation,
        _source: sourceName,
      });
    }
  }
  
  console.log(`  Found ${scrapedDonations.length} total, ${newDonations.length} NEW, ${matchedDonations.length} already exist`);
  
  // Log some match details for debugging
  if (matchedDonations.length > 0 && matchedDonations.length <= 10) {
    console.log('  Matched entries:');
    for (const m of matchedDonations) {
      console.log(`    "${m.entity}" → "${m.matchedWith}" (${m.matchReason})`);
    }
  }
  
  return { newDonations, matchedDonations };
}

/**
 * Convert a donation record to Traditional Chinese
 * @param {Object} donation 
 * @returns {Object}
 */
function convertToTraditional(donation) {
  return {
    ...donation,
    entity: s2t(donation.entity || ''),
    group: s2t(donation.group || ''),
    capital: s2t(donation.capital || ''),
    industry: s2t(donation.industry || ''),
    type: s2t(donation.type || ''),
    note: s2t(donation.note || ''),
    receiver: s2t(donation.receiver || ''),
  };
}

/**
 * Write all scraped data to 自動更新列表 at once
 * Clears the tab first, then writes all new entries, then logs at the bottom
 * @param {Object[]} allNewDonations - Array of all new donation records from all scrapers
 * @param {Object[]} allLogs - Array of log entries from all scrapers
 */
async function writeAllToAutoUpdateTab(allNewDonations, allLogs) {
  const { sheets, sheetId } = await createWriteClient();
  
  // Clear the tab first (except header row)
  await clearAutoUpdateTab();
  
  // Convert all donations to Traditional Chinese and prepare data rows
  const traditionalDonations = allNewDonations.map(d => convertToTraditional(d));
  const dataRows = traditionalDonations.map(d => recordToRow(d));
  
  // Prepare log section
  const timestamp = new Date().toISOString();
  const logRows = [
    [], // Empty row separator
    ['═══════════════════════════════════════════════════════════════════'],
    [`SCRAPE RUN: ${timestamp}`],
    ['═══════════════════════════════════════════════════════════════════'],
    [],
  ];
  
  // Add each source's log
  for (const log of allLogs) {
    logRows.push([`--- ${log.sourceName} ---`]);
    logRows.push([`URL: ${log.sourceUrl || 'N/A'}`]);
    logRows.push([`Total scraped: ${log.totalScraped}`]);
    logRows.push([`New entries: ${log.newCount}`]);
    logRows.push([`Already in 捐款: ${log.matchedCount}`]);
    logRows.push([`Status: ${log.status}`]);
    if (log.error) {
      logRows.push([`Error: ${log.error}`]);
    }
    logRows.push([]); // Empty row between sources
  }
  
  // Add summary
  const totalNew = allLogs.reduce((sum, l) => sum + (l.newCount || 0), 0);
  const totalMatched = allLogs.reduce((sum, l) => sum + (l.matchedCount || 0), 0);
  logRows.push(['───────────────────────────────────────────────────────────────────']);
  logRows.push([`TOTAL: ${totalNew} new entries, ${totalMatched} already exist`]);
  logRows.push(['═══════════════════════════════════════════════════════════════════']);
  
  // Combine data and logs
  const allRows = [...dataRows, ...logRows];
  
  if (allRows.length === 0) {
    console.log('  No data to write');
    return;
  }
  
  // Write to sheet
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: `${AUTO_UPDATE_TAB}!A2`,
    valueInputOption: 'RAW',
    resource: {
      values: allRows,
    },
  });
  
  console.log(`\n  Wrote ${dataRows.length} new entries + ${logRows.length} log rows to ${AUTO_UPDATE_TAB}`);
}

/**
 * Legacy function - Write scraped donations to 自動更新列表
 * Now just returns the comparison results for aggregation
 * @param {Object[]} scrapedDonations - Array of donation records
 * @param {string} sourceName - Name of the scraper source
 * @param {Object} logInfo - Log information to append
 */
async function writeToAutoUpdateTab(scrapedDonations, sourceName, logInfo = {}) {
  // Fetch existing donations for comparison
  const existingDonations = await fetchExistingDonations();
  
  const { newDonations, matchedDonations } = compareWithExisting(
    scrapedDonations, 
    sourceName, 
    existingDonations
  );
  
  return { 
    newCount: newDonations.length, 
    matchedCount: matchedDonations.length,
    newDonations,
    matchedDonations,
  };
}

/**
 * Append log entry only (for errors or empty results)
 */
async function appendLogOnly(sourceName, logInfo) {
  const { sheets, sheetId } = await createWriteClient();
  
  const timestamp = new Date().toISOString();
  const logRows = [
    [], // Empty row separator
    [`--- Scrape Log: ${sourceName} ---`],
    [`Timestamp: ${timestamp}`],
    [`Source URL: ${logInfo.sourceUrl || 'N/A'}`],
    [`Status: ${logInfo.status || 'Error'}`],
    logInfo.error ? [`Error: ${logInfo.error}`] : [],
    logInfo.message ? [`Message: ${logInfo.message}`] : [],
  ].filter(row => row.length > 0);
  
  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: `${AUTO_UPDATE_TAB}!A2`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    resource: {
      values: logRows,
    },
  });
  
  console.log(`  Wrote log entry for ${sourceName}`);
}

module.exports = {
  createWriteClient,
  fetchExistingDonations,
  clearAutoUpdateTab,
  writeToAutoUpdateTab,
  writeAllToAutoUpdateTab,
  appendLogOnly,
};

