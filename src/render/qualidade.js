// Qualidade adaptativa do render. Os QUALIDADES da cena (alta, media, baixa) existiam, mas nada
// trocava o nivel: o celular fraco desenhava sempre em dpr 2 e celula fina, e o custo cresce
// com o pote cheio (Player Fit Test de 2026-10-15: no celular, quem passava de 5 min saia bem
// mais que no desktop). Aqui se mede o fps de verdade em janelas de 1 s e o nivel desce um
// degrau quando o aparelho fica abaixo do limite por algumas janelas seguidas. So desce: subir
// de novo faria a resolucao piscar. Logica pura (o dt entra de fora).

/**
 * @param {{ limite?: number, janelas?: number, aquecer?: number, niveis?: number, inicial?: number }} [o]
 *   limite: fps minimo; janelas: quantas janelas de 1 s seguidas abaixo dele para descer;
 *   aquecer: s ignorados ao comecar e depois de descer ou voltar da pausa (shader compilando,
 *   canvas novo); niveis: quantos degraus existem; inicial: o degrau do comeco
 */
export function criarQualidade(o = {}) {
  const limite = o.limite ?? 48;
  const janelas = o.janelas ?? 3;
  const aquecer = o.aquecer ?? 2;
  const ultimo = (o.niveis ?? 3) - 1;
  let nivel = Math.max(0, Math.min(ultimo, o.inicial ?? 0));
  let t = 0;
  let quadros = 0;
  let ruins = 0;
  let espera = aquecer;
  let fps = 0;

  return {
    /** 0 alta, 1 media, 2 baixa */
    get nivel() { return nivel; },
    /** fps da ultima janela fechada (0 antes da primeira) */
    get fps() { return fps; },
    /**
     * Um quadro desenhado com o jogo rodando.
     * @param {number} dt s reais desde o quadro anterior
     * @returns {boolean} true quando o nivel acabou de descer
     */
    quadro(dt) {
      // aba escondida ou o laco parado: o intervalo nao diz nada do aparelho
      if (!(dt > 0) || dt > 0.25) return false;
      if (espera > 0) { espera -= dt; return false; }
      t += dt;
      quadros++;
      if (t < 1) return false;
      fps = quadros / t;
      t = 0;
      quadros = 0;
      ruins = fps < limite ? ruins + 1 : 0;
      if (ruins < janelas || nivel >= ultimo) return false;
      nivel++;
      ruins = 0;
      espera = aquecer;
      return true;
    },
    /** Pausa, menu, anuncio: a proxima janela comeca do zero (com aquecimento). */
    reiniciar() {
      t = 0;
      quadros = 0;
      ruins = 0;
      espera = aquecer;
    },
  };
}

/**
 * Faixa de fps para a telemetria (o piso da faixa): 55 (55+), 45 (45 a 55), 30 (30 a 45), 0.
 * @param {number} fps
 */
export function faixaFps(fps) {
  return fps >= 55 ? '55' : fps >= 45 ? '45' : fps >= 30 ? '30' : '0';
}

/**
 * Faixa de custo em ms por quadro para a telemetria (o teto da faixa): 4, 8, 16 e 16+.
 * Mostra se no aparelho lento o gargalo e a fisica ou o desenho.
 * @param {number} ms
 */
export function faixaMs(ms) {
  return ms < 4 ? '4' : ms < 8 ? '8' : ms < 16 ? '16' : '16+';
}
