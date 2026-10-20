// O campo que anda com a camera (src/render/prototipos/campo-movel.js, so dos prototipos): o
// mundo deslocado de (dx, dy) tem de dar o mesmo campo que o mundo parado na janela local.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarMundo } from '../src/fisica/mundo.js';
import { criarCampo } from '../src/render/campo.js';
import { criarCampoMovel } from '../src/render/prototipos/campo-movel.js';
import { TINTAS } from '../src/cor/km.js';

function mundoEm(dy) {
  const m = criarMundo({ semente: 3, limites: [-16, -80, 16, 34] });
  m.criarSlime({ x: -2, y: 1 + dy, diametro: 2.4, pigmento: TINTAS.ciano });
  m.criarSlime({ x: 2.5, y: -1 + dy, diametro: 1.8, pigmento: TINTAS.magenta });
  m.gy = 0;
  m.avancar(4);
  m.medir(1 / 60);
  return m;
}

test('campo movel: o mundo deslocado da o mesmo campo que o parado', () => {
  const janela = [-6, -5, 6, 5];
  const parado = criarCampo({ janela, celula: 0.11, raio: 0.48 });
  parado.acumular(mundoEm(0));
  const base = criarCampo({ janela, celula: 0.11, raio: 0.48 });
  const movel = criarCampoMovel();
  const c = movel(base, 0, -40);
  c.acumular(mundoEm(-40));
  assert.deepEqual(c.janela, [-6, -45, 6, -35]);
  let soma = 0;
  for (let k = 0; k < parado.t0.length; k++) {
    assert.ok(Math.abs(parado.t0[k] - base.t0[k]) < 1e-4, `t0[${k}]`);
    assert.ok(Math.abs(parado.t1[k] - base.t1[k]) < 1e-4, `t1[${k}]`);
    soma += base.t0[k];
  }
  assert.ok(soma > 10, 'o campo tem slime');
});
