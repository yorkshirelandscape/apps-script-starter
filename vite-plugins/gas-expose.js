/**
 * Author: Amit Agarwal (amit@labnol.org)
 * Description: This is a custom Vite plugin to expose the functions from the bundled IIFE module
 * to the global scope. This is necessary for Google Apps Script to call
 * functions like onOpen(e) or other custom functions directly.
 * @returns {import('vite').Plugin}
 */

/**
 * Finds the JSDoc comment (if any) immediately preceding a function's
 * declaration in the bundled code, so it can be copied onto the
 * generated global wrapper below. Apps Script's "Open in new tab"
 * library documentation view (and editor autocomplete) only reads
 * comments directly above an actual top-level global function - the
 * real JSDoc otherwise stays buried inside the IIFE, attached to a
 * differently-scoped inner function of the same name, and never
 * surfaces there at all.
 */
function extractJsDoc(code, fnName) {
  const escapedName = fnName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`\\bfunction\\s+${escapedName}\\s*\\(`, 'g');
  let match = pattern.exec(code);
  while (match) {
    const before = code.slice(0, match.index);
    // A doc comment's own example code can itself contain text like
    // "function onOpen() {...}" - skip any match that falls inside a
    // still-open comment block (JSDoc or not) rather than at a real
    // declaration.
    const insideComment = before.lastIndexOf('/*') > before.lastIndexOf('*/');
    if (!insideComment) {
      const trimmedBefore = before.replace(/\s+$/, '');
      if (trimmedBefore.endsWith('*/')) {
        // Block comments can't nest, so the nearest preceding "/*" is
        // necessarily this comment's own opener - not just any
        // earlier "/**", which could belong to a different JSDoc
        // separated from this function by an intervening plain
        // (non-JSDoc) comment, e.g. a bundler-inserted "/* @__PURE__ */".
        const commentStart = trimmedBefore.lastIndexOf('/*');
        if (commentStart !== -1 && trimmedBefore.startsWith('/**', commentStart)) {
          return trimmedBefore.slice(commentStart);
        }
      }
      return null;
    }
    match = pattern.exec(code);
  }
  return null;
}

const viteExposeGasFunctions = () => ({
  name: 'vite-expose-gas-functions',
  generateBundle(options, bundle) {
    const entryChunk = Object.values(bundle).find((chunk) => chunk.type === 'chunk' && chunk.isEntry);
    if (entryChunk?.exports?.length > 0) {
      const exposureCode = entryChunk.exports
        .map((fnName) => {
          const wrapper = `function ${fnName}(...args) { return ${options.name}.${fnName}(...args); }`;
          const jsdoc = extractJsDoc(entryChunk.code, fnName);
          return jsdoc ? `${jsdoc.replace(/^\t+/gm, '')}\n${wrapper}` : wrapper;
        })
        .join('\n');
      entryChunk.code += `\n\n${exposureCode}`;
    }
  },
});

export default viteExposeGasFunctions;
export { extractJsDoc };
