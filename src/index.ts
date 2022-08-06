import { Transform, TransformCallback } from "node:stream";

export type FlattenTransformOptions = Readonly<{
  maxNestingLevel?: number;
  highWaterMark?: number;
  signal?: AbortSignal;
}>;

export class FlattenTransform extends Transform {
  private readonly maxNestingLevel: number;

  constructor(options?: FlattenTransformOptions) {
    super({
      objectMode: true,
      highWaterMark: options?.highWaterMark,
      signal: options?.signal
    });

    const maxNestingLevel = options?.maxNestingLevel ?? Infinity;

    if (maxNestingLevel < 0) {
      throw new Error(`Invalid max nesting level: ${maxNestingLevel}`);
    }

    this.maxNestingLevel = maxNestingLevel;
  }

  override _transform(
    chunk: any,
    _encoding: BufferEncoding,
    callback: TransformCallback
  ): void {
    this.flatten(chunk, 0);

    callback();
  }

  private flatten(item: any, nestingLevel: number): void {
    if (
      nestingLevel == this.maxNestingLevel ||
      typeof item != "object" ||
      item == null ||
      !(Symbol.iterator in item)
    ) {
      this.push(item);
      return;
    }

    for (const subItem of item) {
      this.flatten(subItem, nestingLevel + 1);
    }
  }
}
