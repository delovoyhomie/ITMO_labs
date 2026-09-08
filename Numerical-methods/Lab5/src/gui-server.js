import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.PORT ?? 4175);
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json' };
const server = http.createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
    const resource = pathname === '/' ? 'web/index.html' : pathname.slice(1);
    const target = path.resolve(root, resource);
    if (!target.startsWith(root + path.sep) || !/^(web|src|examples)\//.test(resource)) {
      res.writeHead(403); res.end('Forbidden'); return;
    }
    const content = await fs.readFile(target);
    res.writeHead(200, { 'Content-Type': `${mime[path.extname(target)] ?? 'text/plain'}; charset=utf-8`, 'Cache-Control': 'no-store' });
    res.end(content);
  } catch (error) { res.writeHead(error.code === 'ENOENT' ? 404 : 400); res.end('Файл недоступен'); }
});
server.on('error', error => { console.error(`Ошибка сервера: ${error.message}`); process.exitCode = 1; });
server.listen(port, '127.0.0.1', () => console.log(`GUI доступен: http://127.0.0.1:${port}`));
