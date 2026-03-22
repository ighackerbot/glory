export const formatMoney = (value: number): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value);

export const MONTHLY_PRICE = 24;
export const YEARLY_PRICE = 240;
export const PRIZE_POOL_PERCENTAGE = 0.24;
export const MIN_CHARITY_PERCENTAGE = 10;
export const MAX_SCORES = 5;
export const MIN_SCORE = 1;
export const MAX_SCORE = 45;

export const TIER_SHARES = {
  '5-match': 0.40,
  '4-match': 0.35,
  '3-match': 0.25,
} as const;

export const generateDrawNumbers = (count: number, max: number): number[] => {
  const numbers = new Set<number>();
  while (numbers.size < count) {
    numbers.add(Math.floor(Math.random() * max) + 1);
  }
  return Array.from(numbers).sort((a, b) => a - b);
};

export const countMatches = (userScores: number[], drawNumbers: number[]): number => {
  const drawSet = new Set(drawNumbers);
  return userScores.filter(s => drawSet.has(s)).length;
};
