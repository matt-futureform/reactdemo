import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import salesforce from '@salesforce/vite-plugin-ui-bundle';

export default defineConfig({
  root: 'src',
  plugins: [react(), salesforce()],
  base: './',
  build: {
    // Build directly to bundle root so sf project deploy finds content without a copy step.
    // emptyOutDir:false because outDir is outside root; prebuild script cleans old assets/.
    outDir: '../',
    emptyOutDir: false,
  },
});
