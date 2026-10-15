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
- **Repositório:** https://github.com/sabotageBR/slime-merge (privado, branch `main`).

## A build (o que vai para a Poki)
Abre direto no **sem fim** (Merge Lab). O menu (pausa, ESC/P, ou tocar nas gotas) tem 3 abas:
**Jogar** (Sem fim, Desafio do dia, Duelo contra a CPU com liga, 2 jogadores), **Loja** (cestos,
cenários, personagens e **skins** por gotas) e **Missões** (3 do dia + sequência diária de 7 dias).
- Metajogo puro em `src/jogo/perfil.js` (uma moeda: gotas; loja, skins por nível, sequência,
  missões, desafio, liga; a data `hoje` entra de fora). Gravado em `slime.perfil`.
- **Skins** (escolhidas em 2026-10-15): em cada nível a padrão, 2 prontas e a Minha (desenhada no
  editor de pixel `src/ui/editor.js`, tela `#telaEditor`); só nos níveis já descobertos. A skin
  troca o pigmento (a física não muda); os modos recebem a tabela `aparencias` e trocam ao vivo
  (`definirAparencias`); o render usa o programa `#define SKINS` só quando há skin.
- `src/ui/menu.js` desenha o menu; `src/main.js` decide (troca de modo em tempo de execução,
  gotas no fim, 🎬 dobrar, 🎬 +1 reforço acabado, cesto novo vale na próxima partida).
- Os modos emitem `registro` (fusao/nivel/combo/poder com o `id`/pontos, só o jogador 1), `nivel`
  (start na partida nova, complete em cada nível novo, fail no fim), `cresceu`, `pedirVideo` e
  `fim` (no Duelo com `venceu`/`vsCpu`).
- **Retenção (1.1.0, depois do Player Fit Test da 1.0.0; roteiro em `docs/producao.md`):** o pote
  do sem fim nasce estreito (`INICIO` em `merge.js`) e cresce no nível 6 ou aos 150 s; a meta da
  vez fica acima da barra; cartão de slime novo; dica do reforço aos 60 s; demonstração para quem
  não toca; "quase lá" e o próximo item da loja no fim; qualidade adaptativa do render
  (`src/render/qualidade.js`); a telemetria nova está listada no roteiro.
- Protótipos (Croma, Loja, Molde, lab) só por `?modelo=` ou pelo hub; o `tools/empacotar.mjs`
  apaga os arquivos deles e as linhas `// prototipo` do `main.js`.

## Os 5 protótipos da avaliação (`?modelo=N`; 1 e 5 viraram modos da build)
1. **Merge Lab** (`src/jogo/modos/merge.js`): soltar e fundir iguais, 13 níveis
   (`src/jogo/niveis.js`; o 13 é de lava, escolha de 2026-10-15), pote que assenta e
   "derrete", soltar em cima da borda (guias invisíveis no topo das paredes, `pote.js`),
   reforços da referência (trocar, chacoalhar, alargar, mira com míssil teleguiado) e prêmios
   físicos (calor, gelo, tesoura, tinta).
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
  `vfx.js` (respingos, textos, explosão), `guias.js` (mão e teclas do onboarding, retícula de
  mira), `qualidade.js` (qualidade adaptativa pelo fps, pura), `missil.js` e `gosma.js` (míssil da mira e gosma que escorre no canvas `cTela`, por
  cima do HUD), `cena.js`, `camera.js`.
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
  (40 cores com nome), `fases-molde.js`, `missoes.js`, `skins.js` (skins por nível: paleta,
  codec da pixel art, catálogo `SKINS` com as 26 escolhidas, `aparencia`), `modos/*.js`. Contrato do modo: `criarModo({ semente, salvo, toque })` →
  `{ mundo, janela, campoJanela, eventos, passo, apontar, tecla, poder, bot, hud, visual,
  reiniciar, reviver, salvar }`.
- `src/core/`: `poki.js`, `armazenamento.js`, `depuracao.js`, `haptico.js`, `rng.js` (copiados
  do 2048_cards), `audio.js` (barramentos sfx/voz/música, compressor, mudo do anúncio), `laco.js`,
  `entrada.js`. `src/som/`: `catalogo.js` (categorias × variantes; `PADRAO` = escolha do usuário
  de 2026-10-15, sem música e com o locutor de voz de slime; `LEGADO`),
  `receitas.js` (síntese), `falas.js` (balbucio), `sons.js` (`tocar`/`falar`), `musica.js` e
  `pecas.js` (música procedural), `arquivos/*.mp3` (CC0 Kenney; só os do `PADRAO` vão para a build).
  `src/render/palco.js` (um slime isolado no pipeline real: prévia e miniaturas das skins).
  `src/ui/`: `hud.js`, `menu.js`, `icones.js` (ícones dos reforços em SVG e Path2D),
  `editor.js`/`editor.css` (editor de pixel das skins), `miniaturas.js`, `estilo.css`, fontes,
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
| `npm test` | Física, cor, wrapper Poki, fronteiras, perfil, os modos com o bot, borda, míssil, pote estreito, telemetria de nível, qualidade adaptativa, áudio, sons, música e skins (133 testes, ~35 s) |
| `npm run menu` | Fluxo da build no Chrome headless: sequência, gotas no fim, dobrar, loja, missões, troca de modo, Loja › Skins e o editor (pintar, salvar, Esc). Prints em `.tmp/menu/`. `-- --tam=640x360` |
| `npm run empacotar` | Build da Poki em `dist/` e zip em `dist-poki/` (sem protótipos; < 500 KB gzip); `-- --thumb` confere e anexa `marketing/thumb/slime-merge-1256.png` |
| `npm run thumb` | Opções de thumb da Poki (`tools/thumb.html`: física e render do jogo) em `marketing/thumb/`, com tiles e a régua (#83FFE7, tarja, opaca); `-- --final` grava a escolhida (`ESCOLHIDA` em `tools/thumb.mjs`) em `slime-merge-{1256,628}` |
| `npm run servir` | `http://127.0.0.1:5370/` (jogo) e `/modelos/` (hub de avaliação); `-- --lan` mostra o endereço para o celular |
| `npm run jogar` | Joga os modelos em tempo real (Chrome headless pelo DevTools Protocol, `tools/cdp.mjs`): gestos, pausa, mudo, reforço, fim, revive, jogar de novo. `-- 1 4 --tam=1031x580` |
| `npm run sdkcheck` | Banco do SDK da Poki em 5 cenários (`tools/sdkcheck.html`, ganchos `window.__slimeTeste`) |
| `npm run telas` | Iframe com altura/largura 0, escondido e girado |
| `npm run bancada` | ms de física, cor e campo com ~1.600 partículas |
| `npm run gifs` | GIFs e capas dos modelos em `docs/modelos/` (filme determinístico `?filme=N&cada=K`) |
| `node tools/prints-visuais.mjs [cestos\|cenarios\|objetos]` | Prints das alternativas de visual em `docs/visuais/` (mesma partida para comparar) |
| `node tools/prints-reforcos.mjs` | Botões de reforço (colados no pote) em 3 tamanhos, no Duelo e a folha de ícones (`tools/icones.html`) em `docs/visuais/` |
| `node tools/sons.mjs baixar\|listar\|converter\|medir` | Pacotes CC0 da Kenney para `src/som/arquivos/` (MP3 mono 56 kbps, loudnorm, atraso medido) e `LICENCAS.txt` |
| `node tools/prints-skins.mjs` | Catálogo das skins e prints do editor em `docs/skins/` |
| `node tools/quadros.mjs [--tam=1031x580]` | Quadros e GIF do míssil da mira (laço pausado, `__slime.avancar(n)`) em `docs/visuais/missil-*` |
| `npm run artifact` | Monta `.tmp/artifact/` (hub + `jogo-N.html` sem o SDK + `src/`) para publicar no claude.ai |
| `node tools/shot.mjs "<query>" LxA saida.png [ms]` | Print no Chrome headless (WebGL2 funciona). Ex.: `"modelo=1&semente=3&auto=800&passos=1800"` |
| `node tools/pigmentos.mjs` | Regera `src/cor/pigmentos.js` e imprime o relatório de misturas |

**Parâmetros de teste** (só localhost/rede local, `src/core/depuracao.js`): `?modelo=`, `?debug` (no lab:
sliders do material), `?semente=`, `?passos=N` (física antes do 1º desenho), `?auto=ms` (bot),
`?semanuncio`, `?lang=`, `?render=2d`, `?raio=&limiar=` (núcleo do campo), `?zoom=x0,y0,x1,y1`,
`?filme=N&cada=K`, `?vitrine=1..5` (níveis altos no pote, para ver as texturas; 5 = o 13),
`?bot=borda` (o `?auto` solta em cima da borda), `?poder=<id>`, `?expr=choro`, `?demoReforcos`
(botões em todos os estados), `?sons=cat:variante`, `?skins=todas` (uma skin em cada nível),
`?qualidade=0|1|2` (fixa o render e desliga a adaptativa). A prévia de `modelos/escolhas.html` passa a
vitrine por `slime.escolha`. Fora do localhost o modelo vem de `window.__slimeModelo` (páginas `jogo-N.html`).

## Avaliação
- Hub: `modelos/index.html`, com `visuais.html`, `escolhas.html` (registro de 2026-10-15: botões
  colados no pote e nível 13 de lava, com a prévia), `sons.html` (Estúdio de sons, grava `slime.sons`) e `skins.html`
  (Estúdio de skins com o editor, grava `slime.skinsEstudio`); Artifact privado https://claude.ai/artifact/5EgsYqYhWBrWJhARzaQTxy
  (republicar: `npm run artifact` e publicar `.tmp/artifact/index.html` com `root: .tmp/artifact`).
- Resumo comparativo e medidas: `docs/modelos.md`.
