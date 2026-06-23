import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const outputDir = join(process.cwd(), 'dist', 'pages');

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });
await cp(join(process.cwd(), 'public'), outputDir, { recursive: true });
for (const filename of ['index.html', 'globe.html']) {
  const htmlPath = join(outputDir, filename);
  const html = await readFile(htmlPath, 'utf8');
  await writeFile(htmlPath, html.replace('window.WEATHERMESH_STATIC_PREVIEW = false;', 'window.WEATHERMESH_STATIC_PREVIEW = true;'));
}
await writeFile(join(outputDir, '.nojekyll'), '');
await cp(join(outputDir, 'index.html'), join(outputDir, '404.html'));

console.log(`Built GitHub Pages static preview at ${outputDir}`);
