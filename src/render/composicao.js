// Composicao do slime em WebGL2: um passe so sobre o retangulo do campo.
// Superficie = limiar da densidade (metaball); contorno preto grosso de largura fixa em
// pixels (distancia ~ (rho - limiar) / |grad rho|); cor = Kubelka-Munk espectral por pixel
// (a interface entre as cores fica viva); brilho e sombra pela normal do gradiente;
// costura entre slimes diferentes onde a dominancia de um slime sobre o outro cai a zero.

import { uniformesKM } from '../cor/km.js';

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
uniform vec4 uJanela;
uniform vec2 uTam;      // celulas
uniform float uCel;     // u por celula
uniform float uPx;      // px do canvas por u
uniform float uLim;     // limiar da superficie
uniform float uTraco;   // largura do contorno (px do canvas)
uniform float uTempo;
uniform float uBrilho;  // 0 desliga o especular (qualidade baixa)
uniform vec4 uKS[15];
uniform vec4 uM[9];
uniform vec4 uForca;    // ciano, magenta, amarelo, preto
uniform float uForcaB;  // branco
in vec2 vW;
out vec4 cor;

float ks(int p, int b) { int i = p * 12 + b; return uKS[i / 4][i % 4]; }
float mm(int r, int b) { int i = r * 12 + b; return uM[i / 4][i % 4]; }

vec3 km(vec4 c) {
  float cw = max(0.0, 1.0 - c.x - c.y - c.z - c.w);
  vec4 w = max(c, 0.0) * uForca;
  float w4 = cw * uForcaB;
  float sw = max(w.x + w.y + w.z + w.w + w4, 1e-5);
  vec3 rgb = vec3(0.0);
  for (int b = 0; b < 12; b++) {
    float k = (w.x * ks(0, b) + w.y * ks(1, b) + w.z * ks(2, b) + w.w * ks(3, b) + w4 * ks(4, b)) / sw;
    float R = 1.0 + k - sqrt(k * k + 2.0 * k);
    rgb += R * vec3(mm(0, b), mm(1, b), mm(2, b));
  }
  return rgb;
}

vec3 gama(vec3 v) {
  v = clamp(v, 0.0, 1.0);
  return mix(12.92 * v, 1.055 * pow(v, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, v));
}

vec2 uvDe(vec2 w) { return ((w - uJanela.xy) / uCel + 0.5) / uTam; }

// ---- texturas dos niveis altos (no espaco do disco de repouso do slime: giram e amassam junto)
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float ruido(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
vec3 matiz(float h) { return clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0); }
vec3 paraLinear(vec3 s) { return pow(s, vec3(2.2)); }
float lum(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
// estrela/brilho de 4 pontas centrado numa celula de grade (g em celulas)
float brilho(vec2 g, float limiar, float tam, float tempo) {
  vec2 id = floor(g);
  float r = hash(id);
  if (r < limiar) return 0.0;
  vec2 c = vec2(hash(id + 3.1), hash(id + 7.7)) * 0.6 + 0.2;
  vec2 d = abs(fract(g) - c);
  float pisca = 0.55 + 0.45 * sin(tempo * (2.0 + r * 4.0) + r * 40.0);
  float cruz = max(1.0 - smoothstep(0.0, tam, min(d.x * 0.25 + d.y, d.y * 0.25 + d.x)), 0.0);
  return cruz * pisca;
}

vec3 textura(int t, vec2 L, vec3 base, float k, float tempo) {
  if (t == 0 || k <= 0.0) return base;
  float aa = max(fwidth(L.x), fwidth(L.y));
  vec3 c = base;
  if (t == 1) {
    // bolinhas (em fileiras desencontradas)
    vec2 g = L * 1.55;
    g.x += mod(floor(g.y), 2.0) * 0.5;
    float d = length(fract(g) - 0.5) - 0.21;
    float a = 1.0 - smoothstep(-aa * 1.6, aa * 1.6, d);
    vec3 cor = lum(base) > 0.6 ? paraLinear(vec3(0.6, 0.8, 1.0)) : mix(base, vec3(1.0), 0.7);
    c = mix(base, cor, a);
  } else if (t == 2) {
    // listras diagonais de bala
    float f = abs(fract((L.x + L.y) * 1.15) - 0.5) - 0.19;
    float a = 1.0 - smoothstep(-aa * 1.7, aa * 1.7, f);
    c = mix(base, vec3(0.93), a * 0.92);
  } else if (t == 3) {
    // arco-iris em aneis que andam devagar
    float r = length(L);
    vec3 arco = paraLinear(matiz(fract(r * 0.4 - tempo * 0.05)) * 0.88 + 0.08);
    float a = abs(fract(r * 0.4 * 6.0 - tempo * 0.3) - 0.5);
    c = mix(arco, arco * 1.1, smoothstep(0.3, 0.5, a));
  } else if (t == 4) {
    // ondas
    float f = abs(fract(L.y * 1.35 + sin(L.x * 2.3) * 0.22) - 0.5) - 0.13;
    float a = 1.0 - smoothstep(-aa * 1.5, aa * 1.5, f);
    c = mix(base, mix(base, vec3(1.0), 0.6), a);
  } else if (t == 5) {
    // galaxia: nebulosa rosa e roxa + estrelas piscando
    float n = ruido(L * 0.75 + vec2(tempo * 0.04, 0.0)) * 0.6 + ruido(L * 1.9) * 0.4;
    vec3 neb = mix(paraLinear(vec3(0.45, 0.2, 0.75)), paraLinear(vec3(0.95, 0.35, 0.7)), ruido(L * 0.5 + 9.0));
    c = mix(base * 0.8, neb, smoothstep(0.45, 0.9, n) * 0.55);
    float e = brilho(L * 2.1, 0.45, 0.16, tempo) + brilho(L * 4.3 + 11.0, 0.6, 0.12, tempo) * 0.7;
    c = mix(c, vec3(1.0), clamp(e, 0.0, 1.0));
  } else if (t == 6) {
    // glitter: brilhinhos de cor sobre branco-perola
    float e = brilho(L * 4.2, 0.35, 0.14, tempo);
    vec3 cor = paraLinear(matiz(hash(floor(L * 4.2))) * 0.6 + 0.4);
    c = mix(mix(base, paraLinear(matiz(fract(L.x * 0.2 + L.y * 0.15))) * 0.5 + 0.5, 0.35), cor, clamp(e * 1.3, 0.0, 1.0));
  }
  return mix(base, c, k);
}

// dominancia do slime da celula sobre o segundo: 1 dentro de um slime, 0 na costura
float sep(vec4 b) { return b.y; }

void main() {
  vec2 uv = uvDe(vW);
  vec2 du = vec2(1.0 / uTam.x, 0.0);
  vec2 dv = vec2(0.0, 1.0 / uTam.y);
  vec4 a = texture(uT0, uv);
  float rho = a.x;
  if (rho < uLim * 0.25) discard;
  vec4 aL = texture(uT0, uv - du);
  vec4 aR = texture(uT0, uv + du);
  vec4 aD = texture(uT0, uv - dv);
  vec4 aU = texture(uT0, uv + dv);
  vec2 g = vec2(aR.x - aL.x, aU.x - aD.x) / (2.0 * uCel);
  float gl = max(length(g), 1e-3);
  float dpx = (rho - uLim) / gl * uPx;          // distancia ate a borda, em px (positivo dentro)
  float alfa = smoothstep(-0.8, 0.8, dpx);
  if (alfa <= 0.0) discard;

  vec4 b = texture(uT1, uv);
  // pigmento medio no pixel -> cor fisica
  vec4 c = vec4(a.yzw, b.x);
  vec3 lin = km(c);
  // textura do slime dominante (lida sem filtro: o id nao se mistura na costura)
  vec4 tx = texelFetch(uT2, ivec2(floor((vW - uJanela.xy) / uCel + 0.5)), 0);
  lin = textura(int(tx.x + 0.5), b.zw, lin, tx.y, uTempo);

  // volume: luz de cima-esquerda, sombra na borda de baixo-direita
  vec2 n2 = -g / gl;                               // normal 2D apontando para fora
  float borda = 1.0 - smoothstep(0.0, uTraco * 5.0, dpx);
  vec3 n = normalize(vec3(n2 * borda * 0.9, 1.0));
  vec3 L = normalize(vec3(-0.45, 0.6, 0.65));
  float dif = dot(n, L);
  lin *= mix(0.78, 1.06, clamp(dif * 0.5 + 0.5, 0.0, 1.0));
  vec3 H = normalize(L + vec3(0.0, 0.0, 1.0));
  float esp = pow(max(dot(n, H), 0.0), 40.0) * borda * uBrilho;
  vec3 srgb = gama(lin) + esp * 0.55;

  // costura entre slimes diferentes: onde a dominancia cai (o vale entre dois slimes tem
  // de 2 a 3 celulas; a largura varia um pouco, como traco a mao)
  float s0 = sep(b);
  float costura = 1.0 - smoothstep(0.2, 0.36, s0);

  // contorno externo
  float tinta = 1.0 - smoothstep(uTraco - 0.8, uTraco + 0.8, dpx);
  tinta = max(tinta, costura);
  vec3 corTinta = vec3(0.09, 0.085, 0.11);
  srgb = mix(srgb, corTinta, tinta);
  cor = vec4(srgb * alfa, alfa);
}`;

/**
 * @param {HTMLCanvasElement} canvas
 * @returns {null | { desenhar: Function, perdeu: () => boolean, liberar: () => void }}
 */
export function criarComposicao(canvas) {
  /** @type {WebGL2RenderingContext|null} */
  let gl = null;
  try {
    gl = canvas.getContext('webgl2', { premultipliedAlpha: true, alpha: true, antialias: false, preserveDrawingBuffer: false });
  } catch {
    gl = null;
  }
  if (!gl) return null;
  let perdido = false;
  let prog = null;
  let vao = null;
  let tex0 = null;
  let tex1 = null;
  let tex2 = null;
  let loc = {};
  const km = uniformesKM();

  function compilar(tipo, fonte) {
    const sh = gl.createShader(tipo);
    gl.shaderSource(sh, fonte);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS) && !gl.isContextLost()) {
      throw new Error('shader: ' + gl.getShaderInfoLog(sh));
    }
    return sh;
  }

  function montar() {
    prog = gl.createProgram();
    gl.attachShader(prog, compilar(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compilar(gl.FRAGMENT_SHADER, FRAG));
    gl.bindAttribLocation(prog, 0, 'aPos');
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS) && !gl.isContextLost()) throw new Error('link: ' + gl.getProgramInfoLog(prog));
    loc = {};
    for (const nome of ['uT0', 'uT1', 'uT2', 'uJanela', 'uCam', 'uTela', 'uTam', 'uCel', 'uPx', 'uLim', 'uTraco', 'uTempo', 'uBrilho', 'uKS', 'uM', 'uForca', 'uForcaB']) {
      loc[nome] = gl.getUniformLocation(prog, nome);
    }
    vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
    tex0 = novaTextura();
    tex1 = novaTextura();
    tex2 = novaTextura();
    gl.useProgram(prog);
    gl.uniform4fv(loc.uKS, km.ks);
    gl.uniform4fv(loc.uM, km.m);
    gl.uniform4f(loc.uForca, km.forca[0], km.forca[1], km.forca[2], km.forca[3]);
    gl.uniform1f(loc.uForcaB, km.forca[4]);
    gl.uniform1i(loc.uT0, 0);
    gl.uniform1i(loc.uT1, 1);
    gl.uniform1i(loc.uT2, 2);
  }

  function novaTextura() {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }

  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); perdido = true; });
  canvas.addEventListener('webglcontextrestored', () => { perdido = false; montar(); });
  montar();

  /**
   * @param {ReturnType<typeof import('./campo.js').criarCampo>} campo
   * @param {import('./camera.js').Camera} cam
   * @param {number} dpr
   * @param {{ tempo?: number, limiar?: number, traco?: number, brilho?: number }} [o]
   */
  function desenhar(campo, cam, dpr, o = {}) {
    if (perdido || gl.isContextLost()) return;
    const W = canvas.width;
    const H = canvas.height;
    gl.viewport(0, 0, W, H);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(prog);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex0);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, campo.nx, campo.ny, 0, gl.RGBA, gl.FLOAT, campo.t0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, tex1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, campo.nx, campo.ny, 0, gl.RGBA, gl.FLOAT, campo.t1);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, tex2);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, campo.nx, campo.ny, 0, gl.RGBA, gl.FLOAT, campo.t2);
    const [x0, y0] = campo.janela;
    const x1 = x0 + (campo.nx - 1) * campo.celula;
    const y1 = y0 + (campo.ny - 1) * campo.celula;
    gl.uniform4f(loc.uJanela, x0, y0, x1, y1);
    gl.uniform4f(loc.uCam, cam.s * dpr, cam.cx, cam.cy, 0);
    gl.uniform4f(loc.uTela, cam.sx * dpr, cam.sy * dpr, W, H);
    gl.uniform2f(loc.uTam, campo.nx, campo.ny);
    gl.uniform1f(loc.uCel, campo.celula);
    gl.uniform1f(loc.uPx, cam.s * dpr);
    gl.uniform1f(loc.uLim, o.limiar ?? 0.55);
    gl.uniform1f(loc.uTraco, (o.traco ?? 3.2) * dpr);
    gl.uniform1f(loc.uTempo, o.tempo || 0);
    gl.uniform1f(loc.uBrilho, o.brilho ?? 1);
    gl.bindVertexArray(vao);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindVertexArray(null);
  }

  return {
    desenhar,
    perdeu: () => perdido,
    liberar() {
      try { gl.getExtension('WEBGL_lose_context')?.loseContext(); } catch { /* ignora */ }
    },
  };
}
