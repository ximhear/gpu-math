struct CameraUniforms {
  viewProjection: mat4x4<f32>,
  invViewProjection: mat4x4<f32>,
  resolution: vec2<f32>,
  pixelRatio: f32,
  _pad: f32,
}

struct TextUniforms {
  worldPos: vec2<f32>,     // anchor point in world coords
  texSize: vec2<f32>,      // texture size in pixels
  offset: vec2<f32>,       // screen pixel offset from anchor
  opacity: f32,
  _pad: f32,
}

@group(0) @binding(0) var<uniform> camera: CameraUniforms;
@group(0) @binding(1) var<uniform> text: TextUniforms;
@group(0) @binding(2) var textTex: texture_2d<f32>;
@group(0) @binding(3) var textSampler: sampler;

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
}

@vertex
fn vs_main(@builtin(vertex_index) vid: u32) -> VertexOutput {
  // Quad: 6 vertices
  let corners = array<vec2<f32>, 6>(
    vec2(0.0, 0.0), vec2(1.0, 0.0), vec2(0.0, 1.0),
    vec2(0.0, 1.0), vec2(1.0, 0.0), vec2(1.0, 1.0),
  );
  let corner = corners[vid];

  // Project world anchor to screen
  let ndc = (camera.viewProjection * vec4(text.worldPos, 0.0, 1.0)).xy;
  let screen = ndc * camera.resolution * 0.5;

  // Quad spans from anchor + offset, sized by texture pixels
  let quadPos = screen + text.offset + corner * text.texSize;
  let ndcOut = quadPos / (camera.resolution * 0.5);

  var out: VertexOutput;
  out.position = vec4(ndcOut, 0.0, 1.0);
  // UV: flip Y for Canvas2D texture (top-left origin)
  out.uv = vec2(corner.x, 1.0 - corner.y);
  return out;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
  let color = textureSample(textTex, textSampler, in.uv);
  if (color.a < 0.01) { discard; }
  return vec4(color.rgb, color.a * text.opacity);
}
