// Composicao do slime em WebGL2: um passe so sobre o retangulo do campo.
// Superficie = limiar da densidade (metaball); contorno preto grosso de largura fixa em
// pixels (distancia ~ (rho - limiar) / |grad rho|); cor = Kubelka-Munk espectral por pixel
// (a interface entre as cores fica viva); brilho e sombra pela normal do gradiente;
// costura entre slimes diferentes onde a dominancia de um slime sobre o outro cai a zero.
// Skins (src/jogo/skins.js): a aparencia 0 segue o caminho de sempre (textura legada do nivel);
// a aparencia k le a entrada k de uAp (procedural com cor, ou a imagem 16x16 do atlas uT3).
// Sao dois programas do mesmo texto: o de sempre (sem SKINS, igual ao de antes) e o com SKINS,
// compilado so quando alguma skin entra em jogo. Sem skin, nada muda (nem o custo).

import { uniformesKM } from '../cor/km.js';
import { PALETA } from '../jogo/skins.js';

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
#ifdef SKINS
uniform sampler2D uT3;  // atlas das skins de pixel: 16 x 256, sRGB, o nivel k nas linhas 16k..16k+15
uniform vec4 uAp[32];   // 16 aparencias x (procedural, escala, linha do atlas ou -1, modo) e (cor linear, -)
#endif
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
  } else if (t == 7) {
    // lava (o nivel 13): crosta escura com rachaduras em brasa que pulsam
    float n = ruido(L * 1.1 + vec2(0.0, -tempo * 0.08)) * 0.65 + ruido(L * 2.7) * 0.35;
    float r = abs(n - 0.5);
    float pulso = 0.75 + 0.25 * sin(tempo * 2.2 + n * 9.0);
    float brasa = (1.0 - smoothstep(0.02, 0.07 + aa, r)) * pulso;
    vec3 crosta = mix(paraLinear(vec3(0.17, 0.07, 0.07)), paraLinear(vec3(0.34, 0.13, 0.09)), ruido(L * 3.5));
    vec3 fogo = mix(paraLinear(vec3(1.0, 0.36, 0.05)), paraLinear(vec3(1.0, 0.86, 0.3)), brasa);
    c = mix(crosta, fogo, brasa);
    c += paraLinear(vec3(0.9, 0.25, 0.02)) * (1.0 - smoothstep(0.0, 0.18, r)) * 0.22;
  }
  return mix(base, c, k);
}

#ifdef SKINS
// ---- skins (aparencia a > 0): pixel do atlas ou procedural com a cor da skin. fw = fwidth de
// L (calculado fora dos ramos: derivada so vale em fluxo uniforme)

// cor de um pixel da imagem (c em pixels, y para cima); transparente mostra a base
vec3 corPx(ivec2 c, int linha, int modo, vec3 base) {
  ivec2 q = modo == 1 ? clamp(c, ivec2(0), ivec2(15)) : (c & 15);
  vec4 t = texelFetch(uT3, ivec2(q.x, linha * 16 + 15 - q.y), 0);
  return mix(base, t.rgb, t.a);
}

// imagem 16x16: ladrilho (1 px = 0,1 u na escala 1) ou estampa (cobre 2,1 raios, presa ao
// rosto). Pixels nitidos com a borda suavizada em 1 px de tela (4 leituras).
vec3 pixelArte(vec2 L, vec3 base, int linha, int modo, float escala, float r0, float fw) {
  float f = modo == 1 ? 16.0 / (2.1 * r0) : escala * 10.0;
  vec2 p = modo == 1 ? L * f + 8.0 : L * f;
  vec2 pp = p - 0.5;
  vec2 i0 = floor(pp);
  vec2 a = clamp((pp - i0 - 0.5) / clamp(fw * f, 1e-3, 1.0) + 0.5, 0.0, 1.0);
  ivec2 c = ivec2(i0);
  vec3 c00 = corPx(c, linha, modo, base);
  vec3 c10 = corPx(c + ivec2(1, 0), linha, modo, base);
  vec3 c01 = corPx(c + ivec2(0, 1), linha, modo, base);
  vec3 c11 = corPx(c + ivec2(1, 1), linha, modo, base);
  return mix(mix(c00, c10, a.x), mix(c01, c11, a.x), a.y);
}

vec2 girar(vec2 v, float a) { float c = cos(a); float s = sin(a); return vec2(c * v.x - s * v.y, s * v.x + c * v.y); }
// faixas do arco-iris de baixo (roxo) para cima (vermelho)
vec3 faixa(float i) {
  float h = i < 0.5 ? 0.76 : i < 1.5 ? 0.6 : i < 2.5 ? 0.33 : i < 3.5 ? 0.15 : i < 4.5 ? 0.08 : 0.0;
  return paraLinear(mix(matiz(h), vec3(1.0), 0.1));
}
// cor de bala do granulado e do confete
vec3 bala(float h) {
  return paraLinear(h < 0.2 ? vec3(1.0, 0.54, 0.75) : h < 0.4 ? vec3(1.0, 0.82, 0.23) : h < 0.6 ? vec3(0.36, 0.62, 1.0) : h < 0.8 ? vec3(0.55, 0.9, 0.4) : vec3(1.0));
}

// procedurais das skins: todas com a cor da skin (e = escala, fw = fwidth de L)
vec3 procAp(int p, vec2 L, vec3 base, vec3 cor, float e, float r0, float fw, float tempo) {
  vec2 g = L * e;
  float aa = max(fw * e, 1e-4);
  vec3 c = base;
  if (p == 1) {
    // bolinhas
    vec2 q = g * 1.55;
    q.x += mod(floor(q.y), 2.0) * 0.5;
    float d = length(fract(q) - 0.5) - 0.21;
    c = mix(base, cor, 1.0 - smoothstep(-aa * 1.6, aa * 1.6, d));
  } else if (p == 2) {
    // listras diagonais
    float f = abs(fract((g.x + g.y) * 1.15) - 0.5) - 0.19;
    c = mix(base, cor, 1.0 - smoothstep(-aa * 1.8, aa * 1.8, f));
  } else if (p == 3) {
    // ondas
    float f = abs(fract(g.y * 1.35 + sin(g.x * 2.3) * 0.22) - 0.5) - 0.13;
    c = mix(base, cor, 1.0 - smoothstep(-aa * 1.7, aa * 1.7, f));
  } else if (p == 4) {
    // xadrez
    float v = sin(g.x * 6.0) * sin(g.y * 6.0);
    c = mix(base, cor, smoothstep(-aa * 7.5, aa * 7.5, v));
  } else if (p == 5) {
    // estrelinhas piscando
    float s = brilho(g * 1.9, 0.42, 0.2, tempo) + brilho(g * 3.6 + 7.0, 0.6, 0.15, tempo) * 0.8;
    c = mix(base, cor, clamp(s * 1.4, 0.0, 1.0));
  } else if (p == 6) {
    // degrade de baixo para cima no corpo
    float t = clamp(L.y / (2.0 * r0) + 0.5, 0.0, 1.0);
    c = mix(base, cor, smoothstep(0.12, 0.95, t));
  } else if (p == 7) {
    // confete: retangulinhos girados de varias cores
    vec2 q = g * 1.9;
    vec2 id = floor(q);
    if (hash(id + 0.7) > 0.4) {
      vec2 c0 = vec2(hash(id + 3.1), hash(id + 7.7)) * 0.5 + 0.25;
      vec2 l = girar(fract(q) - c0, hash(id + 1.3) * 6.2832);
      float d = max(abs(l.x) - 0.16, abs(l.y) - 0.07);
      vec3 cc = hash(id + 9.1) < 0.2 ? cor : bala(hash(id + 5.5));
      c = mix(base, cc, 1.0 - smoothstep(-aa * 1.9, aa * 1.9, d));
    }
  } else if (p == 8) {
    // manchas organicas
    float n = ruido(g * 2.4 + 3.7) * 0.7 + ruido(g * 5.2 + 1.3) * 0.3;
    float w = 0.02 + aa * 1.6;
    c = mix(base, cor, smoothstep(0.52 - w, 0.52 + w, n));
  } else if (p == 9) {
    // bolhas que sobem devagar: anel, brilho e um veu da cor por dentro
    vec2 q = g * 1.25 + vec2(0.0, -tempo * 0.12);
    vec2 id = floor(q);
    if (hash(id + 2.2) > 0.25) {
      vec2 c0 = 0.5 + (vec2(hash(id + 4.1), hash(id + 8.3)) - 0.5) * 0.3;
      float r = 0.2 + 0.13 * hash(id + 5.3);
      vec2 l = fract(q) - c0;
      float d = length(l) - r;
      float anel = 1.0 - smoothstep(0.04, 0.04 + aa * 2.0, abs(d));
      float dentro = 1.0 - smoothstep(-aa, aa, d);
      float luz = 1.0 - smoothstep(0.035, 0.035 + aa * 2.0, length(l - vec2(-0.4, 0.4) * r) - r * 0.18);
      c = mix(base, cor, dentro * 0.18);
      c = mix(c, cor, max(anel, luz));
    }
  } else if (p == 10) {
    // escamas: arcos em fileiras desencontradas, com volume
    vec2 q = g * vec2(1.6, 2.0);
    q.x += mod(floor(q.y), 2.0) * 0.5;
    vec2 f = fract(q);
    float d = length((f - vec2(0.5, 1.0)) * vec2(1.0, 1.25));
    float linha = 1.0 - smoothstep(0.045, 0.045 + aa * 2.5, abs(d - 0.56));
    c = mix(base, cor, smoothstep(0.15, 0.6, d) * 0.55);
    c = mix(c, cor * 0.55, linha);
  } else if (p == 11) {
    // granulado: capsulas de bala giradas
    vec2 q = g * 2.4;
    vec2 id = floor(q);
    if (hash(id + 0.3) > 0.3) {
      vec2 c0 = vec2(hash(id + 3.7), hash(id + 6.1)) * 0.5 + 0.25;
      vec2 l = girar(fract(q) - c0, hash(id + 2.9) * 6.2832);
      float d = length(max(abs(l) - vec2(0.15, 0.0), 0.0)) - 0.07;
      c = mix(base, bala(hash(id + 4.4)), 1.0 - smoothstep(-aa * 2.4, aa * 2.4, d));
    }
  } else if (p == 12) {
    // gomos de citrico: membranas, pele clara na borda e casca
    float r = length(L) / max(r0, 1e-3);
    float an = atan(L.y, L.x);
    float s = fract(an / 6.2832 * 9.0);
    float w = aa * 9.0 / (6.2832 * max(length(L), 0.05));
    float memb = (1.0 - smoothstep(0.04, 0.04 + w * 1.5, min(s, 1.0 - s))) * smoothstep(0.1, 0.22, r);
    c = mix(base, cor, memb * 0.9);
    c = mix(c, cor, smoothstep(0.74, 0.78, r) * (1.0 - smoothstep(0.84, 0.88, r)));
    c = mix(c, base * 0.82, smoothstep(0.86, 0.9, r));
    c = mix(c, cor, (1.0 - smoothstep(0.06, 0.1, r)) * 0.9);
  } else if (p == 13) {
    // faixas do arco-iris
    float x = clamp(L.y / (2.0 * r0) + 0.5, 0.0, 0.9999) * 6.0;
    float i = floor(x);
    float w = clamp(fw * 6.0 / (2.0 * r0) * 1.5, 1e-3, 0.5);
    c = mix(faixa(i), faixa(i + 1.0), smoothstep(1.0 - w, 1.0, fract(x)) * step(i, 4.5));
  } else if (p == 14) {
    // nebulosa na cor da skin, com estrelas
    float n = ruido(g * 0.75 + vec2(tempo * 0.04, 0.0)) * 0.6 + ruido(g * 1.9) * 0.4;
    c = mix(base, cor, smoothstep(0.42, 0.9, n) * 0.75);
    float s = brilho(g * 2.1, 0.45, 0.16, tempo) + brilho(g * 4.3 + 11.0, 0.6, 0.12, tempo) * 0.7;
    c = mix(c, vec3(1.0), clamp(s, 0.0, 1.0));
  }
  return c;
}

// aparencia a (1..15): textura legada por baixo (opcional), depois a imagem ou a procedural;
// k = intensidade (a skin aparece aos poucos depois da fusao, como a textura)
vec3 aparencia(int a, int t, vec2 L, vec3 base, float k, float r0, float fw, float tempo) {
  int i = clamp(a, 1, 15) * 2;
  vec4 p0 = uAp[i];
  vec4 p1 = uAp[i + 1];
  vec3 c = t > 0 ? textura(t, L, base, 1.0, tempo) : base;
  if (p0.z >= 0.0) c = pixelArte(L, c, int(p0.z + 0.5), int(p0.w + 0.5), p0.y, r0, fw);
  else if (p0.x > 0.5) c = procAp(int(p0.x + 0.5), L, c, p1.rgb, p0.y, r0, fw, tempo);
  return mix(base, c, k);
}
#endif

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
#ifdef SKINS
  float fwL = max(fwidth(b.z), fwidth(b.w));
  int ap = int(tx.z + 0.5);
  if (ap == 0) lin = textura(int(tx.x + 0.5), b.zw, lin, tx.y, uTempo);
  else lin = aparencia(ap, int(tx.x + 0.5), b.zw, lin, tx.y, tx.w, fwL, uTempo);
#else
  lin = textura(int(tx.x + 0.5), b.zw, lin, tx.y, uTempo);
#endif

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

/** O mesmo fragmento com as skins ligadas. */
const FRAG_SKINS = FRAG.replace('#version 300 es\n', '#version 300 es\n#define SKINS 1\n');

/**
 * @param {HTMLCanvasElement} canvas
 * @returns {null | { desenhar: Function, definirAparencias: (lista: any[]) => void, perdeu: () => boolean, liberar: () => void }}
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
  /** @type {{ prog: WebGLProgram, loc: Record<string, WebGLUniformLocation|null> }|null} o de sempre */
  let base = null;
  /** @type {{ prog: WebGLProgram, loc: Record<string, WebGLUniformLocation|null> }|null} com skins (sob demanda) */
  let comSkins = null;
  let vao = null;
  let tex0 = null;
  let tex1 = null;
  let tex2 = null;
  let tex3 = null;
  const km = uniformesKM();
  // aparencias (skins): uniformes e atlas guardados para reenviar quando o contexto volta
  const apUni = new Float32Array(32 * 4);
  for (let a = 0; a < 16; a++) apUni[a * 8 + 2] = -1;
  const apAtlas = new Uint8Array(16 * 256 * 4);
  let apChave = '';
  let apUsada = false;

  function compilar(tipo, fonte) {
    const sh = gl.createShader(tipo);
    gl.shaderSource(sh, fonte);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS) && !gl.isContextLost()) {
      throw new Error('shader: ' + gl.getShaderInfoLog(sh));
    }
    return sh;
  }

  /** Um programa (o fragmento de sempre ou o com skins) com os uniformes fixos ja enviados. */
  function programa(frag) {
    const prog = gl.createProgram();
    gl.attachShader(prog, compilar(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compilar(gl.FRAGMENT_SHADER, frag));
    gl.bindAttribLocation(prog, 0, 'aPos');
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS) && !gl.isContextLost()) throw new Error('link: ' + gl.getProgramInfoLog(prog));
    const loc = {};
    for (const nome of ['uT0', 'uT1', 'uT2', 'uT3', 'uAp', 'uJanela', 'uCam', 'uTela', 'uTam', 'uCel', 'uPx', 'uLim', 'uTraco', 'uTempo', 'uBrilho', 'uKS', 'uM', 'uForca', 'uForcaB']) {
      loc[nome] = gl.getUniformLocation(prog, nome);
    }
    gl.useProgram(prog);
    gl.uniform4fv(loc.uKS, km.ks);
    gl.uniform4fv(loc.uM, km.m);
    gl.uniform4f(loc.uForca, km.forca[0], km.forca[1], km.forca[2], km.forca[3]);
    gl.uniform1f(loc.uForcaB, km.forca[4]);
    gl.uniform1i(loc.uT0, 0);
    gl.uniform1i(loc.uT1, 1);
    gl.uniform1i(loc.uT2, 2);
    if (loc.uT3) gl.uniform1i(loc.uT3, 3);
    return { prog, loc };
  }

  function montar() {
    base = programa(FRAG);
    comSkins = null;
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
    tex3 = gl.createTexture();
    // contexto recuperado com skins na partida: o programa delas volta junto
    if (apUsada) garantirSkins();
  }

  /** O programa com skins (compila na primeira vez que uma skin entra em jogo). */
  function garantirSkins() {
    if (!comSkins && !gl.isContextLost()) {
      comSkins = programa(FRAG_SKINS);
      enviarAparencias();
    }
    return comSkins;
  }

  /** Sobe os uniformes uAp e o atlas (16 x 256, sRGB, sem filtro) das skins. */
  function enviarAparencias() {
    if (!comSkins || gl.isContextLost()) return;
    gl.useProgram(comSkins.prog);
    gl.uniform4fv(comSkins.loc.uAp, apUni);
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, tex3);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.SRGB8_ALPHA8, 16, 256, 0, gl.RGBA, gl.UNSIGNED_BYTE, apAtlas);
    gl.activeTexture(gl.TEXTURE0);
  }

  /**
   * Aparencias da partida (skins, src/jogo/skins.js `aparencias`): o indice e a aparencia `ap`
   * que o campo grava por slime (1..15; a 0 e o caminho de sempre e nao usa nada daqui). So
   * reenvia quando muda; com alguma skin, ja compila o programa delas (sem engasgo na fusao).
   * @param {Array<import('../jogo/skins.js').Aparencia|null|undefined>} lista
   */
  function definirAparencias(lista) {
    const chave = (lista || []).map((a) => (a && a.ap ? a.chave : '')).join('|');
    if (chave === apChave) return;
    apChave = chave;
    apUni.fill(0);
    apAtlas.fill(0);
    const rgb = PALETA.map((h) => (h ? [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) : [0, 0, 0]));
    let alguma = false;
    for (let a = 0; a < 16; a++) {
      const ap = lista && a > 0 ? lista[a] : null;
      const o = a * 8;
      apUni[o + 2] = -1;
      if (!ap || !ap.ap) continue;
      alguma = true;
      apUni[o] = ap.proc || 0;
      apUni[o + 1] = ap.escala || 1;
      apUni[o + 3] = ap.modo === 1 ? 1 : 0;
      const c = ap.corLin || [1, 1, 1];
      apUni[o + 4] = c[0];
      apUni[o + 5] = c[1];
      apUni[o + 6] = c[2];
      if (ap.px) {
        apUni[o + 2] = a;
        for (let p = 0; p < 256; p++) {
          const i = ap.px[p] & 15;
          if (!i) continue;
          const k = (a * 256 + p) * 4;
          apAtlas[k] = rgb[i][0];
          apAtlas[k + 1] = rgb[i][1];
          apAtlas[k + 2] = rgb[i][2];
          apAtlas[k + 3] = 255;
        }
      }
    }
    if (alguma) apUsada = true;
    if (perdido) return;
    if (alguma) garantirSkins();
    enviarAparencias();
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
    // so usa o programa com skins quando algum slime do campo tem aparencia
    const P = (campo.comAparencia && garantirSkins()) || base;
    const loc = P.loc;
    const W = canvas.width;
    const H = canvas.height;
    gl.viewport(0, 0, W, H);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(P.prog);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex0);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, campo.nx, campo.ny, 0, gl.RGBA, gl.FLOAT, campo.t0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, tex1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, campo.nx, campo.ny, 0, gl.RGBA, gl.FLOAT, campo.t1);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, tex2);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, campo.nx, campo.ny, 0, gl.RGBA, gl.FLOAT, campo.t2);
    if (P === comSkins) {
      gl.activeTexture(gl.TEXTURE3);
      gl.bindTexture(gl.TEXTURE_2D, tex3);
      gl.activeTexture(gl.TEXTURE0);
    }
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
    definirAparencias,
    perdeu: () => perdido,
    liberar() {
      try { gl.getExtension('WEBGL_lose_context')?.loseContext(); } catch { /* ignora */ }
    },
  };
}
