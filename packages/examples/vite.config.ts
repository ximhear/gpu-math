import { defineConfig, type Plugin } from 'vite';
import { resolve } from 'path';
import { readFileSync } from 'fs';

function wgslPlugin(): Plugin {
  return {
    name: 'vite-plugin-wgsl',
    transform(code: string, id: string) {
      if (id.endsWith('.wgsl')) {
        const src = readFileSync(id, 'utf-8');
        return { code: `export default ${JSON.stringify(src)};`, map: null };
      }
    },
  };
}

export default defineConfig({
  plugins: [wgslPlugin()],
  resolve: {
    alias: {
      'gpu-math': resolve(__dirname, '../core/src/index.ts'),
    },
  },
});
