import { chromium } from 'playwright';

const HEADLESS = process.env.PLAYWRIGHT_HEADLESS !== 'false';
const DEALS_TTL = 60 * 60 * 1000;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

let _cache = { data: null, ts: 0 };

export async function getMorrisonsDeals() {
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
    await page.goto('https://groceries.morrisons.com/offers', { waitUntil: 'domcontentloaded', timeout: 30000 });

    try {
      await page.click('[data-test="accept-all-cookies-button"], #onetrust-accept-btn-handler, button:has-text("Accept all")', { timeout: 4000 });
      await sleep(800);
    } catch {}

    for (let i = 0; i < 8; i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await sleep(700);
      try {
        const loadMore = await page.$('button:has-text("Show more"), button:has-text("Load more"), [data-test="show-more"]');
        if (loadMore) await loadMore.click();
      } catch {}
    }

    const products = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      const selectors = [
        '[data-test="fop-product"]',
        '.fop-item',
        '[class*="ProductTile"]',
        '[class*="product-card"]',
        '[class*="product-tile"]',
      ];
      const tiles = [...new Set(selectors.flatMap(s => [...document.querySelectorAll(s)]))];

      for (const el of tiles) {
        const nameEl = el.querySelector('[data-test="fop-title"], [class*="product-name"], [class*="ProductName"], h2, h3, [class*="title"]');
        const name = nameEl?.textContent?.trim();
        if (!name || name.length < 3 || seen.has(name)) continue;
        seen.add(name);

        const priceEl = el.querySelector('[data-test="fop-price"], [class*="price__current"], [class*="current-price"], [class*="price-current"]');
        const wasEl = el.querySelector('[data-test="fop-was-price"], [class*="was-price"], del, s, [class*="price-was"]');
        const badge = el.querySelector('[data-test="fop-saving"], [class*="saving"], [class*="offer-badge"], [class*="promo-badge"]');

        results.push({
          name,
          deal_price: priceEl?.textContent?.trim() ?? null,
          original_price: wasEl?.textContent?.trim() ?? null,
          deal_type: badge?.textContent?.trim() ?? 'Morrisons Offer',
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
