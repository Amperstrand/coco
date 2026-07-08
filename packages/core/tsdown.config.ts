import { defineConfig } from 'tsdown';
export default defineConfig([
  { entry: ['./index.ts'], platform: 'neutral', target: 'esnext', format: ['esm'],
    external: ['@cashu/cashu-ts', '@noble/curves', '@noble/hashes', '@scure/bip32', '@scure/base'] },
  { entry: ['./adapter.ts'], platform: 'neutral', target: 'esnext', format: ['esm'],
    external: ['@cashu/cashu-ts', '@noble/curves', '@noble/hashes', '@scure/bip32', '@scure/base'] },
  { entry: ['./plugin.ts'], platform: 'neutral', target: 'esnext', format: ['esm'] },
]);
