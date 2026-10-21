// Gel da capa 16:9 (tools/capa-heroi.html, 2026-10-21): o slime com volume de gel 3D, num shader
// proprio da ferramenta. Le o mesmo campo do jogo (src/render/campo.js: t0 = rho e pigmento,
// t1 = preto, dominancia e (u, v), t2 = textura, intensidade, aparencia e raio0) e espelha de
// src/render/composicao.js a silhueta, o antisserrilhado e o contorno (manter igual); o resto e da
// capa:
// - a cor sai exata por slime: a aparencia `ap` de cada um (1..3) escolhe 4 tons (claro, cor,
//   escuro e o brilho da translucidez), sem a mistura KM (que nao chega no verde-limao);
// - o volume vem de uma distancia com sinal ate a borda (EDT na CPU, perfil de almofada), com a
//   luz em 3 tons, a luz de recorte, a translucidez no pe, a oclusao no encosto e o brilho
//   especular (fraco e fora da elipse do rosto: o brilho forte do heroi e desenhado em 2D);
// - a costura tem largura fixa em px (com o raio maior do campo da capa, a do jogo engrossaria);
// - sem tinta: a borda escura da propria cor e a costura vira sombra (versao "macio");
// - a sombra de tinta (o gel dos botoes) e as luzes pontuais dos estouros;
// - o modo "jogo" (uJogo = 1): a luz e a costura exatamente as de src/render/composicao.js (a normal
//   so na faixa da borda, o fator 0,78-1,06, o especular de borda e a costura pela dominancia), so com
//   a cor exata no lugar da mistura KM: o slime desenhado como no jogo.
// O src nao muda: nada daqui vai para a build.

const VERT = `#version 300 es
in vec2 aPos;
uniform vec4 uJanela;   // x0 y0 x1 y1 (mundo)
uniform vec4 uCam;      // s (px do canvas por u), cx, cy, -
uniform vec4 uTela;     // sx, sy (px do canvas), largura, altura
out vec2 vW;
void main() {
  vec2 w = mix(uJanela.xy, uJanela.zw, aPos);
  vW = w;
  vec2 p = vec2(uTela.x + (w.x - uCam.y) * uCam.x, uTela.y - (w.y - uCam.z) * uCam.x);
  gl_Position = vec4(p.x / uTela.z * 2.0 - 1.0, 1.0 - p.y / uTela.w * 2.0, 0.0, 1.0);
}`;

const FRAG = `#version 300 es
precision highp float;
uniform sampler2D uT0;
uniform sampler2D uT1;
uniform sampler2D uT2;
uniform sampler2D uT3;    // volume: (normal x, normal y, altura / R, distancia / R)
uniform vec4 uJanela;
uniform vec2 uTam;        // celulas
uniform float uCel;       // u por celula
uniform float uPx;        // px do canvas por u
uniform float uLim;       // limiar da superficie
uniform float uTraco;     // largura do contorno (px do canvas)
uniform vec3 uClaro[8];   // por aparencia (0 = nenhuma; ate 7 slimes de cores diferentes), em linear
uniform vec3 uCor[8];
uniform vec3 uEscuro[8];
uniform vec3 uBrilhoPe[8];
uniform float uEsp[8];    // especular por aparencia
uniform vec3 uLuz;        // direcao da luz (y para cima, z para quem ve)
uniform vec4 uTons;       // claro, escuro de baixo, translucidez, oclusao
uniform vec4 uRim;        // cor (linear) e forca da luz de recorte
uniform float uTinta;     // 1 = contorno e costura de tinta; 0 = borda da propria cor
uniform float uBorda;     // largura da borda da propria cor (px), sem tinta
uniform vec3 uCorTinta;   // sRGB
uniform vec3 uSombra;     // deslocamento (u) e alfa da sombra de tinta (0 = sem)
uniform vec4 uRosto;      // elipse sem especular: centro (u) e raios (u)
uniform vec4 uEstouro[3]; // luzes pontuais: x, y, altura (u), alcance (u)
uniform vec3 uCorEstouro[3];
uniform float uJogo;      // 1 = a luz e a costura do jogo (src/render/composicao.js)
in vec2 vW;
out vec4 cor;

vec3 gama(vec3 v) {
  v = clamp(v, 0.0, 1.0);
  return mix(12.92 * v, 1.055 * pow(v, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, v));
}

vec2 uvDe(vec2 w) { return ((w - uJanela.xy) / uCel + 0.5) / uTam; }

/** Distancia (px) ate a borda, positiva dentro: a mesma conta de src/render/composicao.js. */
float distBorda(vec2 uv, vec2 du, vec2 dv, out vec2 g) {
  float rho = texture(uT0, uv).x;
  float aL = texture(uT0, uv - du).x;
  float aR = texture(uT0, uv + du).x;
  float aD = texture(uT0, uv - dv).x;
  float aU = texture(uT0, uv + dv).x;
  g = vec2(aR - aL, aU - aD) / (2.0 * uCel);
  float gl = max(length(g), 1e-3);
  return (rho - uLim) / gl * uPx;
}

int apEm(ivec2 c) {
  ivec2 t = ivec2(uTam) - 1;
  return int(texelFetch(uT2, clamp(c, ivec2(0), t), 0).z + 0.5);
}

void main() {
  vec2 uv = uvDe(vW);
  vec2 du = vec2(1.0 / uTam.x, 0.0);
  vec2 dv = vec2(0.0, 1.0 / uTam.y);
  float rho = texture(uT0, uv).x;

  // sombra de tinta: a silhueta deslocada, por baixo do corpo
  float aS = 0.0;
  if (uSombra.z > 0.0) {
    vec2 gS;
    float dS = distBorda(uvDe(vW - uSombra.xy), du, dv, gS);
    aS = smoothstep(-0.8, 0.8, dS) * uSombra.z;
  }
  if (rho < uLim * 0.25 && aS <= 0.0) discard;

  vec2 g;
  float dpx = distBorda(uv, du, dv, g);
  float alfa = rho < uLim * 0.25 ? 0.0 : smoothstep(-0.8, 0.8, dpx);
  if (alfa <= 0.0 && aS <= 0.0) discard;

  // cor por aparencia, bilinear entre as 4 celulas vizinhas (sem degrau na costura sem tinta);
  // celula vazia (ap 0) nao conta
  vec2 gc = (vW - uJanela.xy) / uCel;
  vec2 f0 = floor(gc);
  vec2 fr = gc - f0;
  ivec2 c0 = ivec2(f0);
  int ids[4];
  ids[0] = apEm(c0);
  ids[1] = apEm(c0 + ivec2(1, 0));
  ids[2] = apEm(c0 + ivec2(0, 1));
  ids[3] = apEm(c0 + ivec2(1, 1));
  float pes[4];
  pes[0] = (1.0 - fr.x) * (1.0 - fr.y);
  pes[1] = fr.x * (1.0 - fr.y);
  pes[2] = (1.0 - fr.x) * fr.y;
  pes[3] = fr.x * fr.y;
  vec3 claro = vec3(0.0);
  vec3 base = vec3(0.0);
  vec3 escuro = vec3(0.0);
  vec3 brPe = vec3(0.0);
  float esp = 0.0;
  float soma = 0.0;
  for (int k = 0; k < 4; k++) {
    int a = ids[k];
    if (a <= 0) continue;
    float p = pes[k];
    claro += uClaro[a] * p;
    base += uCor[a] * p;
    escuro += uEscuro[a] * p;
    brPe += uBrilhoPe[a] * p;
    esp += uEsp[a] * p;
    soma += p;
  }
  if (soma <= 0.0) {
    int a = max(apEm(ivec2(floor(gc + 0.5))), 1);
    claro = uClaro[a]; base = uCor[a]; escuro = uEscuro[a]; brPe = uBrilhoPe[a]; esp = uEsp[a];
  } else {
    claro /= soma; base /= soma; escuro /= soma; brPe /= soma; esp /= soma;
  }

  // volume: a normal da almofada (EDT), e na faixa da borda a normal do proprio contorno
  vec4 vol = texture(uT3, uv);
  vec2 nxy = vol.xy;
  float l2 = dot(nxy, nxy);
  if (l2 > 0.995) { nxy *= 0.9975 / sqrt(l2); l2 = dot(nxy, nxy); }
  vec3 N = vec3(nxy, sqrt(1.0 - l2));
  vec2 n2 = -g / max(length(g), 1e-3);
  float faixa = 1.0 - smoothstep(0.0, uTraco * 2.5 + 2.0, dpx);
  N = normalize(mix(N, normalize(vec3(n2 * 0.95, 0.3)), faixa * 0.6));
  vec3 L = normalize(uLuz);
  float ndl = dot(N, L);
  vec4 b = texture(uT1, uv);
  float dom = b.y;

  // 3 tons: escuro -> cor pela luz; claro no alto; escuro de novo embaixo (o --cor2 do gel)
  vec3 c = mix(escuro, base, smoothstep(-0.45, 0.5, ndl));
  c = mix(c, claro, smoothstep(0.55, 0.97, ndl) * uTons.x);
  c = mix(c, escuro * 0.82, smoothstep(0.15, 0.95, -N.y) * uTons.y);
  // translucidez: a luz que atravessa o gel acende a borda de dentro, embaixo
  float sd = vol.w;
  float pe = smoothstep(0.1, 0.85, -N.y) * (1.0 - smoothstep(0.0, 0.45, sd));
  c = mix(c, brPe, pe * uTons.z);
  // oclusao: onde encosta em outro slime (a dominancia cai)
  c *= mix(1.0 - uTons.w, 1.0, smoothstep(0.08, 0.65, dom));
  // luz de recorte: a borda do lado oposto a luz
  float rim = pow(1.0 - clamp(N.z, 0.0, 1.0), 2.5);
  vec2 lx = normalize(L.xy);
  rim *= 0.35 + 0.65 * max(dot(normalize(N.xy + 1e-5), -lx), 0.0);
  c += uRim.rgb * rim * uRim.w;
  // luzes dos estouros
  for (int k = 0; k < 3; k++) {
    vec4 e = uEstouro[k];
    if (e.w <= 0.0) continue;
    vec3 lp = vec3(e.xy - vW, e.z);
    float d = length(lp.xy);
    float at = 1.0 - smoothstep(0.0, e.w, d);
    c += uCorEstouro[k] * max(dot(N, normalize(lp)), 0.0) * at * at;
  }
  // especular largo e fraco, fora da elipse do rosto
  vec3 H = normalize(L + vec3(0.0, 0.0, 1.0));
  float nh = max(dot(N, H), 0.0);
  vec2 qr = (vW - uRosto.xy) / max(uRosto.zw, vec2(1e-3));
  float foraRosto = uRosto.z > 0.0 ? smoothstep(0.9, 1.25, length(qr)) : 1.0;
  float longeDaBorda = smoothstep(uTraco, uTraco * 3.0, dpx) * smoothstep(0.1, 0.5, dom);
  float brilho = (pow(nh, 14.0) * 0.18 + smoothstep(0.82, 0.97, pow(nh, 60.0)) * 0.7) * esp * foraRosto * longeDaBorda;
  vec3 srgb = gama(c) + brilho;
  if (uJogo > 0.5) {
    // espelha src/render/composicao.js (volume, :354-363): luz de cima-esquerda so na faixa da borda
    vec2 nb = -g / max(length(g), 1e-3);
    float borda = 1.0 - smoothstep(0.0, uTraco * 5.0, dpx);
    vec3 nj = normalize(vec3(nb * borda * 0.9, 1.0));
    vec3 Lj = normalize(vec3(-0.45, 0.6, 0.65));
    float difj = dot(nj, Lj);
    vec3 lin = base * mix(0.78, 1.06, clamp(difj * 0.5 + 0.5, 0.0, 1.0));
    for (int k = 0; k < 3; k++) {
      vec4 e = uEstouro[k];
      if (e.w <= 0.0) continue;
      float at = 1.0 - smoothstep(0.0, e.w, length(e.xy - vW));
      lin += uCorEstouro[k] * at * at;
    }
    vec3 Hj = normalize(Lj + vec3(0.0, 0.0, 1.0));
    float espj = pow(max(dot(nj, Hj), 0.0), 40.0) * borda;
    srgb = gama(lin) + espj * 0.55;
  }

  // costura com largura fixa em px (a dominancia ate zero, pela mesma conta da borda); no modo jogo, a
  // do jogo (src/render/composicao.js:365-368)
  float dL = texture(uT1, uv - du).y;
  float dR = texture(uT1, uv + du).y;
  float dD = texture(uT1, uv - dv).y;
  float dU = texture(uT1, uv + dv).y;
  // o vale da dominancia e um V: a diferenca central se anula no fundo dele (a linha sairia
  // pontilhada); a de um lado so, a maior, nao
  vec2 gd = vec2(max(abs(dR - dom), abs(dom - dL)), max(abs(dU - dom), abs(dom - dD))) / uCel;
  float dc = dom / max(length(gd), 1e-3) * uPx;
  float costura = uJogo > 0.5 ? 1.0 - smoothstep(0.2, 0.36, dom) : 1.0 - smoothstep(uTraco * 0.5 - 0.8, uTraco * 0.5 + 0.8, dc);

  if (uTinta > 0.5) {
    float tinta = 1.0 - smoothstep(uTraco - 0.8, uTraco + 0.8, dpx);
    tinta = max(tinta, costura);
    srgb = mix(srgb, uCorTinta, tinta);
  } else {
    // sem tinta: a borda escura da propria cor por dentro do contorno
    float bd = 1.0 - smoothstep(uBorda - 0.8, uBorda + 0.8, dpx);
    srgb = mix(srgb, gama(escuro * 0.5), bd * 0.9);
    srgb = mix(srgb, gama(escuro * 0.62), costura * 0.75);
  }
  srgb = min(srgb, vec3(1.0));
  // corpo por cima da sombra (pre-multiplicado)
  vec4 corpo = vec4(srgb * alfa, alfa);
  cor = corpo + vec4(uCorTinta * aS, aS) * (1.0 - alfa);
}`;

/**
 * @param {HTMLCanvasElement} canvas
 * @returns {null | { gl: WebGL2RenderingContext, desenhar: Function, liberar: () => void }}
 */
export function criarGel(canvas) {
  /** @type {WebGL2RenderingContext|null} */
  let gl = null;
  try {
    gl = canvas.getContext('webgl2', { premultipliedAlpha: true, alpha: true, antialias: false, preserveDrawingBuffer: true });
  } catch {
    gl = null;
  }
  if (!gl) return null;

  const compilar = (tipo, fonte) => {
    const sh = gl.createShader(tipo);
    gl.shaderSource(sh, fonte);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error('shader do gel: ' + gl.getShaderInfoLog(sh));
    return sh;
  };
  const prog = gl.createProgram();
  gl.attachShader(prog, compilar(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, compilar(gl.FRAGMENT_SHADER, FRAG));
  gl.bindAttribLocation(prog, 0, 'aPos');
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error('link do gel: ' + gl.getProgramInfoLog(prog));
  /** @param {string} nome */
  const u = (nome) => gl.getUniformLocation(prog, nome);
  gl.useProgram(prog);
  gl.uniform1i(u('uT0'), 0);
  gl.uniform1i(u('uT1'), 1);
  gl.uniform1i(u('uT2'), 2);
  gl.uniform1i(u('uT3'), 3);

  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);
  const novaTextura = () => {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  };
  const tex = [novaTextura(), novaTextura(), novaTextura(), novaTextura()];

  /**
   * @param {ReturnType<typeof import('../src/render/campo.js').criarCampo>} campo
   * @param {import('../src/render/camera.js').Camera} cam
   * @param {Float32Array} vol saida de volumeDoCampo (mesma grade do campo)
   * @param {{ limiar: number, traco: number, aparencias: { claro: number[], cor: number[], escuro: number[], brilhoPe: number[], esp: number }[],
   *   luz?: number[], tons?: number[], rim?: number[], tinta?: boolean, borda?: number, corTinta?: number[],
   *   sombra?: number[]|null, rosto?: number[]|null, estouros?: { x: number, y: number, z: number, r: number, cor: number[] }[], jogo?: boolean }} o
   */
  function desenhar(campo, cam, vol, o) {
    const W = canvas.width;
    const H = canvas.height;
    gl.viewport(0, 0, W, H);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(prog);
    const dados = [campo.t0, campo.t1, campo.t2, vol];
    for (let k = 0; k < 4; k++) {
      gl.activeTexture(gl.TEXTURE0 + k);
      gl.bindTexture(gl.TEXTURE_2D, tex[k]);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, campo.nx, campo.ny, 0, gl.RGBA, gl.FLOAT, dados[k]);
    }
    gl.activeTexture(gl.TEXTURE0);
    const [x0, y0] = campo.janela;
    const x1 = x0 + (campo.nx - 1) * campo.celula;
    const y1 = y0 + (campo.ny - 1) * campo.celula;
    gl.uniform4f(u('uJanela'), x0, y0, x1, y1);
    gl.uniform4f(u('uCam'), cam.s, cam.cx, cam.cy, 0);
    gl.uniform4f(u('uTela'), cam.sx, cam.sy, W, H);
    gl.uniform2f(u('uTam'), campo.nx, campo.ny);
    gl.uniform1f(u('uCel'), campo.celula);
    gl.uniform1f(u('uPx'), cam.s);
    gl.uniform1f(u('uLim'), o.limiar);
    gl.uniform1f(u('uTraco'), o.traco);
    const ap = [{ claro: [0.5, 0.5, 0.5], cor: [0.5, 0.5, 0.5], escuro: [0.2, 0.2, 0.2], brilhoPe: [0.6, 0.6, 0.6], esp: 0 }, ...o.aparencias].slice(0, 8);
    while (ap.length < 8) ap.push(ap[0]);
    gl.uniform3fv(u('uClaro'), ap.flatMap((a) => a.claro));
    gl.uniform3fv(u('uCor'), ap.flatMap((a) => a.cor));
    gl.uniform3fv(u('uEscuro'), ap.flatMap((a) => a.escuro));
    gl.uniform3fv(u('uBrilhoPe'), ap.flatMap((a) => a.brilhoPe));
    gl.uniform1fv(u('uEsp'), ap.map((a) => a.esp));
    const luz = o.luz || [-0.45, 0.6, 0.65];
    gl.uniform3f(u('uLuz'), luz[0], luz[1], luz[2]);
    const tons = o.tons || [0.6, 0.5, 0.45, 0.3];
    gl.uniform4f(u('uTons'), tons[0], tons[1], tons[2], tons[3]);
    const rim = o.rim || [1, 1, 1, 0];
    gl.uniform4f(u('uRim'), rim[0], rim[1], rim[2], rim[3]);
    gl.uniform1f(u('uTinta'), o.tinta === false ? 0 : 1);
    gl.uniform1f(u('uBorda'), o.borda ?? 3);
    const ct = o.corTinta || [0.09, 0.085, 0.11];
    gl.uniform3f(u('uCorTinta'), ct[0], ct[1], ct[2]);
    const sb = o.sombra || [0, 0, 0];
    gl.uniform3f(u('uSombra'), sb[0], sb[1], sb[2]);
    const ro = o.rosto || [0, 0, 0, 0];
    gl.uniform4f(u('uRosto'), ro[0], ro[1], ro[2], ro[3]);
    const est = (o.estouros || []).slice(0, 3);
    const ue = new Float32Array(12);
    const uc = new Float32Array(9);
    est.forEach((e, k) => {
      ue.set([e.x, e.y, e.z, e.r], k * 4);
      uc.set(e.cor, k * 3);
    });
    gl.uniform4fv(u('uEstouro'), ue);
    gl.uniform1f(u('uJogo'), o.jogo ? 1 : 0);
    gl.uniform3fv(u('uCorEstouro'), uc);
    gl.bindVertexArray(vao);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindVertexArray(null);
  }

  return {
    gl,
    desenhar,
    liberar() {
      try { gl.getExtension('WEBGL_lose_context')?.loseContext(); } catch { /* ignora */ }
    },
  };
}

// ------------------------------------------------------------ volume (EDT na CPU)

/**
 * Distancia euclidiana ao quadrado (Felzenszwalb e Huttenlocher), 1D, in place: f[i] = 0 nos
 * pontos-fonte e INF no resto; sai a menor (i - j)^2 + f[j].
 * @param {Float64Array} f @param {number} n @param {Float64Array} d @param {Int32Array} v @param {Float64Array} z
 */
function edt1(f, n, d, v, z) {
  const INF = 1e20;
  let k = 0;
  v[0] = 0;
  z[0] = -INF;
  z[1] = INF;
  for (let q = 1; q < n; q++) {
    let s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= z[k]) {
      k--;
      s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    }
    k++;
    v[k] = q;
    z[k] = s;
    z[k + 1] = INF;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++;
    const dq = q - v[k];
    d[q] = dq * dq + f[v[k]];
  }
}

/**
 * Distancia (em celulas) de cada celula ate a celula-fonte mais perto.
 * @param {Uint8Array} fonte 1 = fonte @param {number} nx @param {number} ny
 * @returns {Float32Array}
 */
function distancias(fonte, nx, ny) {
  const INF = 1e20;
  const n = Math.max(nx, ny);
  const f = new Float64Array(n);
  const d = new Float64Array(n);
  const v = new Int32Array(n);
  const z = new Float64Array(n + 1);
  const g = new Float64Array(nx * ny);
  // colunas
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < ny; j++) f[j] = fonte[j * nx + i] ? 0 : INF;
    edt1(f, ny, d, v, z);
    for (let j = 0; j < ny; j++) g[j * nx + i] = d[j];
  }
  // linhas
  const out = new Float32Array(nx * ny);
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) f[i] = g[j * nx + i];
    edt1(f, nx, d, v, z);
    for (let i = 0; i < nx; i++) out[j * nx + i] = Math.sqrt(d[i]);
  }
  return out;
}

/**
 * Media movel em caixa, separavel, 3 passadas (quase gaussiana), numa copia (a entrada fica intacta).
 * @param {Float32Array} a
 */
function alisar(a, nx, ny, r) {
  if (r < 1) return Float32Array.from(a);
  let src = Float32Array.from(a);
  let dst = new Float32Array(a.length);
  for (let passo = 0; passo < 3; passo++) {
    // horizontal
    for (let j = 0; j < ny; j++) {
      const o = j * nx;
      let soma = 0;
      for (let i = -r; i <= r; i++) soma += src[o + Math.min(nx - 1, Math.max(0, i))];
      for (let i = 0; i < nx; i++) {
        dst[o + i] = soma / (2 * r + 1);
        soma += src[o + Math.min(nx - 1, i + r + 1)] - src[o + Math.max(0, i - r)];
      }
    }
    [src, dst] = [dst, src];
    // vertical
    for (let i = 0; i < nx; i++) {
      let soma = 0;
      for (let j = -r; j <= r; j++) soma += src[Math.min(ny - 1, Math.max(0, j)) * nx + i];
      for (let j = 0; j < ny; j++) {
        dst[j * nx + i] = soma / (2 * r + 1);
        soma += src[Math.min(ny - 1, j + r + 1) * nx + i] - src[Math.max(0, j - r) * nx + i];
      }
    }
    [src, dst] = [dst, src];
  }
  return src;
}

/**
 * O volume de cada slime: distancia ate a borda (a costura conta como borda), altura em perfil de
 * almofada h = sqrt(d (2R - d)) com R = raio0 * kDomo, e a normal alisada no corpo inteiro (crua, a
 * normal da EDT mostra os degraus da grade e os vincos do eixo medial, como plastico amassado; perto
 * da borda o shader usa a normal do proprio contorno). Mesma grade do campo.
 * @param {ReturnType<typeof import('../src/render/campo.js').criarCampo>} campo
 * @param {{ limiar: number, domMin?: number, kDomo?: number, alisarU?: number }} o
 * @returns {Float32Array} (nx, ny, h/R, d/R) por celula
 */
export function volumeDoCampo(campo, o) {
  const { nx, ny, t0, t1, t2, celula } = campo;
  const N = nx * ny;
  const domMin = o.domMin ?? 0.15;
  const kDomo = o.kDomo ?? 1;
  const dentro = new Uint8Array(N);
  const fora = new Uint8Array(N);
  for (let k = 0; k < N; k++) {
    const d = t0[k * 4] > o.limiar && t1[k * 4 + 1] > domMin;
    dentro[k] = d ? 1 : 0;
    fora[k] = d ? 0 : 1;
  }
  const dIn = distancias(fora, nx, ny); // dentro: ate a celula de fora mais perto
  // raio de cada celula: o do slime dominante; nas celulas sem slime, o maior vizinho nao importa
  const h = new Float32Array(N);
  const sdR = new Float32Array(N);
  const Rc = new Float32Array(N);
  for (let k = 0; k < N; k++) {
    const R = Math.max(0.2, (t2[k * 4 + 3] || 0) * kDomo);
    Rc[k] = R;
    if (!dentro[k]) { h[k] = 0; sdR[k] = 0; continue; }
    const d = Math.max(0, dIn[k] - 0.5) * celula;
    sdR[k] = d / R;
    h[k] = d < R ? Math.sqrt(d * (2 * R - d)) : R;
  }
  // normal pela diferenca central da altura (inclinacao limitada na borda)
  const nX = new Float32Array(N);
  const nY = new Float32Array(N);
  const MAX = 7;
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const k = j * nx + i;
      if (!dentro[k]) continue;
      const hl = h[j * nx + Math.max(0, i - 1)];
      const hr = h[j * nx + Math.min(nx - 1, i + 1)];
      const hd = h[Math.max(0, j - 1) * nx + i];
      const hu = h[Math.min(ny - 1, j + 1) * nx + i];
      let gx = (hr - hl) / (2 * celula);
      let gy = (hu - hd) / (2 * celula);
      const m = Math.hypot(gx, gy);
      if (m > MAX) { gx *= MAX / m; gy *= MAX / m; }
      const inv = 1 / Math.sqrt(gx * gx + gy * gy + 1);
      nX[k] = -gx * inv;
      nY[k] = -gy * inv;
    }
  }
  // alisa tudo (some o vinco do eixo medial e o degrau da grade; na costura as normais opostas se
  // anulam e o encosto fica liso, com a tinta por cima)
  const r = Math.max(1, Math.round((o.alisarU ?? 0.3) / celula));
  const sX = alisar(nX, nx, ny, r);
  const sY = alisar(nY, nx, ny, r);
  const out = new Float32Array(N * 4);
  for (let k = 0; k < N; k++) {
    if (!dentro[k]) {
      // fora: a normal da borda mais perto nao existe aqui; o shader usa a do contorno
      out[k * 4] = 0;
      out[k * 4 + 1] = 0;
      continue;
    }
    out[k * 4] = sX[k];
    out[k * 4 + 1] = sY[k];
    out[k * 4 + 2] = h[k] / Rc[k];
    out[k * 4 + 3] = sdR[k];
  }
  return out;
}
