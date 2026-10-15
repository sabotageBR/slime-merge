# CLAUDE.md

Guia para o Claude Code neste repositório.

# Slime Merge

Jogo HTML5 + JavaScript para a Poki. **Em produção desde 2026-10-14: "Merge Lab com opção de
Duelo"** (escolha do usuário entre 5 protótipos; roteiro em `docs/producao.md`). O diferencial é o **motor de slime**: partículas PBD com shape matching
plástico (o slime assume o formato do pote) e pigmento Kubelka-Munk espectral (a mistura de
cor é física: azul + amarelo = verde, misturar demais dá lama). Mesmo molde do `../2048_cards`
e do `../stringcut`: ES modules nativos, sem bundler, sem `npm install`; ferramentas em Node 22
+ `google-chrome` + `zip` + `ffmpeg`.

- **Plano aprovado:** `~/.claude/plans/quero-desenvolver-um-jogo-humming-teapot.md` (2026-10-14).
- **Referência visual:** `conceito/` (4 prints do jogo de referência e `powerups.jpg`).
- **Escolhas do usuário:** `docs/autoria.md`. **Roteiro da produção:** `docs/producao.md`.

## A build (o que vai para a Poki)
Abre direto no **sem fim** (Merge Lab). O menu (pausa, ESC/P, ou tocar nas gotas) tem 3 abas:
**Jogar** (Sem fim, Desafio do dia, Duelo contra a CPU com liga, 2 jogadores), **Loja** (cestos,
cenários e personagens por gotas) e **Missões** (3 do dia + sequência diária de 7 dias).
- Metajogo puro em `src/jogo/perfil.js` (uma moeda: gotas; loja, sequência, missões, desafio,
  liga; a data `hoje` entra de fora). Gravado em `slime.perfil`.
- `src/ui/menu.js` desenha o menu; `src/main.js` decide (troca de modo em tempo de execução,
  gotas no fim, 🎬 dobrar, 🎬 +1 reforço acabado, cesto novo vale na próxima partida).
- Os modos emitem `registro` (fusao/nivel/combo/poder/pontos, só o jogador 1), `pedirVideo` e
  `fim` (no Duelo com `venceu`/`vsCpu`).
- Protótipos (Croma, Loja, Molde, lab) só por `?modelo=` ou pelo hub; o `tools/empacotar.mjs`
  apaga os arquivos deles e as linhas `// prototipo` do `main.js`.

## Os 5 protótipos da avaliação (`?modelo=N`; 1 e 5 viraram modos da build)
1. **Merge Lab** (`src/jogo/modos/merge.js`): soltar e fundir iguais, 12 níveis
   (`src/jogo/niveis.js`), pote que assenta e "derrete", reforços da referência (trocar,
   chacoalhar, alargar, mira) e prêmios físicos (calor, gelo, tesoura, tinta).
2. **Croma** (`croma.js`): funde o mesmo tamanho de qualquer cor; a cor é a mistura física;
   Croma-dex de cores nomeadas; lama.
3. **Loja de Slime** (`loja.js`): pedidos de cor; despejar, sovar e entregar.
4. **Molde** (`molde.js`): puzzle de encher moldes por fases.
5. **Duelo** (`duelo.js`): dois potes, gosma cinza para o rival, CPU ou 2 jogadores.
- `?modelo=lab`: laboratório do material (gelatina, goo e líquido lado a lado).

## Estrutura
- `src/fisica/` (pura e **determinística**: só `+ - * /` e `sqrt`, sem `Math.random`, DOM ou
  relógio; vigiado por `test/estilo.test.js`): `mundo.js` (SoA, subpasso de 1/240 s, contato
  com escala de massa pela altura, shape matching + plasticidade + memória, coesão e XSPH em
  velocidade, paredes-cápsula, sono, contatos persistentes, fundir/dividir/redimensionar),
  `forma.js` (disco em girassol, atribuição por anel e ângulo), `materiais.js`, `paredes.js`.
- `src/cor/`: `pigmentos.js` (**gerado** por `node tools/pigmentos.mjs`), `km.js` (mistura KM,
  OKLab, ΔE, uniformes do shader), `difusao.js` (difusão que conserva pigmento e frente de
  transmutação Fisher-KPP).
- `src/render/`: `campo.js` (P2G na CPU: densidade total + cor e dominância do slime dominante
  por célula), `composicao.js` (WebGL2, um passe: limiar, contorno, costura onde a dominância
  cai, KM espectral por pixel, brilho), `fallback2d.js`, `fundo.js` (papel e pote), `rostos.js`,
  `vfx.js`, `guias.js` (mão e teclas do onboarding), `cena.js`, `camera.js`.
- Visual escolhível (Estúdio de visuais, `modelos/visuais.html`): `src/jogo/cestos.js` (8 cestos:
  geometria da colisão, linha, limite da mira), `src/render/cestos.js` (desenho por estilo e
  reflexo do vidro), `src/render/cenarios.js` (8 cenários), `src/render/rostos.js` (8 estilos de
  personagem; `desenharAtras` para orelhas/chifres/folha). O `main.js` lê `?cesto=&cenario=&objeto=`
  (local), `window.__slimeVisual`, a escolha do Estúdio em `slime.visual` (só quando abre por
  `?modelo=`/hub) ou o que o jogador equipou na loja (perfil). **Padrão escolhido pelo usuário
  (2026-10-14): béquer, jardim, clássico.** As paredes de Loja/Molde/lab seguem o estilo do cesto.
- `src/jogo/`: `soltar.js` (motor dos jogos de soltar: 1 ou 2 jogadores, fila, reforços,
  fusões, resgate nos 3 primeiros minutos, bot), `pote.js` (mira, preso, perigo, combo,
  chacoalhar, alargar), `goo.js` (bicos e massas de goo que se juntam), `niveis.js`, `cores.js`
  (40 cores com nome), `fases-molde.js`, `missoes.js`, `modos/*.js`. Contrato do modo: `criarModo({ semente, salvo, toque })` →
  `{ mundo, janela, campoJanela, eventos, passo, apontar, tecla, poder, bot, hud, visual,
  reiniciar, reviver, salvar }`.
- `src/core/`: `poki.js`, `armazenamento.js`, `depuracao.js`, `haptico.js`, `rng.js`, `audio.js`
  (copiados do 2048_cards), `laco.js`, `entrada.js`. `src/ui/`: `hud.js`, `menu.js`, `estilo.css`, fontes,
  `loja/*.webp` (miniaturas da loja: `node tools/prints-visuais.mjs --miniaturas`).
- `src/main.js` liga tudo e é o **único** que importa `core/poki.js`.

## Convenções
- Código e comentários em português, comentários em ASCII; 2 espaços, aspas simples, ponto e
  vírgula, JSDoc.
- Um relógio só (`performance.now()` no laço); o rAF sai antes de desenhar; nada desenha em
  canvas 0×0; sem `roundRect` (Safari antigo).
- Toda proposta visual vai como imagem ou protótipo jogável.

## Comandos
| Comando | O que faz |
|---|---|
| `npm test` | Física, cor, wrapper Poki, fronteiras, perfil e os modos com o bot (64 testes, ~4 min) |
| `npm run menu` | Fluxo da build no Chrome headless: sequência, gotas no fim, dobrar, loja, missões, troca de modo. Prints em `.tmp/menu/`. `-- --tam=640x360` |
| `npm run empacotar` | Build da Poki em `dist/` e zip em `dist-poki/` (sem protótipos; < 500 KB gzip) |
| `npm run servir` | `http://127.0.0.1:5370/` (jogo) e `/modelos/` (hub de avaliação); `-- --lan` mostra o endereço para o celular |
| `npm run jogar` | Joga os modelos em tempo real (Chrome headless pelo DevTools Protocol, `tools/cdp.mjs`): gestos, pausa, mudo, reforço, fim, revive, jogar de novo. `-- 1 4 --tam=1031x580` |
| `npm run sdkcheck` | Banco do SDK da Poki em 5 cenários (`tools/sdkcheck.html`, ganchos `window.__slimeTeste`) |
| `npm run telas` | Iframe com altura/largura 0, escondido e girado |
| `npm run bancada` | ms de física, cor e campo com ~1.600 partículas |
| `npm run gifs` | GIFs e capas dos modelos em `docs/modelos/` (filme determinístico `?filme=N&cada=K`) |
| `node tools/prints-visuais.mjs [cestos\|cenarios\|objetos]` | Prints das alternativas de visual em `docs/visuais/` (mesma partida para comparar) |
| `npm run artifact` | Monta `.tmp/artifact/` (hub + `jogo-N.html` sem o SDK + `src/`) para publicar no claude.ai |
| `npm run empacotar` | Ensaio da build da Poki (`dist/`, `dist-poki/`; < 500 KB gzip; `--thumb` quando houver thumb) |
| `node tools/shot.mjs "<query>" LxA saida.png [ms]` | Print no Chrome headless (WebGL2 funciona). Ex.: `"modelo=1&semente=3&auto=800&passos=1800"` |
| `node tools/pigmentos.mjs` | Regera `src/cor/pigmentos.js` e imprime o relatório de misturas |

**Parâmetros de teste** (só localhost/rede local, `src/core/depuracao.js`): `?modelo=`, `?debug` (no lab:
sliders do material), `?semente=`, `?passos=N` (física antes do 1º desenho), `?auto=ms` (bot),
`?semanuncio`, `?lang=`, `?render=2d`, `?raio=&limiar=` (núcleo do campo), `?zoom=x0,y0,x1,y1`,
`?filme=N&cada=K`, `?vitrine=1|2|3` (níveis altos no pote, para ver as texturas). Fora do localhost o modelo vem de `window.__slimeModelo` (páginas `jogo-N.html`).

## Avaliação
- Hub: `modelos/index.html`; Artifact privado https://claude.ai/artifact/5EgsYqYhWBrWJhARzaQTxy
  (republicar: `npm run artifact` e publicar `.tmp/artifact/index.html` com `root: .tmp/artifact`).
- Resumo comparativo e medidas: `docs/modelos.md`.
