// Bancada da fisica (so Node, sem render): ms por quadro (4 subpassos) com o pote cheio, na
// pilha acordada e na pilha assentada. Meta do plano: ~2-4 ms num Android medio; no desktop,
// bem menos. Uso: node tools/bancada.mjs [particulas]
import { criarMundo } from '../src/fisica/mundo.js';
import { poteTrapezio } from '../src/fisica/paredes.js';
import { criarRng } from '../src/core/rng.js';
import { difundir } from '../src/cor/difusao.js';
import { criarCampo } from '../src/render/campo.js';

const alvo = Number(process.argv[2]) || 1600;
const m = criarMundo({ semente: 3 });
m.definirParedes(poteTrapezio());
const rng = criarRng(3);
const DIAM = [1.55, 1.79, 2.07, 2.39, 2.76, 3.19];
let k = 0;
while (m.n < alvo && k < 400) {
  m.criarSlime({ x: -3.5 + 7 * rng(), y: 12 + (k % 3), diametro: DIAM[k % DIAM.length] });
  for (let f = 0; f < 12; f++) { m.avancar(4); m.medir(1 / 60); }
  k++;
}
const campo = criarCampo({ janela: [-7.4, -1.2, 7.4, 15.2], celula: 0.085, raio: 0.48 });
function medir(rotulo, quadros) {
  let fis = 0;
  let cor = 0;
  let cam = 0;
  for (let f = 0; f < quadros; f++) {
    const a = performance.now();
    m.avancar(4);
    m.medir(1 / 60);
    const b = performance.now();
    difundir(m, 1 / 60);
    const c = performance.now();
    campo.acumular(m);
    const d = performance.now();
    fis += b - a; cor += c - b; cam += d - c;
  }
  const dorm = m.vivos().filter((s) => s.dormindo).length;
  process.stdout.write(`${rotulo.padEnd(10)} particulas ${m.n}  fisica ${(fis / quadros).toFixed(2)} ms  cor ${(cor / quadros).toFixed(2)} ms  campo ${(cam / quadros).toFixed(2)} ms  (${dorm}/${m.vivos().length} dormindo)\n`);
}
m.acordarTodos();
medir('acordada', 120);
for (let f = 0; f < 600; f++) { m.avancar(4); m.medir(1 / 60); }
medir('assentada', 120);
