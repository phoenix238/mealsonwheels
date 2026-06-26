import { chromium } from 'playwright';
import path from 'path';

const BASE_URL = process.env.TESCO_BASE_URL ?? 'https://www.tesco.com';
const PROFILE_PATH = process.env.TESCO_PROFILE_PATH;
const HEADLESS = process.env.PLAYWRIGHT_HEADLESS !== 'false';
const DELAY_MS = parseInt(process.env.TESCO_REQUEST_DELAY_MS ?? '1500', 10);
const TIMEOUT_MS = parseInt(process.env.TESCO_PAGE_TIMEOUT_MS ?? '30000', 10);
const DEBUG = process.env.DEBUG_TESCO === 'true';
const DEALS_TTL = 60 * 60 * 1000;

if (!PROFILE_PATH) throw new Error('TESCO_PROFILE_PATH env var is required');

class TescoAuthError extends Error {
  constructor() { super('Tesco session expired — please log in manually and restart the server.'); this.code = 'TESCO_AUTH'; }
}
class TescoCaptchaError extends Error {
  constructor() { super('Tesco CAPTCHA detected — cannot proceed automatically.'); this.code = 'TESCO_CAPTCHA'; }
}

const BROWSER_OPTS = {
  channel: 'chrome',
  headless: HEADLESS,
  viewport: { width: 1280, height: 800 },
  locale: 'en-GB',
  timezoneId: 'Europe/London',
  args: ['--disable-blink-features=AutomationControlled'],
  ignoreDefaultArgs: ['--enable-automation'],
};

let _context = null;
let _launchPromise = null;
let _dealsCache = { data: null, ts: 0 };
let _clubcardCache = { data: null, ts: 0 };

async function getBrowser() {
  if (_context) {
    try { await _context.pages(); return _context; } catch { _context = null; _launchPromise = null; }
  }
  if (!_launchPromise) {
    _launchPromise = chromium.launchPersistentContext(PROFILE_PATH, BROWSER_OPTS)
      .then(ctx => {
        _context = ctx;
        _launchPromise = null;
        return ctx;
      })
      .catch(err => {
        _launchPromise = null;
        throw err;
      });
    _launchPromise.then(ctx => ctx.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      delete window.cdc_adoQpoasnfa76pfcZLmcfl_Array;
      delete window.cdc_adoQpoasnfa76pfcZLmcfl_Promise;
      delete window.cdc_adoQpoasnfa76pfcZLmcfl_Symbol;
    })).catch(() => {});
  }
  return _launchPromise;
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function checkAuth(page) {
  const url = page.url();
  if (url.includes('/login') || url.includes('/identity/') || url.includes('/auth/')) throw new TescoAuthError();
  if (await page.$('iframe[src*="captcha"], iframe[src*="akam"]')) throw new TescoCaptchaError();
  const hasSignInPrompt = await page.$('[data-testid="login-button"], a[href*="/account/login"]:not([data-testid="account-nav"])');
  if (hasSignInPrompt) throw new TescoAuthError();
}

async function saveDebugScreenshot(page, label) {
  if (!DEBUG) return;
  await page.screenshot({ path: `debug-tesco-${label}-${Date.now()}.png` });
}

async function scrapeProductTiles(page) {
  return page.$$eval('section[data-product-id]', (sections) =>
    sections.map(section => {
      const text = (sel) => section.querySelector(sel)?.textContent?.trim() ?? null;
      const name = section.getAttribute('aria-label');
      const productId = section.getAttribute('data-product-id');
      const dealPrice = text('[data-testid="offer-price"], [class*="offer-price"]');
      const originalPrice = text('[data-testid="regular-price"], [class*="was-price"], del');
      const clubcardPrice = text('[data-testid="clubcard-price"], [class*="clubcard-price"]');
      const promoLabel = text('[data-testid="promotion-label"], [class*="promo"]');
      return { name, deal_price: dealPrice, original_price: originalPrice, clubcard_price: clubcardPrice, deal_type: promoLabel, product_id: productId };
    })
  );
}

export async function getDeals() {
  if (_dealsCache.data && Date.now() - _dealsCache.ts < DEALS_TTL) return _dealsCache.data;

  const ctx = await getBrowser();
  const page = await ctx.newPage();
  try {
    await sleep(DELAY_MS);
    await page.goto(`${BASE_URL}/shop/en-GB/promotions/all`, { timeout: TIMEOUT_MS });
    await checkAuth(page);

    let iterations = 0;
    while (iterations < 20) {
      const loadMore = await page.$('[data-testid="load-more-button"], button:has-text("Load more")');
      if (!loadMore) break;
      await loadMore.scrollIntoViewIfNeeded();
      await loadMore.click();
      await sleep(DELAY_MS);
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await sleep(600);
      iterations++;
    }

    await saveDebugScreenshot(page, 'getDeals-loaded');
    const tiles = await scrapeProductTiles(page);
    if (DEBUG) console.log('[tesco] page url:', page.url(), 'tiles found:', tiles.length);
    _dealsCache = { data: tiles, ts: Date.now() };
    return tiles;
  } catch (err) {
    await saveDebugScreenshot(page, 'getDeals-error');
    throw err;
  } finally {
    await page.close();
  }
}

export async function getClubcardDeals() {
  if (_clubcardCache.data && Date.now() - _clubcardCache.ts < DEALS_TTL) return _clubcardCache.data;

  const ctx = await getBrowser();
  const page = await ctx.newPage();
  try {
    await sleep(DELAY_MS);
    await page.goto(`${BASE_URL}/shop/en-GB/promotions/clubcard-prices`, { timeout: TIMEOUT_MS });
    await checkAuth(page);
    let iters = 0;
    while (iters < 10) {
      const loadMore = await page.$('[data-testid="load-more-button"], button:has-text("Load more")');
      if (!loadMore) break;
      await loadMore.scrollIntoViewIfNeeded();
      await loadMore.click();
      await sleep(DELAY_MS);
      iters++;
    }
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await sleep(800);
    const tiles = await scrapeProductTiles(page);
    _clubcardCache = { data: tiles, ts: Date.now() };
    return tiles;
  } catch (err) {
    await saveDebugScreenshot(page, 'getClubcardDeals-error');
    throw err;
  } finally {
    await page.close();
  }
}

export async function searchIngredient(query) {
  const ctx = await getBrowser();
  const page = await ctx.newPage();
  try {
    await sleep(DELAY_MS);
    const url = `${BASE_URL}/shop/en-GB/search?query=${encodeURIComponent(query)}`;
    await page.goto(url, { timeout: TIMEOUT_MS });
    await checkAuth(page);

    const empty = await page.$('[data-testid="empty-search-message"], [class*="empty-state"]');
    if (empty) return [];

    await page.waitForSelector('li[data-auto-available="true"]', { timeout: TIMEOUT_MS }).catch(() => {});

    return page.$$eval('li[data-auto-available="true"]', (tiles) =>
      tiles.slice(0, 3).map(tile => {
        const text = (sel) => tile.querySelector(sel)?.textContent?.trim() ?? null;
        const link = tile.querySelector('a[href*="/products/"]');
        const addBtn = [...tile.querySelectorAll('button')].find(b => b.textContent.trim() === 'Add');
        return {
          name: addBtn?.getAttribute('aria-label')?.replace(/^add \d+ /i, '') ?? text('a[href*="/products/"]'),
          price: text('[data-testid="offer-price"]') ?? text('[data-testid="regular-price"]') ?? text('[class*="price"]'),
          clubcard_price: text('[data-testid="clubcard-price"], [class*="clubcard-price"]'),
          url: link?.href ?? null,
          product_id: tile.getAttribute('data-testid'),
        };
      })
    );
  } catch (err) {
    await saveDebugScreenshot(page, 'searchIngredient-error');
    throw err;
  } finally {
    await page.close();
  }
}

export async function addToCart(items) {
  const ctx = await getBrowser();
  const added = [];
  const failed = [];

  const page = await ctx.newPage();
  try {
    for (const item of items) {
      const name = typeof item === 'string' ? item : item.name;
      const quantity = typeof item === 'string' ? 1 : (parseInt(item.quantity) || 1);

      try {
        await sleep(DELAY_MS);
        await page.goto(`${BASE_URL}/shop/en-GB/search?query=${encodeURIComponent(name)}`, { timeout: TIMEOUT_MS });
        await checkAuth(page);

        await page.waitForSelector('li[data-auto-available="true"]', { timeout: 8000 }).catch(() => {});

        const addBtn = await page.$('li[data-auto-available="true"] button:has-text("Add")');

        if (!addBtn) { failed.push({ name, reason: 'Add button not found' }); continue; }
        await addBtn.click();
        await sleep(800);
        added.push(name);
      } catch (err) {
        if (err.code === 'TESCO_AUTH' || err.code === 'TESCO_CAPTCHA') {
          await page.close().catch(() => {});
          await closeBrowser();
          throw err;
        }
        await saveDebugScreenshot(page, `addToCart-error`);
        failed.push({ name, reason: err.message });
      }
    }
  } finally {
    await page.close().catch(() => {});
  }

  return { added, failed };
}

export async function checkSessionAlive() {
  if (!_context) return null; // null = browser never launched (not the same as signed out)
  try { await _context.pages(); return true; } catch { return false; }
}

export async function openLoginPage() {
  await closeBrowser();
  const ctx = await getBrowser();
  const page = await ctx.newPage();
  await page.goto(`${BASE_URL}/account/login`, { waitUntil: 'domcontentloaded' });
}

export async function closeBrowser() {
  _launchPromise = null;
  if (_context) {
    await _context.close().catch(() => {});
    _context = null;
  }
}

process.on('SIGINT', closeBrowser);
process.on('SIGTERM', closeBrowser);
