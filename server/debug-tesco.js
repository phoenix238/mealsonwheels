import 'dotenv/config';
import { chromium } from 'playwright';

const PROFILE_PATH = process.env.TESCO_PROFILE_PATH;
const ctx = await chromium.launchPersistentContext(PROFILE_PATH, {
  channel: 'chrome',
  headless: true,
  locale: 'en-GB',
  args: ['--disable-blink-features=AutomationControlled'],
  ignoreDefaultArgs: ['--enable-automation'],
});

const page = await ctx.newPage();
await page.goto('https://www.tesco.com/groceries/en-GB/promotions/all', { timeout: 30000 });
await page.waitForTimeout(3000);

console.log('URL:', page.url());
await page.screenshot({ path: 'debug-tesco-page.png', fullPage: false });

// Count how many product tiles we find with each selector
const selectors = [
  '[data-testid="product-tile"]',
  'article[class*="product"]',
  'article[class*="Product"]',
  '[class*="product-tile"]',
  '[class*="ProductTile"]',
  'li[class*="product"]',
];

for (const sel of selectors) {
  const count = await page.$$(sel).then(els => els.length);
  console.log(`${sel}: ${count} matches`);
}

// Dump first few article/li tags to see what's on the page
const snippet = await page.evaluate(() => {
  const articles = [...document.querySelectorAll('article, [class*="product"], [class*="tile"]')].slice(0, 3);
  return articles.map(el => el.outerHTML.slice(0, 200)).join('\n---\n');
});
console.log('\nPage snippet:\n', snippet || '(nothing found)');

await ctx.close();
