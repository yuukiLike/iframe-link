import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  platform: 'browser',
  target: 'es2015',  // 最大兼容性（esbuild 最低支持 ES2015）
  dts: true,
  clean: true,
  sourcemap: true,
  minify: false,
  noExternal: ['debug'],
  splitting: false
})
