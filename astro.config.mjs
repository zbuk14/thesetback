import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';

// Marks a <strong> that opens a paragraph ("**Land.** The lot costs...")
// so Part 2 pages can style it as a run-in head without also catching
// bold terms in the middle of a sentence.
function rehypeRunInHeads() {
  return (tree) => {
    const walk = (node) => {
      if (node.type === 'element' && node.tagName === 'p') {
        const first = (node.children ?? []).find((c) => !(c.type === 'text' && c.value.trim() === ''));
        if (first && first.type === 'element' && first.tagName === 'strong') {
          const existing = first.properties?.className ?? [];
          first.properties = { ...first.properties, className: [...existing, 'run-in'] };
        }
      }
      node.children?.forEach(walk);
    };
    walk(tree);
  };
}

export default defineConfig({
  site: 'https://thesetback.org',
  integrations: [react(), sitemap(), mdx()],
  markdown: {
    rehypePlugins: [rehypeRunInHeads],
  },
  image: {
    remotePatterns: [],
  },
});
