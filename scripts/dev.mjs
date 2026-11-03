import './build.mjs';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
const root = path.resolve('dist');
const portIndex = process.argv.indexOf('--port');
const port = Number(portIndex >= 0 ? process.argv[portIndex + 1] : process.env.PORT || 5173);
const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml'};
http.createServer(async (req,res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    const data = await readFile(file);
    res.writeHead(200, {'Content-Type':mime[path.extname(file)] || 'application/octet-stream','Cache-Control':'no-store'}).end(data);
  } catch { res.writeHead(404).end('Not found'); }
}).listen(port, '0.0.0.0', () => console.log(`Local preview ready on port ${port}`));
