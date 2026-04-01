/** Wrapper to avoid TS 5.9 Float32Array<ArrayBufferLike> vs ArrayBuffer incompatibility */
export function writeBuffer(queue: GPUQueue, buffer: GPUBuffer, offset: number, data: Float32Array): void {
  queue.writeBuffer(buffer, offset, data.buffer, data.byteOffset, data.byteLength);
}
