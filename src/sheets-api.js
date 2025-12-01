/**
 * Google Sheets API Module
 * 
 * Provides reusable functions to fetch data from Google Sheets.
 */

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

/**
 * Load environment variables from .env.local file
 */
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(envPath)) {
    throw new Error('.env.local file not found. Please create it with GOOGLE_SHEET_ID and GOOGLE_SERVICE_ACCOUNT.');
  }
  
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

/**
 * Load service account credentials
 * Supports both:
 * - GOOGLE_SERVICE_ACCOUNT_FILE: path to JSON file (for CI/CD)
 * - GOOGLE_SERVICE_ACCOUNT: inline JSON wrapped in backticks (for local dev)
 */
function loadServiceAccount(env) {
  // Check for file-based credentials first (CI/CD)
  if (env.GOOGLE_SERVICE_ACCOUNT_FILE) {
    const filePath = path.join(__dirname, '..', env.GOOGLE_SERVICE_ACCOUNT_FILE);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    }
  }
  
  // Fall back to inline JSON (local development)
  if (env.GOOGLE_SERVICE_ACCOUNT) {
    return JSON.parse(env.GOOGLE_SERVICE_ACCOUNT);
  }
  
  throw new Error('No service account credentials found. Set GOOGLE_SERVICE_ACCOUNT or GOOGLE_SERVICE_ACCOUNT_FILE');
}

/**
 * Create authenticated Google Sheets client
 */
async function createSheetsClient() {
  const env = loadEnv();
  const serviceAccount = loadServiceAccount(env);
  
  const auth = new google.auth.GoogleAuth({
    credentials: serviceAccount,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  return {
    sheets: google.sheets({ version: 'v4', auth }),
    sheetId: env.GOOGLE_SHEET_ID,
  };
}

/**
 * Fetch donation data from the 捐款 sheet
 * @returns {Promise<{headers: string[], rows: string[][]}>}
 */
async function fetchDonations() {
  const { sheets, sheetId } = await createSheetsClient();
  
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: '捐款!A:Z',
  });
  
  const allRows = response.data.values || [];
  
  if (allRows.length === 0) {
    throw new Error('No data found in 捐款 sheet');
  }
  
  return {
    headers: allRows[0],
    rows: allRows.slice(1),
  };
}

/**
 * Fetch SEO pages configuration from the SEO頁面 sheet (if exists)
 * @returns {Promise<{headers: string[], rows: string[][]} | null>}
 */
async function fetchSeoPages() {
  try {
    const { sheets, sheetId } = await createSheetsClient();
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'SEO頁面!A:Z',
    });
    
    const allRows = response.data.values || [];
    
    if (allRows.length === 0) {
      return null;
    }
    
    return {
      headers: allRows[0],
      rows: allRows.slice(1),
    };
  } catch (error) {
    // Sheet might not exist yet
    console.log('SEO頁面 sheet not found, skipping SEO pages generation');
    return null;
  }
}

module.exports = {
  loadEnv,
  loadServiceAccount,
  createSheetsClient,
  fetchDonations,
  fetchSeoPages,
};

