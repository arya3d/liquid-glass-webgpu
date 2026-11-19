import { GLASS_PASS_SHADER } from "./glassPassShader";
import { GLASS_LOOK, GLASS_SHAPE, GLASS_UNIFORM_FLOATS, packGlassUniforms, type CanvasOnPage } from "./glassUniforms";

const MASK_FORMAT: GPUTextureFormat = "rgba8unorm";

export class GlassRenderer {
  private readonly context: GPUCanvasContext;
  private readonly pipeline: GPURenderPipeline;
  private readonly sampler: GPUSampler;
  private readonly uniformBuffer: GPUBuffer;
  private readonly uniformData = new Float32Array(GLASS_UNIFORM_FLOATS);
  private bindGroup?: GPUBindGroup;
  private pageTexture?: GPUTexture;
  private maskTexture?: GPUTexture;

  constructor(private readonly device: GPUDevice, private readonly canvas: HTMLCanvasElement) {
    const format = navigator.gpu.getPreferredCanvasFormat();
    this.context = canvas.getContext("webgpu")!;
    this.context.configure({ device, format, alphaMode: "opaque" });

    const module = device.createShaderModule({ label: "glass pass", code: GLASS_PASS_SHADER });
    this.pipeline = device.createRenderPipeline({
      label: "glass pass",
      layout: "auto",
      vertex: { module, entryPoint: "vert_main" },
      fragment: { module, entryPoint: "frag_main", targets: [{ format }, { format: MASK_FORMAT }] },
      primitive: { topology: "triangle-list" },
    });
    this.sampler = device.createSampler({
      addressModeU: "clamp-to-edge",
      addressModeV: "clamp-to-edge",
      minFilter: "linear",
      magFilter: "linear",
    });
    this.uniformBuffer = device.createBuffer({
      label: "glass uniforms",
      size: this.uniformData.byteLength,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
  }

  showPage(pageTexture: GPUTexture): void {
    this.pageTexture?.destroy();
    this.pageTexture = pageTexture;
    this.bindGroup = this.device.createBindGroup({
      layout: this.pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.uniformBuffer } },
        { binding: 1, resource: this.sampler },
        { binding: 2, resource: pageTexture.createView() },
      ],
    });
  }

  get hasPage(): boolean {
    return this.bindGroup !== undefined;
  }

  render(canvasOnPage: CanvasOnPage): void {
    if (!this.bindGroup) return;
    packGlassUniforms(this.uniformData, canvasOnPage, GLASS_SHAPE, GLASS_LOOK);
    this.device.queue.writeBuffer(this.uniformBuffer, 0, this.uniformData);

    const encoder = this.device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
      colorAttachments: [
        { view: this.context.getCurrentTexture().createView(), clearValue: { r: 0, g: 0, b: 0, a: 1 }, loadOp: "clear", storeOp: "store" },
        { view: this.maskTarget().createView(), clearValue: { r: 0, g: 0, b: 0, a: 0 }, loadOp: "clear", storeOp: "store" },
      ],
    });
    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, this.bindGroup);
    pass.draw(6, 1);
    pass.end();
    this.device.queue.submit([encoder.finish()]);
  }

  private maskTarget(): GPUTexture {
    const { width, height } = this.canvas;
    if (this.maskTexture?.width === width && this.maskTexture.height === height) return this.maskTexture;
    this.maskTexture?.destroy();
    this.maskTexture = this.device.createTexture({
      label: "glass mask",
      size: { width, height },
      format: MASK_FORMAT,
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });
    return this.maskTexture;
  }
}
