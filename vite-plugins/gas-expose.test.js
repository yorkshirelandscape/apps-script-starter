import { extractJsDoc } from './gas-expose.js';

describe('extractJsDoc', () => {
  it('finds a JSDoc comment immediately preceding the function', () => {
    const code = `
/**
 * Does a thing.
 */
function doThing() {}
`;

    expect(extractJsDoc(code, 'doThing')).toBe('/**\n * Does a thing.\n */');
  });

  it('returns null when the function has no preceding comment', () => {
    const code = `
function doThing() {}
`;

    expect(extractJsDoc(code, 'doThing')).toBeNull();
  });

  it('returns null when the function exists but only unrelated code precedes it', () => {
    const code = `
const x = 1;
function doThing() {}
`;

    expect(extractJsDoc(code, 'doThing')).toBeNull();
  });

  it("skips a match inside another function's doc comment example code and finds the real declaration", () => {
    // Regression test: a JSDoc block that itself contains example code
    // like "function onOpen() {...}" used to make extractJsDoc match
    // that embedded text instead of the real declaration below it.
    const code = `
/**
 * Setup instructions:
 *   function onOpen() { Foo.onOpen(); }
 *   function doThing() { Foo.doThing(); }
 */
function setup() {}

/**
 * The real doc comment for doThing.
 */
function doThing() {}
`;

    expect(extractJsDoc(code, 'doThing')).toBe('/**\n * The real doc comment for doThing.\n */');
    expect(extractJsDoc(code, 'onOpen')).toBeNull();
  });

  it('returns null for a function whose name does not appear at all', () => {
    const code = `function somethingElse() {}`;

    expect(extractJsDoc(code, 'doThing')).toBeNull();
  });
});
