import "./page.css";
import { GlassRenderer } from "./GlassRenderer";
import { capturePage, capturePixelRatio } from "./capturePage";
import { GLASS_SHAPE } from "./glassUniforms";

const GLASS_CSS_WIDTH = 360;
const GLASS_CSS_HEIGHT = GLASS_CSS_WIDTH * GLASS_SHAPE.height / GLASS_SHAPE.width;

interface Spot {
  x: number;
  y: number;
}

function clampToViewport(spot: Spot): Spot {
  return {
    x: Math.max(0, Math.min(spot.x, window.innerWidth - GLASS_CSS_WIDTH)),
    y: Math.max(0, Math.min(spot.y, window.innerHeight - GLASS_CSS_HEIGHT)),
  };
}

function restingOnHeadline(headline: HTMLElement): Spot {
  const box = headline.getBoundingClientRect();
  return clampToViewport({
    x: box.left + box.width / 2 - GLASS_CSS_WIDTH / 2,
    y: box.top + box.height / 2 - GLASS_CSS_HEIGHT / 2,
  });
}

function pillCornerRadius(): number {
  const aspect = GLASS_CSS_WIDTH / GLASS_CSS_HEIGHT;
  return GLASS_SHAPE.radius / 2 * aspect * GLASS_CSS_HEIGHT;
}

function makeDraggable(glass: HTMLElement, place: (spot: Spot) => void, current: () => Spot): void {
  let grab: { pointerX: number; pointerY: number; from: Spot } | null = null;
  glass.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    glass.setPointerCapture(event.pointerId);
    grab = { pointerX: event.clientX, pointerY: event.clientY, from: current() };
  });
  glass.addEventListener("pointermove", (event) => {
    if (!grab) return;
    place(clampToViewport({
      x: grab.from.x + event.clientX - grab.pointerX,
      y: grab.from.y + event.clientY - grab.pointerY,
    }));
  });
  const drop = (event: PointerEvent) => {
    if (!grab) return;
    glass.releasePointerCapture(event.pointerId);
    grab = null;
  };
  glass.addEventListener("pointerup", drop);
  glass.addEventListener("pointercancel", drop);
}

async function requestDevice(): Promise<GPUDevice | null> {
  const adapter = await navigator.gpu?.requestAdapter();
  return adapter ? adapter.requestDevice() : null;
}

async function start(): Promise<void> {
  const page = document.getElementById("page")!;
  const headline = page.querySelector("h1")!;
  const glass = document.getElementById("glass") as HTMLCanvasElement;

  const device = await requestDevice();
  if (!device) {
    document.getElementById("no-webgpu")!.hidden = false;
    return;
  }

  const renderer = new GlassRenderer(device, glass);
  let pixelRatio = 1;
  let spot = restingOnHeadline(headline);

  const place = (next: Spot) => {
    spot = next;
    glass.style.left = `${spot.x}px`;
    glass.style.top = `${spot.y}px`;
  };

  const sizeGlass = () => {
    glass.style.width = `${GLASS_CSS_WIDTH}px`;
    glass.style.height = `${GLASS_CSS_HEIGHT}px`;
    glass.style.clipPath = `inset(0 round ${pillCornerRadius()}px)`;
    glass.width = Math.round(GLASS_CSS_WIDTH * pixelRatio);
    glass.height = Math.round(GLASS_CSS_HEIGHT * pixelRatio);
  };

  const recapture = async () => {
    pixelRatio = capturePixelRatio(page, device);
    sizeGlass();
    renderer.showPage(await capturePage(page, pixelRatio, device));
    glass.hidden = false;
  };

  const drawFrame = () => {
    const glassBox = glass.getBoundingClientRect();
    const pageBox = page.getBoundingClientRect();
    renderer.render({
      x: (glassBox.left - pageBox.left) * pixelRatio,
      y: (glassBox.top - pageBox.top) * pixelRatio,
      width: glass.width,
      height: glass.height,
    });
    requestAnimationFrame(drawFrame);
  };

  let resizeTimer = 0;
  window.addEventListener("resize", () => {
    place(clampToViewport(spot));
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(recapture, 200);
  });

  place(spot);
  makeDraggable(glass, place, () => spot);
  await recapture();
  requestAnimationFrame(drawFrame);
}

void start();
