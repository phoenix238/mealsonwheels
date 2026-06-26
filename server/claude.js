import Anthropic from '@anthropic-ai/sdk';

if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY env var is required');

const MODEL = 'claude-sonnet-4-6';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MEAL_PLAN_TOOL = {
  name: 'submit_meal_plan',
  description: 'Submit the generated meal plan as structured data.',
  input_schema: {
    type: 'object',
    properties: {
      recipes: {
        type: 'array',
        items: {
          type: 'object',
          required: ['name', 'cuisine', 'diet', 'estimated_cost', 'ingredients', 'instructions', 'servings', 'cook_time'],
          properties: {
            name: { type: 'string' },
            cuisine: { type: 'string' },
            diet: { type: 'array', items: { type: 'string' } },
            estimated_cost: { type: 'number' },
            servings: { type: 'integer', description: 'Number of servings, typically 2-4' },
            cook_time: { type: 'string', description: 'Total cook time, e.g. "25 mins"' },
            ingredients: {
              type: 'array',
              items: {
                type: 'object',
                required: ['name', 'qty', 'unit', 'price', 'on_deal', 'in_pantry'],
                properties: {
                  name: { type: 'string' },
                  qty: { type: 'string' },
                  unit: { type: 'string' },
                  price: { type: 'number' },
                  on_deal: { type: 'boolean' },
                  in_pantry: { type: 'boolean' },
                  product_id: { type: 'string' },
                },
              },
            },
            instructions: { type: 'string' },
          },
        },
      },
    },
    required: ['recipes'],
  },
};

const SYSTEM_PROMPT = `You are a UK meal planning assistant for a Tesco grocery app.

Rules:
- Return ONLY via the submit_meal_plan tool — no prose, no extra text.
- Pantry items must always have price: 0 and in_pantry: true. Never include them in estimated_cost.
- estimated_cost = sum of non-pantry ingredient prices, rounded to 2 decimal places.
- Prefer ingredients that are on deal where they naturally fit the recipe.
- For non-deal, non-pantry ingredients, use realistic Tesco UK product names and estimate GBP prices.
- All prices must be in GBP as numbers (e.g. 1.50, not "£1.50").
- product_id: omit entirely if unknown — do not guess or fabricate it.
- Always set servings to a realistic number (typically 2–4).
- Always set cook_time (e.g. "20 mins", "45 mins").
- Keep instructions under 80 words per recipe — concise steps only.

Meal prep mode (activate when user mentions "meal prep", "batch cook", "prep for the week" etc.):
- Generate 3–4 recipes designed to be cooked once and eaten across multiple days.
- Each recipe should serve 4+ people / yield 4+ portions.
- Favour recipes that reheat well: curries, stews, soups, grain bowls, pasta bakes.
- Instructions should include batch cooking tips (how to store, how long it keeps).`;

function buildCuisineInstruction(cuisine, count) {
  if (cuisine.mode === 'single') {
    const style = cuisine.style === 'Random' ? 'any cuisine of your choice' : `${cuisine.style} cuisine`;
    return `All ${count} recipes must be ${style}.`;
  }
  const lines = cuisine.allocations.map(a =>
    `- Exactly ${a.count} recipe${a.count > 1 ? 's' : ''}: ${a.style === 'Random' ? 'any cuisine of your choice' : a.style}`
  ).join('\n');
  return `You MUST follow this exact cuisine breakdown (counts are fixed requirements):\n${lines}`;
}

const NON_FOOD_KEYWORDS = ['washing', 'detergent', 'laundry', 'toothpaste', 'toothbrush', 'shampoo', 'conditioner', 'bleach', 'softener', 'toilet', 'nappy', 'wipe', 'cleaning', 'disinfect', 'deodorant', 'body wash', 'shower gel', 'hand wash', 'fabric', 'dishwasher', 'kitchen roll', 'toilet roll', 'tissue', 'air freshener', 'polish'];

function compressDeals(deals, dietary, cuisine) {
  const parsePrice = v => parseFloat(String(v ?? '').replace(/^£/, '')) || 99;
  const extractPrice = (raw) => raw ? (String(raw).match(/£([\d.]+)/)?.[1] ?? null) : null;

  const meatTerms = ['chicken', 'beef', 'pork', 'lamb', 'fish', 'salmon', 'tuna', 'prawn', 'bacon', 'sausage', 'turkey'];

  let filtered = deals.filter(d => {
    if (!d.name) return false;
    const name = d.name.toLowerCase();
    if (NON_FOOD_KEYWORDS.some(t => name.includes(t))) return false;
    if (dietary === 'vegetarian' || dietary === 'vegan') {
      if (meatTerms.some(t => name.includes(t))) return false;
    }
    return true;
  });

  filtered.sort((a, b) => parsePrice(a.deal_price ?? a.original_price) - parsePrice(b.deal_price ?? b.original_price));

  return filtered.slice(0, 100).map(d => {
    const price = parsePrice(d.deal_price ?? d.original_price);
    const priceStr = price === 99 ? '?' : price.toFixed(2);
    const ccPrice = extractPrice(d.clubcard_price);
    const promo = d.deal_type ?? (ccPrice ? `Clubcard £${ccPrice}` : null) ?? 'on offer';
    return `${d.name} | £${priceStr} | ${promo}`;
  }).join('\n');
}

export async function generateRecipes({ deals, pantry, dietary, cuisine, count, userPrompt: freeText }) {
  const dealLines = compressDeals(deals, dietary ?? 'none', cuisine ?? { mode: 'single', style: 'Random' });
  const pantryList = pantry.map(p => p.name).join(', ');

  let userPrompt;
  if (freeText) {
    userPrompt = [
      `User request: "${freeText}"`,
      '',
      'Interpret what the user wants and generate an appropriate number of recipes (typically 3–5, or 3–4 for meal prep).',
      dietary && dietary !== 'none' ? `Dietary requirement: ${dietary}.` : '',
      '',
      'Current Tesco deals (prefer these ingredients where they fit naturally):',
      dealLines || '(no deals available this week)',
      '',
      pantryList ? `User already owns (mark as in_pantry: true, price: 0): ${pantryList}` : '',
    ].filter(Boolean).join('\n');
  } else {
    if (cuisine?.mode === 'mix') {
      const total = cuisine.allocations.reduce((s, a) => s + a.count, 0);
      if (total !== count) throw new Error(`Mix mode counts sum to ${total} but count is ${count}`);
    }
    const cuisineInstruction = buildCuisineInstruction(cuisine ?? { mode: 'single', style: 'Random' }, count);
    const dietLine = !dietary || dietary === 'none' ? '' : `All recipes must be ${dietary}.`;
    userPrompt = [
      `Generate exactly ${count} recipe${count > 1 ? 's' : ''}.`,
      dietLine,
      cuisineInstruction,
      '',
      'Current Tesco deals (prefer these ingredients where they fit naturally — you are not required to use every item):',
      dealLines || '(no deals available this week)',
      '',
      pantryList ? `The user already owns these pantry items (mark as in_pantry: true, price: 0): ${pantryList}` : '',
    ].filter(Boolean).join('\n');
  }

  const maxTokens = freeText ? 8192 : Math.min(8192, Math.max(2000, count * 600));
  let lastError;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: maxTokens,
        system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
        tools: [MEAL_PLAN_TOOL],
        tool_choice: { type: 'tool', name: 'submit_meal_plan' },
        messages: [{ role: 'user', content: userPrompt }],
      });

      if (response.stop_reason === 'max_tokens') {
        throw new Error('Response was too long — try asking for fewer recipes.');
      }

      const toolUse = response.content.find(b => b.type === 'tool_use' && b.name === 'submit_meal_plan');
      if (!toolUse) throw new Error('No tool_use block in response');

      const { recipes } = toolUse.input;
      if (!Array.isArray(recipes) || recipes.length === 0) {
        throw new Error('No recipes returned');
      }
      if (!freeText && recipes.length !== count) {
        throw new Error(`Expected ${count} recipes, got ${recipes?.length ?? 0}`);
      }

      if (!freeText && cuisine?.mode === 'mix') {
        for (const alloc of cuisine.allocations) {
          if (alloc.style === 'Random') continue;
          const actual = recipes.filter(r => r.cuisine?.toLowerCase() === alloc.style.toLowerCase()).length;
          if (actual !== alloc.count) throw new Error(`Expected ${alloc.count} ${alloc.style} recipes, got ${actual}`);
        }
      }

      return recipes.sort((a, b) => a.estimated_cost - b.estimated_cost);
    } catch (err) {
      if (err.message.includes('ran out of tokens')) throw err;
      lastError = err;
      if (attempt < 3) await new Promise(r => setTimeout(r, attempt * 1000));
    }
  }

  throw Object.assign(new Error('Recipe generation failed after 3 attempts'), { code: 'RECIPE_GENERATION_FAILED', cause: lastError });
}
