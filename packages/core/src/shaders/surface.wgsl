struct Camera3DUniforms {
  viewProjection: mat4x4<f32>,
  cameraPos: vec3<f32>,
  _pad0: f32,
}

struct SurfaceUniforms {
  colorLow: vec4<f32>,
  colorHigh: vec4<f32>,
  opacity: f32,
  wireframe: f32,
  wireWidth: f32,
  _pad: f32,
}

@group(0) @binding(0) var<uniform> camera: Camera3DUniforms;
@group(0) @binding(1) var<uniform> surface: SurfaceUniforms;

struct VertexInput {
  @location(0) position: vec3<f32>,
  @location(1) normal: vec3<f32>,
  @location(2) uv: vec2<f32>,
  @location(3) height: f32,
}

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) worldPos: vec3<f32>,
  @location(1) normal: vec3<f32>,
  @location(2) uv: vec2<f32>,
  @location(3) height: f32,
}

@vertex
fn vs_main(in: VertexInput) -> VertexOutput {
  var out: VertexOutput;
  out.position = camera.viewProjection * vec4(in.position, 1.0);
  out.worldPos = in.position;
  out.normal = in.normal;
  out.uv = in.uv;
  out.height = in.height;
  return out;
}

// Viridis-like colormap (simplified 4-stop)
fn viridis(t: f32) -> vec3<f32> {
  let c = clamp(t, 0.0, 1.0);
  let r = mix(0.267, 0.993, smoothstep(0.5, 1.0, c));
  let g = mix(0.004, 0.906, c);
  let b = mix(0.329, 0.144, smoothstep(0.0, 0.7, c));
  return vec3(r, g, b);
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
  let normal = normalize(in.normal);
  let lightDir = normalize(vec3(1.0, 2.0, 3.0));
  let viewDir = normalize(camera.cameraPos - in.worldPos);

  // Phong lighting
  let ambient = 0.25;
  let diffuse = max(dot(normal, lightDir), 0.0) * 0.55;
  let reflectDir = reflect(-lightDir, normal);
  let specular = pow(max(dot(reflectDir, viewDir), 0.0), 32.0) * 0.25;

  // Two-sided lighting
  let backDiffuse = max(dot(-normal, lightDir), 0.0) * 0.3;
  let lighting = ambient + max(diffuse, backDiffuse) + specular;

  // Color from height
  let baseColor = viridis(in.height);

  // Wireframe overlay
  var wire = 0.0;
  if (surface.wireframe > 0.0) {
    let grid = abs(fract(in.uv * surface.wireWidth - 0.5) - 0.5);
    let lineVal = min(grid.x, grid.y);
    wire = 1.0 - smoothstep(0.0, 0.03, lineVal);
  }

  var finalColor = baseColor * lighting;
  finalColor = mix(finalColor, vec3(1.0), wire * 0.3);

  return vec4(finalColor, surface.opacity);
}
