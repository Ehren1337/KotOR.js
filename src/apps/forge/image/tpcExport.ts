/**
 * TPC buffer writer from display-space RGBA + TXI text.
 *
 * @file tpcExport.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import { BinaryWriter } from "@/utility/binary/BinaryWriter";
import { ENCODING } from "@/enums/graphics/tpc/Encoding";
import { PixelFormat } from "@/enums/graphics/tpc/PixelFormat";
import type { ITPCHeader } from "@/interface/resource/ITPCHeader";
import { TPCObject } from "@/resource/TPCObject";
import { hasMeaningfulAlpha } from "@/apps/forge/image/imageIo";
import { resizeBilinear } from "@/apps/forge/image/imageOps";
import type { ImageEncodePolicy } from "@/apps/forge/image/imageTypes";
// @ts-ignore
import * as dxtJs from "dxt-js";

const TPC_HEADER_LENGTH = 128;

function mipDimensions(width: number, height: number, policy: ImageEncodePolicy): { width: number; height: number }[] {
  const count = policy.mipPolicy === "single-level"
    ? 1
    : TPCObject.generateMipMapCountForDimensions(width, height);
  const levels: { width: number; height: number }[] = [];
  let w = width;
  let h = height;
  for (let i = 0; i < count; i++) {
    levels.push({ width: w, height: h });
    w = Math.max(w >> 1, 1);
    h = Math.max(h >> 1, 1);
  }
  return levels;
}

export function buildTpcExportBuffer(
  rgba: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
  txiText: string,
  policy: ImageEncodePolicy,
): Uint8Array {
  const level0 = new Uint8Array(rgba);
  const hasAlpha = hasMeaningfulAlpha(level0, policy);
  const encoding = hasAlpha ? ENCODING.RGBA : ENCODING.RGB;
  const dxtFormat = hasAlpha ? dxtJs.flags.DXT5 : dxtJs.flags.DXT1;
  const mipLevels = mipDimensions(width, height, policy);
  const compressedLevels: Uint8Array[] = [];

  for (const level of mipLevels) {
    const mip = resizeBilinear(level0, width, height, level.width, level.height);
    const compressed = dxtJs.compress(new Uint8Array(mip), level.width, level.height, dxtFormat);
    compressedLevels.push(new Uint8Array(compressed));
  }

  const mipMapCount = compressedLevels.length;
  const minDataSize = encoding == ENCODING.RGB ? 8 : 16;
  const dataSize = TPCObject.getCompressedMipByteLength(width, height, encoding);
  const header: ITPCHeader = {
    dataSize,
    alphaTest: 1.0,
    width,
    height,
    encoding,
    mipMapCount,
    bytesPerPixel: 4,
    bitsPerPixel: 32,
    minDataSize,
    compressed: true,
    hasAlpha,
    format: hasAlpha ? PixelFormat.DXT5 : PixelFormat.DXT1,
    isCubemap: false,
    faces: 1,
  };

  const writer = new BinaryWriter(new Uint8Array(0));
  writer.writeUInt32(header.dataSize);
  writer.writeSingle(header.alphaTest);
  writer.writeUInt16(header.width);
  writer.writeUInt16(header.height);
  writer.writeUInt8(header.encoding);
  writer.writeUInt8(header.mipMapCount);
  while (writer.tell() < TPC_HEADER_LENGTH) {
    writer.writeUInt8(0);
  }
  for (const mip of compressedLevels) {
    writer.writeBytes(mip);
  }
  const txi = (txiText || "").trim();
  if (txi.length) {
    writer.writeStringNullTerminated(`${txi}\n`);
  }
  return writer.buffer;
}
