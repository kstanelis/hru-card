import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';

export default {
  input: 'src/hru-card.ts',
  output: { file: 'dist/hru-card.js', format: 'es', inlineDynamicImports: true },
  plugins: [
    resolve(),
    typescript({ noEmit: false, declaration: false, include: ['src/**/*.ts'] }),
    terser(),
  ],
};
