import 'dotenv/config';
import { chromium } from 'playwright';
import * as readline from 'readline';

const PROFILE_PATH = process.env.TESCO_PROFILE_PATH;
if (!PROFILE_PATH) throw new Error('TESCO_PROFILE_PATH env var is required');

console.log('Opening Tesco in a browser window...');
console.log('Log in to your Tesco account, then come back here and press Enter.\n');

const ctx = await chromium.launchPersistentContext(PROFILE_PATH, {
  channel: 'chrome',
  headless: false,
  viewport: null,
  locale: 'en-GB',
  timezoneId: 'Europe/London',
  args: ['--disable-blink-features=AutomationControlled'],
  ignoreDefaultArgs: ['--enable-automation'],
});

const page = await ctx.newPage();
await page.goto('https://www.tesco.com');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
await new Promise(resolve => rl.question('Press Enter once you have logged in... ', resolve));
rl.close();

await ctx.close();
console.log('Done! Session saved. You can now run npm run dev normally.');
