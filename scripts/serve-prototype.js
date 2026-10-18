import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, sep } from 'node:path';

const root = resolve(fileURLToPath(new URL('../prototype/', import.meta.url)));
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };
const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://127.0.0.1:4173');
    const relative = decodeURIComponent(url.pathname).replace(/^\/(?:prototype\/)?/, '') || 'probe.html';
    const path = resolve(root, relative);
    const extension = path.slice(path.lastIndexOf('.'));
    if (!['GET', 'HEAD'].includes(request.method) || !path.startsWith(`${root}${sep}`) ||
        !mime[extension] || relative.split(/[\\/]/).some(part => part.startsWith('.'))) {
      response.writeHead(404); response.end(); return;
    }
    const content = await readFile(path);
    response.writeHead(200, { 'Content-Type': `${mime[extension]}; charset=utf-8`,
      'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    response.end(request.method === 'HEAD' ? undefined : content);
  } catch { response.writeHead(404); response.end(); }
});
server.listen(4173, '127.0.0.1', () => console.log('Prototype: http://127.0.0.1:4173/'));
