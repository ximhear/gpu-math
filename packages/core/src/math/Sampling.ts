export interface SamplePoint {
  x: number;
  y: number;
}

/**
 * Adaptive sampling: subdivides intervals where the curve changes direction sharply.
 * - Starts with `initialSamples` uniformly-spaced points
 * - Recursively subdivides segments where angle change > `angleTolerance`
 * - Stops at `maxDepth` recursion levels
 */
export function adaptiveSample(
  fn: (x: number) => number,
  range: [number, number],
  initialSamples = 64,
  angleTolerance = 5, // degrees
  maxDepth = 8,
): SamplePoint[] {
  const [xMin, xMax] = range;
  const cosThreshold = Math.cos((angleTolerance * Math.PI) / 180);

  const result: SamplePoint[] = [];

  // Initial uniform samples
  const seeds: SamplePoint[] = [];
  for (let i = 0; i <= initialSamples; i++) {
    const x = xMin + (i / initialSamples) * (xMax - xMin);
    const y = fn(x);
    seeds.push({ x, y });
  }

  // Recursively subdivide
  for (let i = 0; i < seeds.length - 1; i++) {
    result.push(seeds[i]);
    subdivide(fn, seeds[i], seeds[i + 1], cosThreshold, maxDepth, 0, result);
  }
  result.push(seeds[seeds.length - 1]);

  // Filter out NaN/Infinity — return runs of finite points
  return result.filter(p => isFinite(p.y));
}

function subdivide(
  fn: (x: number) => number,
  a: SamplePoint,
  b: SamplePoint,
  cosThreshold: number,
  maxDepth: number,
  depth: number,
  result: SamplePoint[],
): void {
  if (depth >= maxDepth) return;

  const midX = (a.x + b.x) * 0.5;
  const midY = fn(midX);
  const mid: SamplePoint = { x: midX, y: midY };

  if (!isFinite(midY) || !isFinite(a.y) || !isFinite(b.y)) {
    result.push(mid);
    return;
  }

  // Compute angle between vectors (a→mid) and (mid→b)
  const dx1 = mid.x - a.x;
  const dy1 = mid.y - a.y;
  const dx2 = b.x - mid.x;
  const dy2 = b.y - mid.y;

  const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
  const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);

  if (len1 < 1e-12 || len2 < 1e-12) {
    result.push(mid);
    return;
  }

  const dot = (dx1 * dx2 + dy1 * dy2) / (len1 * len2);

  // If angle is sharp enough, subdivide further
  if (dot < cosThreshold) {
    subdivide(fn, a, mid, cosThreshold, maxDepth, depth + 1, result);
    result.push(mid);
    subdivide(fn, mid, b, cosThreshold, maxDepth, depth + 1, result);
  } else {
    result.push(mid);
  }
}
