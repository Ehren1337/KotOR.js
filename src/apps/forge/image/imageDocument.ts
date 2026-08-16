/**
 * Image document: layers, selection, clone, and layer stack ops.
 *
 * @file imageDocument.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import { compositeLayer, flattenDocument } from "@/apps/forge/image/imageBlend";
import {
  DEFAULT_ENCODE_POLICY,
  DEFAULT_RGBA_BLACK,
  DEFAULT_RGBA_WHITE,
  type ImageDocument,
  type ImageEncodePolicy,
  type ImageLayer,
  type ImageRect,
  type ImageRgba,
} from "@/apps/forge/image/imageTypes";

let nextLayerSeq = 1;

export function allocLayerId(): string {
  nextLayerSeq += 1;
  return `L${nextLayerSeq}`;
}

export function transparentPixels(width: number, height: number): Uint8ClampedArray {
  return new Uint8ClampedArray(Math.max(0, width) * Math.max(0, height) * 4);
}

export function cloneLayer(layer: ImageLayer): ImageLayer {
  return {
    id: layer.id,
    name: layer.name,
    visible: layer.visible,
    opacity: layer.opacity,
    blend: layer.blend,
    lockTransparent: layer.lockTransparent,
    pixels: new Uint8ClampedArray(layer.pixels),
  };
}

export function cloneDocument(doc: ImageDocument): ImageDocument {
  return {
    width: doc.width,
    height: doc.height,
    layers: doc.layers.map(cloneLayer),
    activeLayerId: doc.activeLayerId,
    selection: doc.selection ? new Uint8Array(doc.selection) : null,
    txiText: doc.txiText,
    encode: { ...doc.encode },
    foreground: { ...doc.foreground },
    background: { ...doc.background },
  };
}

export function createLayer(
  width: number,
  height: number,
  options: Partial<Omit<ImageLayer, "pixels">> & { pixels?: Uint8ClampedArray | Uint8Array } = {},
): ImageLayer {
  const pixels = options.pixels
    ? new Uint8ClampedArray(options.pixels)
    : transparentPixels(width, height);
  return {
    id: options.id || allocLayerId(),
    name: options.name || "Layer",
    visible: options.visible !== false,
    opacity: options.opacity ?? 1,
    blend: options.blend || "normal",
    lockTransparent: !!options.lockTransparent,
    pixels,
  };
}

export function createUntitledDocument(width = 256, height = 256, txiText = ""): ImageDocument {
  const layer = createLayer(width, height, { name: "Background" });
  return {
    width,
    height,
    layers: [layer],
    activeLayerId: layer.id,
    selection: null,
    txiText,
    encode: { ...DEFAULT_ENCODE_POLICY },
    foreground: { ...DEFAULT_RGBA_WHITE },
    background: { ...DEFAULT_RGBA_BLACK },
  };
}

export function createDocumentFromRgba(
  pixels: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
  txiText = "",
  encode?: ImageEncodePolicy,
): ImageDocument {
  const layer = createLayer(width, height, { name: "Background", pixels });
  return {
    width,
    height,
    layers: [layer],
    activeLayerId: layer.id,
    selection: null,
    txiText,
    encode: encode ? { ...encode } : { ...DEFAULT_ENCODE_POLICY },
    foreground: { ...DEFAULT_RGBA_WHITE },
    background: { ...DEFAULT_RGBA_BLACK },
  };
}

export function getActiveLayer(doc: ImageDocument): ImageLayer | undefined {
  return doc.layers.find((layer) => layer.id === doc.activeLayerId) || doc.layers[doc.layers.length - 1];
}

export function getActiveLayerIndex(doc: ImageDocument): number {
  const index = doc.layers.findIndex((layer) => layer.id === doc.activeLayerId);
  return index >= 0 ? index : doc.layers.length - 1;
}

export function addLayer(doc: ImageDocument, name = "Layer"): ImageLayer {
  const layer = createLayer(doc.width, doc.height, { name });
  const index = getActiveLayerIndex(doc) + 1;
  doc.layers.splice(index, 0, layer);
  doc.activeLayerId = layer.id;
  return layer;
}

export function duplicateLayer(doc: ImageDocument): ImageLayer | undefined {
  const index = getActiveLayerIndex(doc);
  const source = doc.layers[index];
  if (!source) {
    return undefined;
  }
  const copy = cloneLayer(source);
  copy.id = allocLayerId();
  copy.name = `${source.name} copy`;
  doc.layers.splice(index + 1, 0, copy);
  doc.activeLayerId = copy.id;
  return copy;
}

export function deleteLayer(doc: ImageDocument): boolean {
  if (doc.layers.length <= 1) {
    return false;
  }
  const index = getActiveLayerIndex(doc);
  doc.layers.splice(index, 1);
  const next = doc.layers[Math.min(index, doc.layers.length - 1)];
  doc.activeLayerId = next.id;
  return true;
}

export function moveLayer(doc: ImageDocument, direction: 1 | -1): boolean {
  const index = getActiveLayerIndex(doc);
  const next = index + direction;
  if (next < 0 || next >= doc.layers.length) {
    return false;
  }
  const [layer] = doc.layers.splice(index, 1);
  doc.layers.splice(next, 0, layer);
  return true;
}

export function mergeDown(doc: ImageDocument): boolean {
  const index = getActiveLayerIndex(doc);
  if (index <= 0) {
    return false;
  }
  const upper = doc.layers[index];
  const lower = doc.layers[index - 1];
  if (upper.visible) {
    compositeLayer(lower.pixels, upper.pixels, upper.opacity, upper.blend);
  }
  doc.layers.splice(index, 1);
  doc.activeLayerId = lower.id;
  return true;
}

export function flattenLayers(doc: ImageDocument): void {
  const flat = flattenDocument(doc);
  const layer = createLayer(doc.width, doc.height, { name: "Background", pixels: flat });
  doc.layers = [layer];
  doc.activeLayerId = layer.id;
}

export function selectionSize(doc: ImageDocument): number {
  return doc.width * doc.height;
}

export function createSelectionMask(doc: ImageDocument, fill = 0): Uint8Array {
  const mask = new Uint8Array(selectionSize(doc));
  if (fill) {
    mask.fill(fill);
  }
  return mask;
}

export function selectAll(doc: ImageDocument): void {
  const mask = createSelectionMask(doc, 255);
  doc.selection = mask;
}

export function deselect(doc: ImageDocument): void {
  doc.selection = null;
}

export function invertSelection(doc: ImageDocument): void {
  if (!doc.selection) {
    selectAll(doc);
    return;
  }
  for (let i = 0; i < doc.selection.length; i++) {
    doc.selection[i] = doc.selection[i] ? 0 : 255;
  }
}

export function clampRect(doc: ImageDocument, rect: ImageRect): ImageRect {
  const x = Math.max(0, Math.min(doc.width, Math.round(rect.x)));
  const y = Math.max(0, Math.min(doc.height, Math.round(rect.y)));
  const x2 = Math.max(0, Math.min(doc.width, Math.round(rect.x + rect.w)));
  const y2 = Math.max(0, Math.min(doc.height, Math.round(rect.y + rect.h)));
  return {
    x: Math.min(x, x2),
    y: Math.min(y, y2),
    w: Math.abs(x2 - x),
    h: Math.abs(y2 - y),
  };
}

export function setSelectionRect(doc: ImageDocument, rect: ImageRect): void {
  const r = clampRect(doc, rect);
  if (r.w <= 0 || r.h <= 0) {
    doc.selection = null;
    return;
  }
  const mask = createSelectionMask(doc, 0);
  for (let y = r.y; y < r.y + r.h; y++) {
    for (let x = r.x; x < r.x + r.w; x++) {
      mask[y * doc.width + x] = 255;
    }
  }
  doc.selection = mask;
}

export function isSelected(doc: ImageDocument, x: number, y: number): boolean {
  if (!doc.selection) {
    return true;
  }
  return !!doc.selection[y * doc.width + x];
}

export function rgbaAt(pixels: Uint8ClampedArray, width: number, x: number, y: number): ImageRgba {
  const i = (y * width + x) * 4;
  return { r: pixels[i], g: pixels[i + 1], b: pixels[i + 2], a: pixels[i + 3] };
}
