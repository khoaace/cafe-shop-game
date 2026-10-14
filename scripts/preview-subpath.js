// Local production-path QA only. No external publishing, no SPA fallback.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
const root = resolve('dist'), prefix = '/phin-goc-pho/';
createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === prefix.slice(0, -1)) { res.writeHead(302, { Location: prefix }); res.end(); return; }
    if (!url.pathname.startsWith(prefix)) { res.writeHead(404); res.end('Not found'); return; }
    const path = resolve(root, decodeURIComponent(url.pathname.slice(prefix.length)) || 'index.html');
    if (!path.startsWith(root + sep)) { res.writeHead(403); res.end(); return; }
    const content = await readFile(path), type = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' }[extname(path)] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type }); res.end(content);
  } catch { res.writeHead(404); res.end('Not found'); }
}).listen(4174, '127.0.0.1', () => console.log('Production subpath: http://127.0.0.1:4174/phin-goc-pho/'));
