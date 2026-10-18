// Parametros de teste na URL. So valem em file://, localhost, 127.0.0.1 e na rede local
// (192.168.x, 10.x: o celular do autor pela Wi-Fi). Na Poki nada disso existe.
// Unico modulo que le a URL (vigiado por test/estilo.test.js).
//   ?modelo=1..5|lab   qual prototipo abre (sem ele: o 1, Merge Lab)
//   ?debug             painel de desempenho (ms de fisica e de render, particulas) e sliders no lab
//   ?semente=123       semente fixa da partida (prints e GIFs reprodutiveis)
//   ?passos=600        roda N quadros de fisica antes do primeiro desenho (prints deterministicos)
//   ?auto=700          joga sozinho (uma acao a cada N ms)
//   ?semanuncio        nao pede intervalo comercial
//   ?lang=pt           forca o idioma (en, pt, es)
//   ?semhud            esconde o HUD (thumb, GIF)
//   ?render=2d         forca o renderizador de reserva (Canvas 2D)
//   ?material=goo      material do lab
//   ?raio=0.5&limiar=0.8   nucleo e limiar do campo do slime (ajuste do render)
//   ?zoom=x0,y0,x1,y1  enquadra so esse retangulo do mundo (prints de detalhe)
//   ?cesto=aquario&cenario=mar&objeto=kawaii   visual (src/jogo/cestos.js, render/cenarios.js, render/rostos.js)
//   ?vitrine=1..6      Merge Lab com niveis no pote (1: 7 a 10 e o coringa; 2: 12; 3: 11; 4: 1 a 7; 5: 13; 6: 14)
//   ?filme=120&cada=4  grava 120 quadros (4 passos de fisica entre eles) em <pre id="filme">
//                      para tools/gif-modelos.mjs (deterministico, sem depender do rAF)
//   ?bot=borda         o ?auto solta sempre em cima da borda, alternando os lados
//   ?poder=alargar     usa o reforco depois do ?passos (prints do Alargar, da mira armada...)
//   ?expr=choro        forca a expressao de todos os rostos (prints dos personagens; tambem contente,
//                      amassado, chorinho, apatico, furioso, feliz, medo, tonto, bravo)
//   ?demoReforcos      os botoes em todos os estados (prints): acabado com video, 2, premio
//   ?skins=todas       uma skin pronta equipada em cada nivel (medir o shader no celular), so na partida
//   ?sons=fusao:bolha,musica:lofi   variantes do Estudio de sons (src/som/catalogo.js)
//   ?qualidade=0..3    fixa a qualidade do render (alta, media, baixa, minima) e desliga a adaptativa
//   ?revelar=7         cartao de slime novo do nivel 7 parado na tela (prints)
//   ?pressao=0         sem fim sem a pressao da 2.0.0 (escada, eventos e o "Ufa!" permanente), para comparar
//   ?evento=gosma      o primeiro evento da agenda e esse, ja (coringas, gosma, pedido, terremoto, gigante, calor, gelo)
//
// Fora disso, so o banco de testes de tools/sdkcheck.html liga os ganchos
// (window.__slimeTeste = { modelo }); "local" continua falso, para o jogo se comportar
// como na Poki (sem premio sem SDK).

export function lerDepuracao() {
  const base = {
    local: false, ganchos: false, modelo: '', debug: false, semente: 0, passos: 0, auto: 0,
    semAnuncio: false, lang: '', semHud: false, render: '', material: '', raio: 0, limiar: 0, zoom: null,
    filme: 0, cada: 4, vitrine: 0, cesto: '', cenario: '', objeto: '', bot: '', poder: '', expr: '', demoReforcos: false, skins: '', qualidade: -1, revelar: 0, pressao: true, evento: '', sons: /** @type {Record<string, string>} */ ({}),
  };
  let local = false;
  try {
    local = location.protocol === 'file:'
      || /^(127\.0\.0\.1|localhost|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+)$/.test(location.hostname);
  } catch {
    local = false;
  }
  const teste = /** @type {any} */ (globalThis).__slimeTeste;
  if (!local && teste && typeof teste === 'object') {
    return Object.assign(base, { ganchos: true, modelo: String(teste.modelo || '') });
  }
  if (!local) return base;
  const q = new URLSearchParams(location.search || location.hash.slice(1));
  const num = (k, d) => (q.has(k) ? Number(q.get(k)) || d : 0);
  return Object.assign(base, {
    local: true,
    ganchos: true,
    modelo: q.get('modelo') || '',
    debug: q.has('debug'),
    semente: num('semente', 1) >>> 0,
    passos: Math.max(0, num('passos', 0) | 0),
    auto: q.has('auto') ? Math.max(120, num('auto', 700)) : 0,
    semAnuncio: q.has('semanuncio'),
    lang: q.get('lang') || '',
    semHud: q.has('semhud'),
    render: q.get('render') || '',
    material: q.get('material') || '',
    raio: Number(q.get('raio')) || 0,
    limiar: Number(q.get('limiar')) || 0,
    zoom: q.has('zoom') ? (q.get('zoom') || '').split(',').map(Number) : null,
    filme: Math.max(0, num('filme', 0) | 0),
    cada: Math.max(1, num('cada', 4) | 0),
    vitrine: q.has('vitrine') ? Number(q.get('vitrine')) || 1 : 0,
    cesto: q.get('cesto') || '',
    cenario: q.get('cenario') || '',
    objeto: q.get('objeto') || '',
    bot: q.get('bot') || '',
    poder: q.get('poder') || '',
    expr: q.get('expr') || '',
    demoReforcos: q.has('demoReforcos'),
    skins: q.get('skins') || '',
    qualidade: q.has('qualidade') ? Math.max(0, Math.min(3, Number(q.get('qualidade')) | 0)) : -1,
    revelar: Math.max(0, Math.min(14, num('revelar', 7) | 0)),
    pressao: q.get('pressao') !== '0',
    evento: q.get('evento') || '',
    sons: Object.fromEntries((q.get('sons') || '').split(',').filter((p) => p.includes(':')).map((p) => p.split(':'))),
  });
}
