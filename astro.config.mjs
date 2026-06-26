import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { loadEnv } from 'vite';
import { fileURLToPath } from 'url';
import tailwindcss from '@tailwindcss/vite'; // 👈 This is perfect! Keep it exactly like this.

// Import your markdown/rehype plugins
import remarkDirective from 'remark-directive';
import rehypeRaw from 'rehype-raw';

// Declare or import your toolbar if it is used below
const shikiToolbar = () => []; // Replace with your actual shiki toolbar import/function if you have one

// NOTE: rehype-sanitize is intentionally NOT added to markdown.rehypePlugins.
// hast-util-sanitize drops every node type it does not recognize, which includes
// MDX component elements (mdxJsxFlowElement). That silently strips imported
// components such as <Picture /> used inside .mdx posts. If you need to sanitize
// untrusted content, run it through a separate unified pipeline (remark-parse ->
// remark-rehype -> rehype-sanitize -> rehype-stringify) before it reaches MDX,
// not in the Astro markdown config.

// Placeholder for your sitemap exclusion logic
function isExcludedSitemapEntry(page) {
  return false;
}

// Load environment variables manually via Vite
const env = loadEnv(process.env.NODE_ENV || 'development', process.cwd(), '');
const siteUrl = env.SITE_URL || env.PUBLIC_SITE_URL;
const hasSiteUrl = !!siteUrl;

export default defineConfig({
  // 1. Core Config Options
  site: siteUrl || 'https://example.com', 
  output: process.env.NODE_ENV === 'production' ? 'static' : 'server',
  trailingSlash: 'ignore',

  // 2. Integrations
  integrations: [
    mdx(),
    ...(hasSiteUrl ? [sitemap({ filter: (page) => !isExcludedSitemapEntry(page) })] : [])
  ],

  // 3. Build & Assets Config
  build: {
    inlineStylesheets: 'auto'
  },
  
  image: {
    service: {
      entrypoint: 'astro/assets/services/sharp',
      config: {
        jxl: { quality: 75, effort: 7, lossless: false },
        avif: { quality: 60, effort: 4 },
        webp: { quality: 80, effort: 4 },
        jpeg: { quality: 82, mozjpeg: true }
      }
    },
    experimentalLayout: 'constrained'
  },

  // 4. Vite Settings
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    }
  },

  // 5. Markdown & Rehype/Remark Plugins
  markdown: {
    remarkPlugins: [remarkDirective],
    rehypePlugins: [rehypeRaw],
    shikiConfig: {
      themes: {
        light: 'github-light',
        dark: 'github-dark'
      },
      transformers: [shikiToolbar()]
    }
  }
}); // 👈 Only ONE closing brace at the very end now!