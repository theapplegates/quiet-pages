import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import tailwindcss from "@tailwindcss/vite";

const site =
  process.env.SITE_URL || process.env.PUBLIC_SITE_URL || "https://quiet.paulapplegate.com";

export default defineConfig({
  site,
  integrations: [mdx()],
vite: {
    plugins: [tailwindcss()],
    ssr: {
      // Prevents Vite from parsing internal relative paths in the package during SSR/Build
      noExternal: ['astro-cloudinary', '@radix-ui/*']
    },
    optimizeDeps: {
      // Prevents Vite from pre-bundling the package during static entrypoint building
      exclude: ['astro-cloudinary']
    },
    build: {
      cssMinify: true,
      minify: 'esbuild'
    }
  },