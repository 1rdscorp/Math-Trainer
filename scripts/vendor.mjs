// Copies third-party browser assets from node_modules into public/vendor so the
// app runs as plain static files with no build step and no CDN.
// Re-run with `npm run vendor` after upgrading katex or the font package.
import { cp, mkdir, readdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const from = (...p) => path.join(root, 'node_modules', ...p);
const to = (...p) => path.join(root, 'public', 'vendor', ...p);

await rm(to(), { recursive: true, force: true });

// KaTeX: script, stylesheet, licence and woff2 fonts (every supported browser reads woff2).
await mkdir(to('katex', 'fonts'), { recursive: true });
for (const f of ['katex.min.js', 'katex.min.css']) await cp(from('katex', 'dist', f), to('katex', f));
await cp(from('katex', 'LICENSE'), to('katex', 'LICENSE'));
for (const f of await readdir(from('katex', 'dist', 'fonts'))) {
  if (f.endsWith('.woff2')) await cp(from('katex', 'dist', 'fonts', f), to('katex', 'fonts', f));
}

// Atkinson Hyperlegible (SIL Open Font License): latin subset, regular + bold.
await mkdir(to('atkinson'), { recursive: true });
const font = '@fontsource/atkinson-hyperlegible';
for (const f of ['400-normal', '400-italic', '700-normal']) {
  await cp(from(font, 'files', `atkinson-hyperlegible-latin-${f}.woff2`), to('atkinson', `atkinson-hyperlegible-${f}.woff2`));
}
await cp(from(font, 'LICENSE'), to('atkinson', 'LICENSE'));

console.log('Vendored KaTeX and Atkinson Hyperlegible into public/vendor/');
