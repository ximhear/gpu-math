import type { GPUState } from '../types.js';
import type { Camera3D } from '../camera/Camera3D.js';
import type { MathObject3D } from '../objects/MathObject3D.js';

export class Renderer3D {
  private gpu: GPUState;
  private camera: Camera3D;
  private objects: MathObject3D[] = [];
  private running = false;
  private depthTexture: GPUTexture | null = null;

  constructor(gpu: GPUState, camera: Camera3D) {
    this.gpu = gpu;
    this.camera = camera;
    this.ensureDepthTexture();
  }

  private ensureDepthTexture(): void {
    const canvas = this.gpu.context.canvas as HTMLCanvasElement;
    const w = canvas.width, h = canvas.height;
    if (this.depthTexture && this.depthTexture.width === w && this.depthTexture.height === h) return;
    this.depthTexture?.destroy();
    this.depthTexture = this.gpu.device.createTexture({
      size: [w, h],
      format: 'depth24plus',
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });
  }

  add(obj: MathObject3D): void {
    obj.init(this.gpu);
    this.objects.push(obj);
  }

  remove(obj: MathObject3D): void {
    const idx = this.objects.indexOf(obj);
    if (idx !== -1) {
      this.objects.splice(idx, 1);
      obj.destroy();
    }
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    const frame = () => {
      if (!this.running) return;
      this.render();
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  stop(): void { this.running = false; }

  private render(): void {
    this.ensureDepthTexture();
    const { device, context } = this.gpu;
    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
      colorAttachments: [{
        view: context.getCurrentTexture().createView(),
        clearValue: { r: 0.08, g: 0.08, b: 0.1, a: 1 },
        loadOp: 'clear' as GPULoadOp,
        storeOp: 'store' as GPUStoreOp,
      }],
      depthStencilAttachment: {
        view: this.depthTexture!.createView(),
        depthClearValue: 1.0,
        depthLoadOp: 'clear' as GPULoadOp,
        depthStoreOp: 'store' as GPUStoreOp,
      },
    });

    const cam = this.camera.getUniforms();
    for (const obj of this.objects) {
      obj.render(pass, cam);
    }

    pass.end();
    device.queue.submit([encoder.finish()]);
  }

  destroy(): void {
    this.stop();
    for (const obj of this.objects) obj.destroy();
    this.objects = [];
    this.depthTexture?.destroy();
  }
}
