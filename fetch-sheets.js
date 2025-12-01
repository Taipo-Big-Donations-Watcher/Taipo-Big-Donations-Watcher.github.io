/**
 * Google Sheets Data Fetcher
 * 
 * Fetches donation data from the Tai Po Fire Donations Google Sheet.
 * Credentials are loaded from .env.local file.
 * 
 * Usage: node fetch-sheets.js
 */

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

/**
 * Load environment variables from .env.local file
 * Supports both quoted strings and backtick-wrapped JSON values
 */
function loadEnv() {
  const envPath = path.join(__dirname, '.env.local');
  if (!fs.existsSync(envPath)) {
    throw new Error('.env.local file not found. Please create it with GOOGLE_SHEET_ID and GOOGLE_SERVICE_ACCOUNT.');
  }
  
  const content = fs.readFileSync(envPath, 'utf-8');
  const env = {};
  
  // Match key=value pairs, handling multi-line values wrapped in backticks
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
          // Multi-line backtick value
          inBacktick = true;
          currentKey = key;
          currentValue = value;
        } else if (value.startsWith('`') && value.endsWith('`')) {
          // Single-line backtick value
          env[key] = value.slice(1, -1);
        } else if (value.startsWith('"') && value.endsWith('"')) {
          // Quoted string
          env[key] = value.slice(1, -1);
        } else {
          env[key] = value;
        }
      }
    }
  }
  
  return env;
}

/**
 * Fetch and display Google Sheets data
 */
async function fetchSheets() {
  const env = loadEnv();
  
  const sheetId = env.GOOGLE_SHEET_ID;
  const serviceAccount = JSON.parse(env.GOOGLE_SERVICE_ACCOUNT);
  
  if (!sheetId || !serviceAccount) {
    throw new Error('Missing GOOGLE_SHEET_ID or GOOGLE_SERVICE_ACCOUNT in .env.local');
  }
  
  const auth = new google.auth.GoogleAuth({
    credentials: serviceAccount,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  
  // Get all sheet names
  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId: sheetId,
  });
  
  console.log('=== Sheet Names ===');
  spreadsheet.data.sheets.forEach(sheet => {
    console.log('-', sheet.properties.title);
  });
  
  // Fetch the 捐款 tab
  console.log('\n=== 捐款 Tab Data ===');
  const donationsResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: '捐款!A:Z',
  });
  
  const rows = donationsResponse.data.values || [];
  console.log('Total rows:', rows.length);
  console.log('\nHeaders:', rows[0]);
  
  // Get unique groups
  const groups = {};
  rows.slice(1).forEach(row => {
    const group = row[1] || 'Unknown';
    groups[group] = (groups[group] || 0) + 1;
  });
  console.log('\n=== Unique Groups ===');
  Object.entries(groups).sort((a, b) => b[1] - a[1]).forEach(([group, count]) => {
    console.log(`${group}: ${count}`);
  });
  
  // Check new column population
  const headers = rows[0];
  console.log('\n=== Column Population Check ===');
  
  const capitalIdx = headers.indexOf('Capital (Country)');
  const industryIdx = headers.indexOf('Industry');
  const typeIdx = headers.indexOf('Type');
  
  let capitalFilled = 0, industryFilled = 0, typeFilled = 0;
  
  rows.slice(1).forEach(row => {
    if (row[capitalIdx] && row[capitalIdx].trim()) capitalFilled++;
    if (row[industryIdx] && row[industryIdx].trim()) industryFilled++;
    if (row[typeIdx] && row[typeIdx].trim()) typeFilled++;
  });
  
  const total = rows.length - 1;
  console.log(`Capital (Country): ${capitalFilled}/${total} filled (${Math.round(capitalFilled/total*100)}%)`);
  console.log(`Industry: ${industryFilled}/${total} filled (${Math.round(industryFilled/total*100)}%)`);
  console.log(`Type: ${typeFilled}/${total} filled (${Math.round(typeFilled/total*100)}%)`);
  
  // Show first 10 rows with new columns
  console.log('\n=== First 10 Rows (Entity | Group | Capital | Industry | Type) ===');
  rows.slice(1, 11).forEach((row, i) => {
    console.log(`${i + 1}: ${row[0]} | ${row[1]} | ${row[capitalIdx] || '-'} | ${row[industryIdx] || '-'} | ${row[typeIdx] || '-'}`);
  });
}

fetchSheets().catch(console.error);
