import type { GPUState, Theme } from '../types.js';
import type { Camera2D } from '../camera/Camera2D.js';
import type { MathObject } from '../objects/MathObject.js';
import { GridRenderer } from './GridRenderer.js';
import { TextRenderer, type TextEntry } from './TextRenderer.js';

export class Renderer {
  private gpu: GPUState;
  private camera: Camera2D;
  private objects: MathObject[] = [];
  private gridRenderer: GridRenderer;
  private textRenderer: TextRenderer;
  private clearColor = { r: 0.11, g: 0.11, b: 0.11, a: 1 };
  private running = false;
  private depthTexture: GPUTexture | null = null;

  constructor(gpu: GPUState, camera: Camera2D) {
    this.gpu = gpu;
    this.camera = camera;
    this.gridRenderer = new GridRenderer(gpu);
    this.textRenderer = new TextRenderer(gpu);
    this.ensureDepthTexture();
  }

  private ensureDepthTexture(): void {
    const canvas = this.gpu.context.canvas as HTMLCanvasElement;
    const w = canvas.width;
    const h = canvas.height;

    if (this.depthTexture) {
      if (this.depthTexture.width === w && this.depthTexture.height === h) return;
      this.depthTexture.destroy();
    }

    this.depthTexture = this.gpu.device.createTexture({
      size: [w, h],
      format: 'depth24plus',
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });
  }

  applyTheme(theme: Theme): void {
    this.gridRenderer.applyTheme(theme);
    this.clearColor = this.gridRenderer.getClearColor(theme);
  }

  add(obj: MathObject): void {
    obj.init(this.gpu);
    this.objects.push(obj);
  }

  remove(obj: MathObject): void {
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

  stop(): void {
    this.running = false;
  }

  private render(): void {
    this.ensureDepthTexture();

    const { device, context } = this.gpu;
    const encoder = device.createCommandEncoder();
    const textureView = context.getCurrentTexture().createView();

    const pass = encoder.beginRenderPass({
      colorAttachments: [{
        view: textureView,
        clearValue: this.clearColor,
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

    const cameraUniforms = this.camera.getCameraUniforms();

    this.gridRenderer.render(pass, cameraUniforms);

    for (const obj of this.objects) {
      obj.render(pass, cameraUniforms);
    }

    pass.end();
    device.queue.submit([encoder.finish()]);

    // Render text labels in a separate pass (on top of everything, load existing content)
    if (this.textRenderer.hasEntries()) {
      const encoder2 = device.createCommandEncoder();
      const pass2 = encoder2.beginRenderPass({
        colorAttachments: [{
          view: context.getCurrentTexture().createView(),
          loadOp: 'load' as GPULoadOp,
          storeOp: 'store' as GPUStoreOp,
        }],
        depthStencilAttachment: {
          view: this.depthTexture!.createView(),
          depthLoadOp: 'load' as GPULoadOp,
          depthStoreOp: 'store' as GPUStoreOp,
        },
      });
      this.textRenderer.render(pass2, cameraUniforms);
      pass2.end();
      device.queue.submit([encoder2.finish()]);
    }
  }

  setTextEntries(entries: TextEntry[]): void {
    this.textRenderer.setEntries(entries);
  }

  destroy(): void {
    this.stop();
    for (const obj of this.objects) {
      obj.destroy();
    }
    this.objects = [];
    this.textRenderer.destroy();
    this.gridRenderer.destroy();
    this.depthTexture?.destroy();
  }
}
