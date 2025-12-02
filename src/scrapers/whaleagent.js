/**
 * WhaleAgent Scraper
 * 
 * Scrapes crypto donation list from WhaleAgent's Tai Po Fire page.
 * URL: https://whaleagent.io/tai-po-wang-fuk-court-donations
 * 
 * Note: This site has bot protection but the data is SSR'd in the HTML.
 */

const { fetchHtml, parseHtml, createDonationRecord } = require('./base');
const { writeToAutoUpdateTab, appendLogOnly } = require('./sheet-writer');

const SOURCE_URL = 'https://whaleagent.io/tai-po-wang-fuk-court-donations';
const SOURCE_NAME = 'WhaleAgent (Crypto Donations)';

/**
 * Scrape donations from WhaleAgent
 * @returns {Promise<Object[]>}
 */
async function scrape() {
  console.log(`\n=== Scraping: ${SOURCE_NAME} ===`);
  console.log(`  URL: ${SOURCE_URL}`);
  
  try {
    const html = await fetchHtml(SOURCE_URL);
    const $ = parseHtml(html);
    
    const donations = [];
    
    // Find all table rows in the donation table
    $('tr[data-slot="table-row"]').each((i, row) => {
      const cells = $(row).find('td[data-slot="table-cell"]');
      
      if (cells.length < 3) return;
      
      // Extract entity name from second cell
      const nameCell = cells.eq(1);
      const entityName = nameCell.find('.truncate.font-medium').text().trim();
      
      if (!entityName) return;
      
      // Extract amount from third cell (format: $X,XXX,XXX)
      const amountCell = cells.eq(2);
      const amountText = amountCell.find('.font-mono.font-bold').text().trim();
      const amountMatch = amountText.match(/\$([\d,]+)/);
      
      if (!amountMatch) return;
      
      const amount = parseInt(amountMatch[1].replace(/,/g, ''), 10);
      
      // Extract source link if available
      let sourceUrl = '';
      const sourceLink = $(row).find('a[title="View Source"]');
      if (sourceLink.length) {
        sourceUrl = sourceLink.attr('href') || '';
      }
      
      // Extract receiver if available (fourth cell)
      let receiver = '';
      const receiverCell = cells.eq(3);
      const receiverText = receiverCell.find('.truncate').text().trim();
      if (receiverText && receiverText !== '-') {
        receiver = receiverText;
      }
      
      // Extract date (last cell)
      let date = '';
      const dateCell = cells.last();
      const dateText = dateCell.find('.text-zinc-600').text().trim();
      if (dateText) {
        date = dateText;
      }
      
      const donation = createDonationRecord({
        entity: entityName,
        group: '',
        totalValue: amount,
        cashValue: amount,
        goodsValue: null,
        capital: '', // Crypto - could be from anywhere
        industry: '加密貨幣',
        type: '企業',
        note: `via ${SOURCE_NAME}`,
        receiver: receiver,
        primarySource: sourceUrl,
        secondarySource: SOURCE_URL,
        verificationLink: '',
        dateOfAnnouncement: date,
      });
      
      donations.push(donation);
      console.log(`  Found: ${entityName} - $${amount.toLocaleString()}`);
    });
    
    console.log(`  Total parsed: ${donations.length} donations`);
    
    return donations;
    
  } catch (error) {
    console.error(`  Error scraping: ${error.message}`);
    throw error;
  }
}

/**
 * Run scraper and write results to sheet
 */
async function run() {
  try {
    const donations = await scrape();
    
    if (donations.length === 0) {
      await appendLogOnly(SOURCE_NAME, {
        sourceUrl: SOURCE_URL,
        status: 'No donations found',
        message: 'Page structure may have changed or bot protection active',
      });
      return { success: true, count: 0 };
    }
    
    const result = await writeToAutoUpdateTab(donations, SOURCE_NAME, {
      sourceUrl: SOURCE_URL,
      status: 'Success',
    });
    
    return { success: true, ...result };
    
  } catch (error) {
    await appendLogOnly(SOURCE_NAME, {
      sourceUrl: SOURCE_URL,
      status: 'Error',
      error: error.message,
    });
    return { success: false, error: error.message };
  }
}

// Allow running directly
if (require.main === module) {
  run()
    .then(result => {
      console.log('\n=== Result ===');
      console.log(result);
      process.exit(result.success ? 0 : 1);
    })
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { scrape, run, SOURCE_NAME, SOURCE_URL };

