/**
 * Test Entity Matcher
 * 
 * Verify matching logic works correctly before using in production.
 */

const { matchEntities, extractCoreNames, normalizeName, s2t, t2s } = require('./entity-matcher');

// Test cases: [scrapedName, existingName, shouldMatch]
const TEST_CASES = [
  // Basic substring matching
  ['東亞', '東亞銀行', true],
  ['東亞銀行', '東亞', true],
  
  // Simplified ↔ Traditional
  ['刘亦菲女士', '劉亦菲', true],
  ['中国红十字会', '中國紅十字會', true],
  ['杭州灵隐寺', '杭州靈隱寺', true],
  
  // Celebrity name matching
  ['藝人張智霖先生 及 袁詠儀小姐一家', '張智霖及袁詠儀', true],
  ['藝人方力申先生、香港游泳學校、慈善機構一瀧游泳', '方力申/香港游泳學校/一瀧游泳', true],
  ['王祖藍李亞男夫婦', '王祖藍及李亞男', true],
  
  // Should NOT match - false positives
  ['中國燃氣（0384）', '中國宏橋', false],
  ['中國燃氣（0384）', '中國平安', false],
  ['中國宏橋', '中國平安', false],
  ['李嘉誠', '李兆基', false],
  ['張柏芝', '張智霖', false],
  
  // Company variations
  ['HashKey Group', 'HashKey', true],
  ['Amber Group', 'Amber', true],
  ['DFI集團', 'DFI', true],
  
  // Should match
  ['保良局永恆愛心之星郭富城先生', '郭富城', true],
  ['藝人古巨基先生', '古巨基', true],
  ['霍英東基金會', '霍英東基金', true],
  
  // Edge cases that should NOT match
  ['中電', '中銀', false],
  ['新地', '新世界', false],
  ['港鐵', '港交所', false],
  
  // New test cases for specific issues
  ['中國紅十字總會', '中國紅十字會總會', true],  // Missing 會
  ['中国红十字总会', '中國紅十字會總會', true],  // Simplified + missing 會
  ['361度集團', '361集團（1361）', true],        // 度 variation
  ['361集團', '361度集團', true],                // Reverse
];

console.log('='.repeat(70));
console.log('Entity Matcher Test');
console.log('='.repeat(70));
console.log('');

let passed = 0;
let failed = 0;

for (const [scraped, existing, shouldMatch] of TEST_CASES) {
  const result = matchEntities(scraped, existing);
  const status = result.matched === shouldMatch;
  
  if (status) {
    passed++;
    console.log(`✓ PASS: "${scraped}" vs "${existing}"`);
    console.log(`        Expected: ${shouldMatch}, Got: ${result.matched} (${result.reason})`);
  } else {
    failed++;
    console.log(`✗ FAIL: "${scraped}" vs "${existing}"`);
    console.log(`        Expected: ${shouldMatch}, Got: ${result.matched} (${result.reason})`);
  }
  console.log('');
}

console.log('='.repeat(70));
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('='.repeat(70));

// Additional debug info
console.log('\n--- Debug Info ---');
console.log('');

// Test core name extraction
const testNames = [
  '藝人張智霖先生 及 袁詠儀小姐一家',
  '方力申/香港游泳學校/一瀧游泳',
  '梁安琪慈善基金、保良局副主席何猷亨先生及何猷君先生及奚夢瑤小姐一家',
];

console.log('Core Name Extraction:');
for (const name of testNames) {
  const cores = extractCoreNames(name);
  console.log(`  "${name}"`);
  console.log(`  → [${cores.join(', ')}]`);
  console.log('');
}

// Test Chinese conversion
console.log('Chinese Conversion:');
const simplifiedTests = ['刘亦菲', '中国红十字会', '杭州灵隐寺'];
for (const s of simplifiedTests) {
  console.log(`  S→T: "${s}" → "${s2t(s)}"`);
}

process.exit(failed > 0 ? 1 : 0);

