struct Camera3DUniforms {
  viewProjection: mat4x4<f32>,
  resolution: vec2<f32>,
  pixelRatio: f32,
  _pad: f32,
}

@group(0) @binding(0) var<uniform> camera: Camera3DUniforms;

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) worldPos: vec3<f32>,
}

@vertex
fn vs_main(@builtin(vertex_index) idx: u32) -> VertexOutput {
  // Large XZ plane quad
  let size = 20.0;
  let positions = array<vec3<f32>, 6>(
    vec3(-size, 0.0, -size), vec3(size, 0.0, -size), vec3(-size, 0.0, size),
    vec3(-size, 0.0, size), vec3(size, 0.0, -size), vec3(size, 0.0, size),
  );
  let pos = positions[idx];
  var out: VertexOutput;
  out.position = camera.viewProjection * vec4(pos, 1.0);
  out.worldPos = pos;
  return out;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
  let pos = in.worldPos.xz;

  // Minor grid (spacing = 1)
  let g = abs(fract(pos - 0.5) - 0.5) / fwidth(pos);
  let minorLine = min(g.x, g.y);
  let minorAlpha = 1.0 - min(minorLine, 1.0);

  // Major grid (spacing = 5)
  let mg = abs(fract(pos / 5.0 - 0.5) - 0.5) / fwidth(pos / 5.0);
  let majorLine = min(mg.x, mg.y);
  let majorAlpha = 1.0 - min(majorLine, 1.0);

  // X axis (z=0) and Z axis (x=0)
  let axisX = abs(pos.y) / fwidth(pos.y);
  let axisZ = abs(pos.x) / fwidth(pos.x);
  let axisAlpha = 1.0 - min(min(axisX, axisZ), 1.0);

  // Distance fade
  let dist = length(pos);
  let fade = 1.0 - smoothstep(10.0, 20.0, dist);

  let gridColor = vec4(0.3, 0.3, 0.3, minorAlpha * 0.2 * fade);
  let majorColor = vec4(0.5, 0.5, 0.5, majorAlpha * 0.3 * fade);
  let axisColor = vec4(0.8, 0.8, 0.8, axisAlpha * 0.5);

  var color = vec4(0.0, 0.0, 0.0, 0.0);
  color = mix(color, gridColor, gridColor.a);
  color = mix(color, majorColor, majorColor.a);
  color = mix(color, axisColor, axisColor.a);

  if (color.a < 0.01) { discard; }
  return color;
}
