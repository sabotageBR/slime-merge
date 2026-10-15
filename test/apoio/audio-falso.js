// AudioContext falso para os testes do som (porte dos falsos do relojoeiro).
// Arquivo de apoio: so exporta (o node --test roda os .test.js de test/).
//
// - AudioParam falso: o getter `value` so muda com atribuicao direta; as automacoes ficam em
//   `eventos`, e `final()` diz o valor em que o parametro vai assentar;
// - vigia de tempo: todo start() e toda automacao com instante antes do currentTime vai para
//   `ctx.passado`; todo valor NaN/infinito vai para `ctx.invalidos`;
// - registro de inicios ({no, t, offset, estado}) e de nos criados por tipo;
// - resume() resolve na proxima microtarefa (ou fica pendente ate concluirResume(), com
//   resumeManual); suspend()/close() mudam o estado.

/** Espera as microtarefas e os callbacks pendentes da fila atual. */
export function esvaziar() {
  return new Promise((r) => setImmediate(r));
}

const METODOS = ['setValueAtTime', 'linearRampToValueAtTime', 'exponentialRampToValueAtTime', 'setTargetAtTime'];

/**
 * @param {any} ctx
 * @param {number} v
 */
function criarParam(ctx, v) {
  const p = {
    value: v,
    /** @type {any[]} */
    eventos: [],
    cancelScheduledValues(/** @type {number} */ t) { this.eventos.push(['cancelar', t]); },
    final() {
      for (let i = this.eventos.length - 1; i >= 0; i--) {
        const e = this.eventos[i];
        if (e[0] === 'cancelar') break;
        return e[1];
      }
      return this.value;
    },
  };
  for (const m of METODOS) {
    /** @type {any} */ (p)[m] = function (/** @type {number} */ x, /** @type {number} */ t, /** @type {number} */ tau) {
      if (!Number.isFinite(x) || !Number.isFinite(t) || (tau !== undefined && !Number.isFinite(tau))) ctx.invalidos.push({ m, x, t, tau });
      if (m === 'exponentialRampToValueAtTime' && !(x > 0)) ctx.invalidos.push({ m, x, t, motivo: 'exp <= 0' });
      if (!(t >= ctx.currentTime - 1e-9)) ctx.passado.push({ m, t, agora: ctx.currentTime });
      this.eventos.push([m === 'setValueAtTime' ? 'set' : m === 'setTargetAtTime' ? 'alvo' : m === 'linearRampToValueAtTime' ? 'linear' : 'exp', x, t, tau]);
    };
  }
  return p;
}

/**
 * Classe de AudioContext falso. Instancias em `Classe.instancias`.
 * @param {{resumeManual?: boolean, estadoInicial?: string, taxa?: number, semCompressor?: boolean}} [op]
 */
export function criarContextoFalso(op = {}) {
  class ContextoFalso {
    constructor() {
      this.state = op.estadoInicial || 'suspended';
      this.currentTime = 0;
      this.sampleRate = op.taxa || 8000;
      /** @type {Record<string, number>} */
      this.criados = {};
      this.destination = this.no('destino');
      /** @type {any[]} */
      this.log = [];
      /** @type {{no: any, t: number, offset: any, estado: string}[]} */
      this.inicios = [];
      /** @type {any[]} */
      this.passado = [];
      /** @type {any[]} */
      this.invalidos = [];
      /** @type {Function[]} */
      this._resumes = [];
      ContextoFalso.instancias.push(this);
    }

    /** @param {string} tipo */
    no(tipo) {
      this.criados[tipo] = (this.criados[tipo] || 0) + 1;
      return {
        tipo,
        /** @type {any[]} */
        conectados: [],
        connect(/** @type {any} */ d) {
          if (!d) throw new Error('connect sem destino');
          this.conectados.push(d);
          return d;
        },
        disconnect() {},
      };
    }

    /** @param {any} n */
    fonte(n) {
      n.start = (/** @type {number} */ t = 0, /** @type {number} */ offset) => {
        if (!(t >= this.currentTime - 1e-9)) this.passado.push({ m: 'start', t, agora: this.currentTime });
        if (!Number.isFinite(t)) this.invalidos.push({ m: 'start', t });
        this.inicios.push({ no: n, t, offset, estado: this.state });
        this.log.push(['start', t, this.state]);
      };
      n.stop = (/** @type {number} */ t = 0) => {
        if (!Number.isFinite(t)) this.invalidos.push({ m: 'stop', t });
        n.parada = t;
      };
      return n;
    }

    createGain() {
      const n = /** @type {any} */ (this.no('gain'));
      n.gain = criarParam(this, 1);
      return n;
    }

    createOscillator() {
      const n = /** @type {any} */ (this.no('osc'));
      n.type = 'sine';
      n.frequency = criarParam(this, 440);
      n.detune = criarParam(this, 0);
      n.setPeriodicWave = (/** @type {any} */ w) => { n.onda = w; };
      return this.fonte(n);
    }

    createBufferSource() {
      const n = /** @type {any} */ (this.no('buffer'));
      n.buffer = null;
      n.loop = false;
      n.playbackRate = criarParam(this, 1);
      return this.fonte(n);
    }

    createBiquadFilter() {
      const n = /** @type {any} */ (this.no('filtro'));
      n.type = 'lowpass';
      n.frequency = criarParam(this, 350);
      n.Q = criarParam(this, 1);
      return n;
    }

    createDynamicsCompressor() {
      if (op.semCompressor) throw new Error('sem compressor');
      const n = /** @type {any} */ (this.no('compressor'));
      for (const k of ['threshold', 'knee', 'ratio', 'attack', 'release']) n[k] = criarParam(this, 0);
      return n;
    }

    createPeriodicWave(/** @type {Float32Array} */ re, /** @type {Float32Array} */ im) {
      this.criados.onda = (this.criados.onda || 0) + 1;
      return { re, im };
    }

    /**
     * @param {number} canais
     * @param {number} n
     * @param {number} [taxa]
     */
    createBuffer(canais, n, taxa) {
      const tx = taxa || this.sampleRate;
      const dados = Array.from({ length: canais }, () => new Float32Array(n));
      return { length: n, sampleRate: tx, duration: n / tx, numberOfChannels: canais, getChannelData: (/** @type {number} */ c) => dados[c] };
    }

    /**
     * Decodifica "qualquer coisa" num buffer de 0,5 s (falha se os dados vierem vazios).
     * @param {ArrayBuffer} dados
     * @param {Function} [ok]
     * @param {Function} [falha]
     */
    decodeAudioData(dados, ok, falha) {
      this.log.push(['decode']);
      if (!dados || !dados.byteLength) {
        const e = new Error('dados vazios');
        if (falha) falha(e);
        return Promise.reject(e);
      }
      const b = this.createBuffer(1, Math.floor(this.sampleRate * 0.5), this.sampleRate);
      if (ok) ok(b);
      return Promise.resolve(b);
    }

    resume() {
      this.log.push(['resume']);
      if (op.resumeManual) return new Promise((res) => { this._resumes.push(res); });
      this.state = 'running';
      return Promise.resolve();
    }

    /** Conclui os resume() pendentes (modo manual). */
    concluirResume() {
      this.state = 'running';
      for (const res of this._resumes.splice(0)) res();
    }

    suspend() {
      this.log.push(['suspend']);
      this.state = 'suspended';
      return Promise.resolve();
    }

    close() {
      this.state = 'closed';
      return Promise.resolve();
    }
  }
  /** @type {ContextoFalso[]} */
  ContextoFalso.instancias = [];
  return ContextoFalso;
}

/**
 * Contexto falso avulso ja rodando (para chamar receitas direto, como no OfflineAudioContext).
 * @param {{taxa?: number}} [op]
 */
export function contextoAvulso(op = {}) {
  const C = criarContextoFalso({ estadoInicial: 'running', taxa: op.taxa || 44100 });
  return new C();
}

/**
 * Agendador falso (setTimeout de mentira): avancar(ms) dispara o que venceu, em ordem.
 */
export function criarRelogio() {
  let t = 0;
  let id = 1;
  /** @type {{id: number, quando: number, fn: () => void}[]} */
  let fila = [];
  return {
    agora: () => t,
    agendar(/** @type {() => void} */ fn, /** @type {number} */ ms) {
      const i = id++;
      fila.push({ id: i, quando: t + Math.max(0, ms || 0), fn });
      return i;
    },
    cancelar(/** @type {number} */ i) { fila = fila.filter((x) => x.id !== i); },
    async avancar(/** @type {number} */ ms) {
      const fim = t + ms;
      for (;;) {
        fila.sort((a, b) => a.quando - b.quando || a.id - b.id);
        const prox = fila[0];
        if (!prox || prox.quando > fim) break;
        fila.shift();
        t = prox.quando;
        prox.fn();
        await esvaziar();
      }
      t = fim;
      await esvaziar();
    },
    pendentes: () => fila.length,
  };
}
