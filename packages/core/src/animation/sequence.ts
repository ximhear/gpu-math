/**
 * Run animation steps in sequence.
 *
 * ```ts
 * await sequence([
 *   () => animate({ from: p, to: x => Math.sin(2*x), duration: 500 }),
 *   () => wait(200),
 *   () => animateParam(p, 'freq', { to: 3, duration: 500 }),
 * ]);
 * ```
 */
export async function sequence(steps: (() => Promise<void>)[]): Promise<void> {
  for (const step of steps) {
    await step();
  }
}

/**
 * Wait for a given duration (ms). Use inside sequence().
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
