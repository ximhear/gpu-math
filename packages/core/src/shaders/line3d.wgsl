struct Camera3DUniforms {
  viewProjection: mat4x4<f32>,
  resolution: vec2<f32>,
  pixelRatio: f32,
  _pad: f32,
}

struct LineUniforms {
  color: vec4<f32>,
  width: f32,
  dashLength: f32,
  dashRatio: f32,
  _pad: f32,
}

@group(0) @binding(0) var<uniform> camera: Camera3DUniforms;
@group(0) @binding(1) var<uniform> line: LineUniforms;

struct VertexInput {
  @location(0) posA: vec3<f32>,
  @location(1) posB: vec3<f32>,
  @location(2) uv: vec2<f32>,
  @location(3) along: f32,
}

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) side: f32,
  @location(1) dist: f32,
}

@vertex
fn vs_main(in: VertexInput) -> VertexOutput {
  let clipA = camera.viewProjection * vec4(in.posA, 1.0);
  let clipB = camera.viewProjection * vec4(in.posB, 1.0);

  // Perspective divide to NDC, then to screen pixels
  let ndcA = clipA.xy / clipA.w;
  let ndcB = clipB.xy / clipB.w;
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

  // Back to NDC
  let ndc = expanded / (camera.resolution * 0.5);

  // Interpolate clip Z and W for correct depth
  let clipZ = mix(clipA.z / clipA.w, clipB.z / clipB.w, in.uv.x);
  let clipW = mix(clipA.w, clipB.w, in.uv.x);

  var out: VertexOutput;
  out.position = vec4(ndc * clipW, clipZ * clipW, clipW);
  out.side = in.uv.y;
  out.dist = in.along + in.uv.x * len;
  return out;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
  let d = abs(in.side);
  let alpha = 1.0 - smoothstep(0.7, 1.0, d);

  if (line.dashLength > 0.0) {
    let dashPos = fract(in.dist / line.dashLength);
    if (dashPos > line.dashRatio) { discard; }
  }

  return vec4(line.color.rgb, line.color.a * alpha);
}
