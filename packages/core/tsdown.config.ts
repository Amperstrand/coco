import { defineConfig } from 'tsdown';

export default defineConfig([
  {
    entry: [
      './index.ts',
      './adapter.ts',
      './plugin.ts',
      './operations/melt/index.ts',
      './operations/mint/index.ts',
    ],
    platform: 'neutral',
    target: 'esnext',
    format: ['esm'],
  },
]);
