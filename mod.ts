
import {
  Transform,
  TransformOptions,
  Buffer,
} from "./deps.ts";

export interface BlockOptions extends TransformOptions {
  size?: number,
  nopad?: boolean,
  zeroPadding: boolean,
}

// deno-lint-ignore no-explicit-any
export type TransformCallback = (error?: Error | null, data?: any) => void;

class BlockStream2 extends Transform {
  
  size: number;
  #zeroPadding: boolean;
  #buffered: Buffer[]|null;
  #bufferedBytes: number;
  
  constructor (size: number, opts: BlockOptions = { zeroPadding: true }) {
    super(opts)

    if (typeof size === 'object') {
      opts = size
      size = opts.size || 0;
    }

    this.size = size || 512

    const { nopad, zeroPadding = true } = opts

    if (nopad) this.#zeroPadding = false
    else this.#zeroPadding = !!zeroPadding

    this.#buffered = []
    this.#bufferedBytes = 0
  }

  _transform (buf: Buffer, _encoding: unknown/** BufferEncoding */, next: TransformCallback) {
    this.#bufferedBytes += buf.length
    this.#buffered?.push(buf)

    while (this.#bufferedBytes >= this.size) {
      this.#bufferedBytes -= this.size

      // Assemble the buffers that will compose the final block
      const blockBufs = []
      let blockBufsBytes = 0
      while (blockBufsBytes < this.size) {
        const b = this.#buffered?.shift() as Buffer;

        if (blockBufsBytes + b.length <= this.size) {
          blockBufs.push(b)
          blockBufsBytes += b.length
        } else {
          // If the last buffer is larger than needed for the block, just
          // use the needed part
          const neededSize = this.size - blockBufsBytes
          blockBufs.push(b.slice(0, neededSize))
          blockBufsBytes += neededSize
          this.#buffered?.unshift(b.slice(neededSize))
        }
      }

      // Then concat just those buffers, leaving the rest untouched in #buffered
      this.push(Buffer.concat(blockBufs, this.size))
    }
    next()
  }

  _flush () {
    if (this.#bufferedBytes && this.#zeroPadding) {
      const zeroes = Buffer.alloc(this.size - this.#bufferedBytes)
      this.#buffered?.push(zeroes)
      this.push(Buffer.concat(this.#buffered || [ ]))
      this.#buffered = null
    } else if (this.#bufferedBytes) {
      this.push(Buffer.concat(this.#buffered || [ ]))
      this.#buffered = null
    }
    this.push(null)
  }
}

export { BlockStream2 }