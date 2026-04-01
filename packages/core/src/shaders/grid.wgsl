struct CameraUniforms {
  viewProjection: mat4x4<f32>,
  invViewProjection: mat4x4<f32>,
  resolution: vec2<f32>,
  pixelRatio: f32,
  _pad: f32,
}

struct GridUniforms {
  bgColor: vec4<f32>,
  gridColor: vec4<f32>,
  gridMajorColor: vec4<f32>,
  axisColor: vec4<f32>,
  spacing: f32,
  majorEvery: f32,
  _pad0: f32,
  _pad1: f32,
}

@group(0) @binding(0) var<uniform> camera: CameraUniforms;
@group(0) @binding(1) var<uniform> grid: GridUniforms;

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) worldPos: vec2<f32>,
}

@vertex
fn vs_main(@builtin(vertex_index) idx: u32) -> VertexOutput {
  let positions = array<vec2<f32>, 6>(
    vec2(-1.0, -1.0), vec2(1.0, -1.0), vec2(-1.0, 1.0),
    vec2(-1.0, 1.0), vec2(1.0, -1.0), vec2(1.0, 1.0),
  );
  var out: VertexOutput;
  let ndc = positions[idx];
  out.position = vec4(ndc, 0.0, 1.0);
  let world = camera.invViewProjection * vec4(ndc, 0.0, 1.0);
  out.worldPos = world.xy;
  return out;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
  let pos = in.worldPos;

  // Minor grid
  let g = abs(fract(pos / grid.spacing - 0.5) - 0.5) / fwidth(pos / grid.spacing);
  let minorLine = min(g.x, g.y);
  let minorAlpha = 1.0 - min(minorLine, 1.0);

  // Major grid
  let majorSpacing = grid.spacing * grid.majorEvery;
  let mg = abs(fract(pos / majorSpacing - 0.5) - 0.5) / fwidth(pos / majorSpacing);
  let majorLine = min(mg.x, mg.y);
  let majorAlpha = 1.0 - min(majorLine, 1.0);

  // Axes (x=0, y=0)
  let axisX = abs(pos.y) / fwidth(pos.y);
  let axisY = abs(pos.x) / fwidth(pos.x);
  let axisAlpha = 1.0 - min(min(axisX, axisY), 1.0);

  // Compose
  var color = grid.bgColor;
  color = mix(color, grid.gridColor, minorAlpha * 0.3);
  color = mix(color, grid.gridMajorColor, majorAlpha * 0.5);
  color = mix(color, grid.axisColor, axisAlpha * 0.8);

  return color;
}
