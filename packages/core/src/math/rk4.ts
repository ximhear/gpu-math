import type { Vec2 } from '../types.js';

/**
 * 4th-order Runge-Kutta integrator for 2D ODE: dx/dt = f(x, y)
 */
export function integrateRK4(
  field: (x: number, y: number) => Vec2,
  x0: number,
  y0: number,
  dt: number,
  steps: number,
): Vec2[] {
  const trajectory: Vec2[] = [[x0, y0]];
  let x = x0, y = y0;

  for (let i = 0; i < steps; i++) {
    const [k1x, k1y] = field(x, y);
    const [k2x, k2y] = field(x + k1x * dt / 2, y + k1y * dt / 2);
    const [k3x, k3y] = field(x + k2x * dt / 2, y + k2y * dt / 2);
    const [k4x, k4y] = field(x + k3x * dt, y + k3y * dt);

    x += (k1x + 2 * k2x + 2 * k3x + k4x) * dt / 6;
    y += (k1y + 2 * k2y + 2 * k3y + k4y) * dt / 6;

    if (!isFinite(x) || !isFinite(y)) break;
    trajectory.push([x, y]);
  }

  return trajectory;
}
