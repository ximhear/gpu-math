struct CameraUniforms {
  viewProjection: mat4x4<f32>,
  invViewProjection: mat4x4<f32>,
  resolution: vec2<f32>,
  pixelRatio: f32,
  _pad: f32,
}

struct PointUniforms {
  color: vec4<f32>,
  center: vec2<f32>,
  size: f32,     // radius in pixels
  _pad: f32,
}

@group(0) @binding(0) var<uniform> camera: CameraUniforms;
@group(0) @binding(1) var<uniform> pt: PointUniforms;

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) localPos: vec2<f32>,
}

@vertex
fn vs_main(@builtin(vertex_index) vid: u32) -> VertexOutput {
  let offsets = array<vec2<f32>, 6>(
    vec2(-1.0, -1.0), vec2(1.0, -1.0), vec2(-1.0, 1.0),
    vec2(-1.0, 1.0), vec2(1.0, -1.0), vec2(1.0, 1.0),
  );
  let local = offsets[vid];

  let ndc = (camera.viewProjection * vec4(pt.center, 0.0, 1.0)).xy;
  let screen = ndc * camera.resolution * 0.5;
  let expanded = screen + local * pt.size * camera.pixelRatio;
  let ndcOut = expanded / (camera.resolution * 0.5);

  var out: VertexOutput;
  out.position = vec4(ndcOut, 0.0, 1.0);
  out.localPos = local;
  return out;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
  let dist = length(in.localPos);
  if (dist > 1.0) { discard; }
  let alpha = 1.0 - smoothstep(0.8, 1.0, dist);
  return vec4(pt.color.rgb, pt.color.a * alpha);
}
