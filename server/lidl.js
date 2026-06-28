import { chromium } from 'playwright';

const HEADLESS = process.env.PLAYWRIGHT_HEADLESS !== 'false';
const DEALS_TTL = 60 * 60 * 1000;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

let _cache = { data: null, ts: 0 };

export async function getLidlDeals() {
  if (_cache.data && Date.now() - _cache.ts < DEALS_TTL) return _cache.data;

  const browser = await chromium.launch({
    headless: HEADLESS,
    args: ['--disable-blink-features=AutomationControlled', '--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const ctx = await browser.newContext({
      locale: 'en-GB',
      timezoneId: 'Europe/London',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    });
    const page = await ctx.newPage();
    await page.goto('https://www.lidl.co.uk/q/offers', { waitUntil: 'domcontentloaded', timeout: 30000 });

    try {
      await page.click('#onetrust-accept-btn-handler, button:has-text("Accept All Cookies"), button:has-text("Accept all")', { timeout: 4000 });
      await sleep(800);
    } catch {}

    for (let i = 0; i < 6; i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await sleep(700);
    }

    const products = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      const selectors = [
        '[data-product-id]',
        '.product-grid-box',
        'article[class*="product"]',
        '[class*="ProductGridBox"]',
        'li[class*="product"]',
      ];
      const tiles = [...new Set(selectors.flatMap(s => [...document.querySelectorAll(s)]))];

      for (const el of tiles) {
        const name = (
          el.querySelector('[class*="product-name"], [class*="ProductName"], [class*="title"], h2, h3, [class*="headline"]')?.textContent?.trim()
          ?? el.getAttribute('aria-label')
        );
        if (!name || name.length < 3 || seen.has(name)) continue;
        seen.add(name);

        const priceEl = el.querySelector('[class*="price__value"], [class*="PriceValue"], [class*="m-price__value"], [class*="price-value"]');
        const wasEl = el.querySelector('[class*="price--before"], [class*="was"], del, s, [class*="before-price"]');
        const badge = el.querySelector('[class*="badge"], [class*="Badge"], [class*="label"], [class*="offer-tag"], [class*="promo"]');

        results.push({
          name,
          deal_price: priceEl?.textContent?.trim() ?? null,
          original_price: wasEl?.textContent?.trim() ?? null,
          deal_type: badge?.textContent?.trim() ?? 'Lidl Offer',
          clubcard_price: null,
        });
      }
      return results;
    });

    const filtered = products.filter(p => p.name && p.name.length > 2);
    _cache = { data: filtered, ts: Date.now() };
    return filtered;
  } finally {
    await browser.close();
  }
}
