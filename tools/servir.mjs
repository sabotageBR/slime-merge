// Servidor estatico minimo (sem dependencias) para jogar e para as ferramentas de teste.
// Uso direto: node tools/servir.mjs [porta] [--lan]
//   porta padrao 5370, so 127.0.0.1; com --lan escuta em 0.0.0.0 e mostra o endereco
//   para abrir no celular pela mesma Wi-Fi.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { networkInterfaces } from 'node:os';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const RAIZ = fileURLToPath(new URL('..', import.meta.url));
const TIPOS = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8', '.svg': 'image/svg+xml',
};

/** @param {number} porta @param {string} [host] @returns {Promise<() => Promise<void>>} fecha o servidor */
export function servir(porta, host = '127.0.0.1') {
  const srv = createServer(async (req, res) => {
    try {
      const caminho = decodeURIComponent(new URL(req.url || '/', 'http://x').pathname);
      let arq = normalize(join(RAIZ, caminho));
      if (!arq.startsWith(resolve(RAIZ))) throw new Error('fora');
      if ((await stat(arq)).isDirectory()) arq = join(arq, 'index.html');
      const corpo = await readFile(arq);
      res.writeHead(200, { 'content-type': TIPOS[extname(arq)] || 'application/octet-stream', 'cache-control': 'no-store' });
      res.end(corpo);
    } catch {
      res.writeHead(404);
      res.end('404');
    }
  });
  return new Promise((ok, falha) => {
    srv.once('error', falha);
    srv.listen(porta, host, () => ok(() => new Promise((r) => srv.close(() => r()))));
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const lan = args.includes('--lan');
  const porta = Number(args.find((a) => /^\d+$/.test(a))) || 5370;
  await servir(porta, lan ? '0.0.0.0' : '127.0.0.1');
  process.stdout.write(`Slime Merge em http://127.0.0.1:${porta}/  (hub: /modelos/)\n`);
  if (lan) {
    for (const lista of Object.values(networkInterfaces())) {
      for (const n of lista || []) {
        if (n.family === 'IPv4' && !n.internal) process.stdout.write(`  no celular: http://${n.address}:${porta}/\n`);
      }
    }
  }
}
