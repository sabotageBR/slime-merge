// Prints dos botoes de reforco (colados no pote, layout B escolhido em 2026-10-15) com os botoes
// em todos os estados (?demoReforcos), em retrato e paisagem, o Duelo em paisagem e a folha de
// icones (tools/icones.html). Saida em docs/visuais/reforcos-<LxA>.png, reforcos-duelo.png e
// icones.png (os mosaicos reforcos-comparar-* da escolha ficam como registro).
// Uso: node tools/prints-reforcos.mjs
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { shot, chrome } from './shot.mjs';
import { RAIZ, servir } from './servir.mjs';

const porta = 5375;
const fechar = await servir(porta);
const destino = join(RAIZ, 'docs/visuais');
mkdirSync(destino, { recursive: true });

const base = 'modelo=1&semente=3&auto=900&passos=900&lang=pt&semanuncio&demoReforcos';
for (const tam of ['360x640', '1031x580', '640x360']) {
  const saida = join(destino, `reforcos-${tam}.png`);
  await shot(porta, base, tam, saida, 2500);
  console.log('print', saida);
}
// Duelo em paisagem: a coluna fica a direita do pote da CPU
await shot(porta, 'modelo=5&semente=3&auto=900&passos=600&lang=pt&semanuncio', '1031x580', join(destino, 'reforcos-duelo.png'), 2500);
console.log('print', join(destino, 'reforcos-duelo.png'));

// folha de icones (tamanhos e estados)
const perfil = mkdtempSync(join(tmpdir(), 'slime-icones-'));
await chrome(['--headless=new', '--disable-gpu', '--hide-scrollbars', `--user-data-dir=${perfil}`, '--window-size=1000,640',
  '--virtual-time-budget=2500', `--screenshot=${join(destino, 'icones.png')}`, `http://127.0.0.1:${porta}/tools/icones.html`], 60000);
rmSync(perfil, { recursive: true, force: true });
console.log('icones', join(destino, 'icones.png'));
fechar();
