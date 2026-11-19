import html2canvas from "html2canvas-pro";

export function capturePixelRatio(page: HTMLElement, device: GPUDevice): number {
  const largestSide = Math.max(page.offsetWidth, page.offsetHeight);
  const fitsTexture = device.limits.maxTextureDimension2D / largestSide;
  return Math.min(window.devicePixelRatio || 1, fitsTexture);
}

export async function capturePage(page: HTMLElement, pixelRatio: number, device: GPUDevice): Promise<GPUTexture> {
  await document.fonts.ready;
  const pageCanvas = await html2canvas(page, {
    backgroundColor: getComputedStyle(page).backgroundColor,
    scale: pixelRatio,
    logging: false,
  });
  const image = await createImageBitmap(pageCanvas);
  const size = [image.width, image.height];
  const texture = device.createTexture({
    label: "page capture",
    size,
    format: "rgba8unorm",
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
  });
  device.queue.copyExternalImageToTexture({ source: image }, { texture }, size);
  image.close();
  return texture;
}
