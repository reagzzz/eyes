type Pricing = { usd:number; sol:number; lamports:number; eur:number; credits:number };

const CREDIT_EUR = 0.01;
const EUR_USD = Number(process.env.EUR_USD_FALLBACK || 1.1);
const SOL_USD = Number(process.env.SOL_USD_FALLBACK || 150);

const MODEL_CREDITS: Record<string, number> = {
  "sd35-large": 6.5,
  "sd35-large-turbo": 4,
  "sd35-medium": 3.5,
  "sd35-flash": 2.5,
  "sdxl-1.0": 0.9,
};

export function computeQuote({ count, model }: { count:number; model:string }): Pricing {
  const perImageCredits = MODEL_CREDITS[model] ?? MODEL_CREDITS["sd35-medium"];
  const credits = perImageCredits * Math.max(1, Math.min(10000, count));
  const eur = credits * CREDIT_EUR;
  const usd = eur * EUR_USD;
  const solRaw = usd / SOL_USD;
  const minSol = (Number(process.env.NEXT_PUBLIC_CREATION_FEE_LAMPORTS || 10_000_000))/1_000_000_000;
  const sol = Math.max(solRaw, minSol);
  const lamports = Math.round(sol * 1_000_000_000);
  return { usd: +usd.toFixed(2), eur: +eur.toFixed(2), sol: +sol.toFixed(6), lamports, credits: +credits.toFixed(2) };
}


