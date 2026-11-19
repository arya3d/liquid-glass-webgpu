# Liquid Glass in WebGPU 💎

### 🔗 **<VIDEO_LINK>**

[![Re-Creating Apple's Liquid Glass in WebGPU](./thumbnail.jpg)](<VIDEO_LINK>)

A pill of liquid glass, in the style of Apple's Liquid Glass, drawn with one WebGPU fragment shader over a real HTML page. Drag it across the text: the page bends under it like a lens, splits into a thin rainbow at the edge, and the rim catches the light.

The idea: a signed distance to the pill's edge gives the glass its shape, its slope and its lens, all from one number per pixel.

Learn how it works, step by step, in the video:

### 🔗 **<VIDEO_LINK>**

## Run it

You need a browser with WebGPU (recent Chrome, Edge or Safari).

```bash
npm install
npm run dev
```

## How it works

- `src/glassPassShader.ts`: the glass. The whole shader from the video, line for line: the rounded box distance, the lens bend, the surface normal, the colour split, Fresnel, the edge ring and the rim.
- `src/glassUniforms.ts`: the pill's shape and look, the same values the video uses.
- `src/capturePage.ts`: takes a picture of the page with html2canvas-pro and puts it on the GPU, so the shader can read what sits under the glass.
- `src/GlassRenderer.ts`: the WebGPU setup that runs the shader on the glass canvas.
- `src/main.ts`: places the glass on the headline and lets you drag it.

## Credits

- Inigo Quilez · the rounded box signed distance · https://iquilezles.org/articles/distfunctions2d/
- Christophe Schlick · the Fresnel approximation · An Inexpensive BRDF Model for Physically-based Rendering (1994)
- yorickshan · html2canvas-pro, the page capture · https://github.com/yorickshan/html2canvas-pro
- Apple · Liquid Glass, the design this re-creates · https://developer.apple.com/design/

## License

MIT, see [LICENSE](./LICENSE).
