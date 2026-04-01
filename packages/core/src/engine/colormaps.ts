/** WGSL colormap function implementations.
 *  Each maps a clamped [0,1] value to vec3<f32> RGB.
 *  LUT values from matplotlib reference implementations. */

const COLORMAPS: Record<string, string> = {
  viridis: `fn colormap(t: f32) -> vec3<f32> {
  let c = clamp(t, 0.0, 1.0) * 7.0;
  let i = u32(floor(c));
  let f = fract(c);
  let colors = array<vec3<f32>, 8>(
    vec3(0.267, 0.004, 0.329),
    vec3(0.283, 0.141, 0.458),
    vec3(0.254, 0.265, 0.530),
    vec3(0.207, 0.372, 0.553),
    vec3(0.164, 0.471, 0.558),
    vec3(0.128, 0.567, 0.551),
    vec3(0.267, 0.679, 0.441),
    vec3(0.993, 0.906, 0.144),
  );
  return mix(colors[i], colors[min(i + 1u, 7u)], f);
}`,

  plasma: `fn colormap(t: f32) -> vec3<f32> {
  let c = clamp(t, 0.0, 1.0) * 7.0;
  let i = u32(floor(c));
  let f = fract(c);
  let colors = array<vec3<f32>, 8>(
    vec3(0.050, 0.030, 0.528),
    vec3(0.327, 0.012, 0.616),
    vec3(0.553, 0.052, 0.545),
    vec3(0.735, 0.216, 0.330),
    vec3(0.868, 0.400, 0.125),
    vec3(0.954, 0.596, 0.022),
    vec3(0.976, 0.808, 0.197),
    vec3(0.940, 0.975, 0.131),
  );
  return mix(colors[i], colors[min(i + 1u, 7u)], f);
}`,

  magma: `fn colormap(t: f32) -> vec3<f32> {
  let c = clamp(t, 0.0, 1.0) * 7.0;
  let i = u32(floor(c));
  let f = fract(c);
  let colors = array<vec3<f32>, 8>(
    vec3(0.001, 0.000, 0.014),
    vec3(0.160, 0.039, 0.346),
    vec3(0.395, 0.083, 0.433),
    vec3(0.575, 0.148, 0.404),
    vec3(0.772, 0.248, 0.321),
    vec3(0.930, 0.411, 0.242),
    vec3(0.993, 0.651, 0.404),
    vec3(0.987, 0.991, 0.750),
  );
  return mix(colors[i], colors[min(i + 1u, 7u)], f);
}`,

  coolwarm: `fn colormap(t: f32) -> vec3<f32> {
  let c = clamp(t, 0.0, 1.0) * 7.0;
  let i = u32(floor(c));
  let f = fract(c);
  let colors = array<vec3<f32>, 8>(
    vec3(0.230, 0.299, 0.754),
    vec3(0.398, 0.480, 0.875),
    vec3(0.578, 0.647, 0.951),
    vec3(0.747, 0.783, 0.975),
    vec3(0.951, 0.726, 0.685),
    vec3(0.908, 0.526, 0.452),
    vec3(0.824, 0.313, 0.244),
    vec3(0.706, 0.016, 0.150),
  );
  return mix(colors[i], colors[min(i + 1u, 7u)], f);
}`,

  inferno: `fn colormap(t: f32) -> vec3<f32> {
  let c = clamp(t, 0.0, 1.0) * 7.0;
  let i = u32(floor(c));
  let f = fract(c);
  let colors = array<vec3<f32>, 8>(
    vec3(0.001, 0.000, 0.014),
    vec3(0.120, 0.047, 0.282),
    vec3(0.332, 0.059, 0.433),
    vec3(0.530, 0.134, 0.378),
    vec3(0.735, 0.216, 0.230),
    vec3(0.891, 0.370, 0.063),
    vec3(0.969, 0.597, 0.043),
    vec3(0.988, 0.998, 0.645),
  );
  return mix(colors[i], colors[min(i + 1u, 7u)], f);
}`,
};

/** Available built-in colormap names */
export type ColormapName = 'viridis' | 'plasma' | 'magma' | 'coolwarm' | 'inferno';

/** Get WGSL colormap function source by name. Falls back to viridis. */
export function getColormapWGSL(name: string): string {
  return COLORMAPS[name] ?? COLORMAPS.viridis;
}

/** Define a custom colormap from color stops.
 *  Returns a colormap name that can be used in surface options.
 *
 *  ```typescript
 *  const myMap = defineColorMap([
 *    [0, '#3b82f6'],
 *    [0.5, '#ffffff'],
 *    [1, '#ef4444'],
 *  ]);
 *  scene3d.add(surface(fn, { colorMap: myMap }));
 *  ```
 */
export function defineColorMap(stops: [number, string][]): string {
  const sorted = [...stops].sort((a, b) => a[0] - b[0]);
  // Resample to 8 evenly-spaced control points
  const entries: string[] = [];
  for (let i = 0; i < 8; i++) {
    const t = i / 7;
    const [r, g, b] = interpolateStops(sorted, t);
    entries.push(`    vec3(${r.toFixed(3)}, ${g.toFixed(3)}, ${b.toFixed(3)})`);
  }

  const name = `custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  COLORMAPS[name] = `fn colormap(t: f32) -> vec3<f32> {
  let c = clamp(t, 0.0, 1.0) * 7.0;
  let i = u32(floor(c));
  let f = fract(c);
  let colors = array<vec3<f32>, 8>(
${entries.join(',\n')},
  );
  return mix(colors[i], colors[min(i + 1u, 7u)], f);
}`;
  return name;
}

function interpolateStops(stops: [number, string][], t: number): [number, number, number] {
  if (stops.length === 0) return [0, 0, 0];
  if (t <= stops[0][0]) return hexToRGB(stops[0][1]);
  if (t >= stops[stops.length - 1][0]) return hexToRGB(stops[stops.length - 1][1]);

  for (let i = 0; i < stops.length - 1; i++) {
    if (t >= stops[i][0] && t <= stops[i + 1][0]) {
      const frac = (t - stops[i][0]) / (stops[i + 1][0] - stops[i][0]);
      const [r0, g0, b0] = hexToRGB(stops[i][1]);
      const [r1, g1, b1] = hexToRGB(stops[i + 1][1]);
      return [r0 + (r1 - r0) * frac, g0 + (g1 - g0) * frac, b0 + (b1 - b0) * frac];
    }
  }
  return hexToRGB(stops[stops.length - 1][1]);
}

function hexToRGB(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16) / 255, parseInt(h.slice(2, 4), 16) / 255, parseInt(h.slice(4, 6), 16) / 255];
}
