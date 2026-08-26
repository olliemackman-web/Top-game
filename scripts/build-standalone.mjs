// Bundles the game into ONE self-contained .html that runs from file:// with no
// server. ES modules need HTTP, so the offline build inlines everything instead.
//
//   npm i esbuild && node scripts/build-standalone.mjs
//
// Output: ironvale.html (open it by double-clicking)

import { build } from 'esbuild';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const out = await build({
  entryPoints: [resolve(root, 'src/main.js')],
  bundle: true,
  format: 'iife',
  target: 'es2020',
  write: false,
  legalComments: 'none',
});
const js = out.outputFiles[0].text;
const css = readFileSync(resolve(root, 'style.css'), 'utf8');

// Take the markup from index.html, minus the tags that need network or a server.
const html = readFileSync(resolve(root, 'index.html'), 'utf8');
const body = html.slice(html.indexOf('<div id="app">'), html.lastIndexOf('</div>') + 6);
const favicon = (html.match(/<link rel="icon"[^>]*>/) || [''])[0];

writeFileSync(resolve(root, 'ironvale.html'), `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>Ironvale — Village &amp; Siege</title>
${favicon}
<style>
${css}
</style>
</head>
<body>
${body}
<script>
${js}
</script>
</body>
</html>
`);
console.log('wrote ironvale.html');
