// Imagens do Estudio de skins (modelos/skins.html) no Chrome headless em tempo real:
//   docs/skins/catalogo.jpg         folha unica com as 4 candidatas de cada nivel e a padrao
//   docs/skins/editor-retrato.png   o editor aberto (estampa da joaninha, nivel 4) a 390x844
//   docs/skins/editor-paisagem.png  o editor aberto (ladrilho de coracoes, nivel 10) a 1031x580
// Uso: node tools/prints-skins.mjs   (falha se a pagina tiver erro no console)
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { abrirChrome, espera } from './cdp.mjs';
import { servir, RAIZ } from './servir.mjs';

const PORTA = 5374;
const SAIDA = join(RAIZ, 'docs', 'skins');
mkdirSync(SAIDA, { recursive: true });
const fechar = await servir(PORTA);
const c = await abrirChrome({ largura: 1400, altura: 900, porta: 9374 });
const url = (q) => `http://127.0.0.1:${PORTA}/modelos/skins.html${q}`;

async function esperarPronto(ms = 30000) {
  const fim = Date.now() + ms;
  while (Date.now() < fim) {
    if ((await c.avaliar('document.title')) === 'PRONTO') return;
    await espera(200);
  }
  throw new Error('a pagina nao ficou pronta');
}

try {
  await c.ir(url('?folha'), 1500);
  await esperarPronto();
  const dados = await c.avaliar('window.__folha()');
  writeFileSync(join(SAIDA, 'catalogo.jpg'), Buffer.from(String(dados).split(',')[1], 'base64'));
  process.stdout.write('docs/skins/catalogo.jpg\n');

  for (const [nome, w, h, q] of [
    ['editor-retrato.png', 390, 844, '?editor&nivel=4&exemplo=joaninha'],
    ['editor-paisagem.png', 1031, 580, '?editor&nivel=10&exemplo=coracoes'],
  ]) {
    await c.tamanho(w, h);
    await c.ir(url(q), 1500);
    await esperarPronto();
    // a previa anima: espera um cutucao para o slime aparecer amassado
    await espera(1800);
    writeFileSync(join(SAIDA, nome), await c.print());
    process.stdout.write(`docs/skins/${nome}\n`);
  }
  if (c.erros.length) throw new Error('erros no console: ' + c.erros.join(' | '));
} finally {
  await c.fechar();
  await fechar();
}
