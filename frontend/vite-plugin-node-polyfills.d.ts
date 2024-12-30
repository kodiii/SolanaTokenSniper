declare module 'vite-plugin-node-polyfills' {
  import { Plugin } from 'vite';
  
  interface NodePolyfillsOptions {
    globals?: {
      Buffer?: boolean;
      process?: boolean;
    };
  }

  export default function nodePolyfills(options?: NodePolyfillsOptions): Plugin;
}
