struct CameraUniforms {
  viewProjection: mat4x4<f32>,
  invViewProjection: mat4x4<f32>,
  resolution: vec2<f32>,
  pixelRatio: f32,
  _pad: f32,
}

struct LineUniforms {
  color: vec4<f32>,
  width: f32,
  dashLength: f32,    // 0 = solid line
  dashRatio: f32,     // fraction of dash that is visible (0.5 = half dash, half gap)
  _pad: f32,
}

@group(0) @binding(0) var<uniform> camera: CameraUniforms;
@group(0) @binding(1) var<uniform> line: LineUniforms;

struct VertexInput {
  @location(0) posA: vec2<f32>,
  @location(1) posB: vec2<f32>,
  @location(2) uv: vec2<f32>,     // x: 0=at A, 1=at B; y: -1 or +1 (side)
  @location(3) along: f32,        // cumulative screen-space distance at point A
}

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) side: f32,
  @location(1) dist: f32,         // interpolated along-distance in screen pixels
}

@vertex
fn vs_main(in: VertexInput) -> VertexOutput {
  let ndcA = (camera.viewProjection * vec4(in.posA, 0.0, 1.0)).xy;
  let ndcB = (camera.viewProjection * vec4(in.posB, 0.0, 1.0)).xy;

  let screenA = ndcA * camera.resolution * 0.5;
  let screenB = ndcB * camera.resolution * 0.5;

  let delta = screenB - screenA;
  let len = length(delta);
  let normal = select(
    vec2(-delta.y, delta.x) / len,
    vec2(0.0, 1.0),
    len < 0.001
  );

  let screenPos = mix(screenA, screenB, in.uv.x);

  let thickness = line.width * camera.pixelRatio;
  let offset = normal * in.uv.y * thickness * 0.5;
  let expanded = screenPos + offset;

  let ndc = expanded / (camera.resolution * 0.5);

  var out: VertexOutput;
  out.position = vec4(ndc, 0.0, 1.0);
  out.side = in.uv.y;
  out.dist = in.along + in.uv.x * len;
  return out;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
  // Anti-aliased edge
  let d = abs(in.side);
  let alpha = 1.0 - smoothstep(0.7, 1.0, d);

  // Dash pattern
  if (line.dashLength > 0.0) {
    let dashPos = fract(in.dist / line.dashLength);
    if (dashPos > line.dashRatio) { discard; }
  }

  return vec4(line.color.rgb, line.color.a * alpha);
}
