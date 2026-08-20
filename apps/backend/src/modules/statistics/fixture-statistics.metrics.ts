export function calculateRate(
  numerator: number,
  denominator: number,
  multiplier: number,
): number | null {
  if (denominator === 0) {
    return null;
  }

  return Number(((numerator / denominator) * multiplier).toFixed(2));
}

export function formatOvers(legalBalls: number, ballsPerOver: number): string {
  return `${Math.floor(legalBalls / ballsPerOver)}.${legalBalls % ballsPerOver}`;
}
