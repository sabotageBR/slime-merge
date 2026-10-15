// Prints das alternativas de visual (cestos, cenarios, objetos) na mesma partida (semente e bot
// iguais), para comparar lado a lado. Saida em docs/visuais/<categoria>-<id>.jpg
// Uso: node tools/prints-visuais.mjs [cestos|cenarios|objetos] [--miniaturas]
//   --miniaturas: miniaturas quadradas (webp 128 px) da Loja do jogo em src/ui/loja/
import { mkdirSync, rmSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { servir, RAIZ } from './servir.mjs';
import { shot } from './shot.mjs';
import { CESTOS } from '../src/jogo/cestos.js';

const lerIds = (arq, nome) => {
  const t = readFileSync(join(RAIZ, arq), 'utf8');
  const bloco = t.slice(t.indexOf(`export const ${nome}`));
  return [...bloco.slice(0, bloco.indexOf('];')).matchAll(/id: '([a-z]+)'/g)].map((m) => m[1]);
};
const CATS = {
  cestos: { ids: CESTOS.map((c) => c.id), q: (id) => `cesto=${id}`, zoom: '' },
  cenarios: { ids: lerIds('src/render/cenarios.js', 'CENARIOS'), q: (id) => `cenario=${id}`, zoom: '' },
  objetos: { ids: lerIds('src/render/rostos.js', 'OBJETOS'), q: (id) => `objeto=${id}&vitrine=4&semhud`, zoom: '&zoom=-5.2,-0.4,5.2,10.6' },
};
const MINI = process.argv.includes('--miniaturas');
const pedidas = process.argv.slice(2).filter((a) => !a.startsWith('--'));
// recorte quadrado de cada categoria nas miniaturas (no print 390x700 sem HUD)
const RECORTE = { cestos: 'crop=330:330:30:200', cenarios: 'crop=390:390:0:40', objetos: 'crop=500:500:140:0' };
const GRUPO = { cestos: 'cesto', cenarios: 'cenario', objetos: 'objeto' };
const porta = 5376;
const fechar = await servir(porta);
const pasta = join(RAIZ, MINI ? 'src/ui/loja' : 'docs/visuais');
mkdirSync(pasta, { recursive: true });
const tmp = join(RAIZ, '.tmp/visuais');
rmSync(tmp, { recursive: true, force: true });
mkdirSync(tmp, { recursive: true });
for (const [cat, def] of Object.entries(CATS)) {
  if (pedidas.length && !pedidas.includes(cat)) continue;
  for (const id of def.ids) {
    const png = join(tmp, `${cat}-${id}.png`);
    const passos = cat === 'objetos' ? 150 : 1500;
    const auto = cat === 'objetos' ? '' : '&auto=900';
    await shot(porta, `modelo=1&semente=3${auto}&passos=${passos}&lang=pt&${def.q(id)}${def.zoom}${MINI ? '&semhud' : ''}`, '390x700', png, 3000);
    // objetos: recorta a pilha e amplia (o rosto e o que se compara)
    const filtro = cat === 'objetos' ? ['-vf', 'crop=390:250:0:305,scale=780:500:flags=lanczos'] : [];
    if (MINI) {
      const base = cat === 'objetos' ? ['-vf', 'crop=390:250:0:305,scale=780:500:flags=lanczos,' + RECORTE[cat] + ',scale=128:128'] : ['-vf', RECORTE[cat] + ',scale=128:128'];
      execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', png, ...base, '-quality', '72', join(pasta, `${GRUPO[cat]}-${id}.webp`)]);
    } else {
      execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', png, ...filtro, '-q:v', '3', join(pasta, `${cat}-${id}.jpg`)]);
    }
    process.stdout.write(`${cat}-${id} `);
  }
}
process.stdout.write('\n');
await fechar();
