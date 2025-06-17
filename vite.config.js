import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        standing: 'standing.html',
        decay: 'decay.html',
        complex_z: 'complex_z.html',
        complex_z2: 'complex_z2.html',
        complex_z3: 'complex_z3.html'
      },
    },
  },
});