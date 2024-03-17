import * as vite from 'vite'

export const jsxInJs: () => vite.Plugin = () => ({
  name: "jsx-in-js",
  async transform(code, id) {
    if (!id.match(/src\/.*\.js$/))  return null

    // Use the exposed transform from vite, instead of directly
    // transforming with esbuild
    return vite.transformWithEsbuild(code, id, {
      loader: 'jsx',
      jsx: 'automatic',
    })
  },
});
