import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { FlattenTransform } from ".";

async function expectTransform(
  maxNestingLevel: number,
  sourceItems: readonly unknown[],
  expectedItems: readonly unknown[]
): Promise<void> {
  const actualItems: unknown[] = [];

  const flattenTransform = new FlattenTransform({
    maxNestingLevel: maxNestingLevel
  }).on("data", item => actualItems.push(item));

  await pipeline(Readable.from(sourceItems), flattenTransform);

  expect(actualItems).toEqual(expectedItems);
}

describe("Flattening transform", () => {
  describe("constructor", () => {
    describe("when the max nesting level is < 0", () => {
      it("should throw", () => {
        expect(() => {
          new FlattenTransform({ maxNestingLevel: -7 });
        }).toThrow("Invalid max nesting level: -7");
      });
    });

    describe("when the max nesting level is omitted", () => {
      it("should be set to Infinity", () => {
        const transform = new FlattenTransform();
        expect((transform as any).maxNestingLevel).toBe(Infinity);
      });
    });
  });
  describe("when there is no input", () => {
    describe.each([0, 1, 2, Infinity])(
      "when the max nesting level is %s",
      maxNestingLevel => {
        it("should output no items", () =>
          expectTransform(maxNestingLevel, [], []));
      }
    );
  });

  describe("when the input consists of arrays of numbers", () => {
    describe("when the array is flat", () => {
      const inputArray = [90, 92, 95];

      describe.each([0, 1, 2, Infinity])(
        "when the max nesting level is %s",
        maxNestingLevel => {
          it("should return the same items as the flat array", () =>
            expectTransform(maxNestingLevel, inputArray, inputArray));
        }
      );
    });

    describe("when the array has at most 1 level of nesting", () => {
      const inputArray = [90, [92, 95], 98];

      describe.each([
        [0, [90, [92, 95], 98]],
        [1, [90, 92, 95, 98]],
        [2, [90, 92, 95, 98]],
        [Infinity, [90, 92, 95, 98]]
      ])(
        "when the max nesting level is %s",
        (maxNestingLevel, expectedItems) => {
          it("should flatten as expected", () =>
            expectTransform(maxNestingLevel, inputArray, expectedItems));
        }
      );
    });

    describe("when the array has at most 2 levels of nesting", () => {
      const inputArray = [90, [92, [95, 97]], [[98], 99]];

      describe.each([
        [0, [90, [92, [95, 97]], [[98], 99]]],
        [1, [90, 92, [95, 97], [98], 99]],
        [2, [90, 92, 95, 97, 98, 99]],
        [Infinity, [90, 92, 95, 97, 98, 99]]
      ])(
        "when the max nesting level is %s",
        (maxNestingLevel, expectedItems) => {
          it("should flatten as expected", () =>
            expectTransform(maxNestingLevel, inputArray, expectedItems));
        }
      );
    });

    describe("when the array has at most 3 levels of nesting", () => {
      const inputArray = [
        90,
        [92, [95, [101, 200], 97]],
        [[98], 99, [473, [500]]]
      ];

      describe.each([
        [0, [90, [92, [95, [101, 200], 97]], [[98], 99, [473, [500]]]]],
        [1, [90, 92, [95, [101, 200], 97], [98], 99, [473, [500]]]],
        [2, [90, 92, 95, [101, 200], 97, 98, 99, 473, [500]]],
        [Infinity, [90, 92, 95, 101, 200, 97, 98, 99, 473, 500]]
      ])(
        "when the max nesting level is %s",
        (maxNestingLevel, expectedItems) => {
          it("should flatten as expected", () =>
            expectTransform(maxNestingLevel, inputArray, expectedItems));
        }
      );
    });
  });

  describe("when the input contains different element types", () => {
    const yogi = { type: "bear", name: "Yogi", age: 36 };
    it("should flatten as expected", () =>
      expectTransform(
        Infinity,
        [90, [yogi, [[92], ["Test"]], 98.5]],
        [90, yogi, 92, "Test", 98.5]
      ));
  });

  describe("when the input consists of different iterables", () => {
    const testMap = new Map([["Ciop", 32]]);

    it("should flatten as expected", () =>
      expectTransform(
        Infinity,
        [
          [
            new Set([90]),
            testMap.keys(),
            [testMap.values(), [testMap.entries()]]
          ],
          [92, [new Uint8Array([95])]],
          98
        ],
        [90, "Ciop", 32, "Ciop", 32, 92, 95, 98]
      ));
  });
});
