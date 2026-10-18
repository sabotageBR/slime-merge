# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
Abre direto no **sem fim** (Merge Lab), que **não acaba** desde a 2.0.0 (pressão sem derrota, abaixo). O menu (pausa, ESC/P, ou tocar nas gotas) tem 3 abas:
**Jogar** (Sem fim, Desafio do dia, Duelo contra a CPU com liga, 2 jogadores), **Loja** (cestos,
cenários, personagens e **skins** por gotas) e **Missões** (3 do dia + sequência diária de 7 dias).
- Metajogo puro em `src/jogo/perfil.js` (uma moeda: gotas; loja, skins por nível, sequência,
  missões, desafio, liga; a data `hoje` entra de fora). Gravado em `slime.perfil`.
- **Skins** (escolhidas em 2026-10-15): em cada nível a padrão, 2 prontas e a Minha (desenhada no
  editor de pixel `src/ui/editor.js`, tela `#telaEditor`); só nos níveis já descobertos. A skin
  troca o pigmento (a física não muda); os modos recebem a tabela `aparencias` e trocam ao vivo
  (`definirAparencias`); o render usa o programa `#define SKINS` só quando há skin.
- `src/ui/menu.js` desenha o menu; `src/main.js` decide (troca de modo em tempo de execução,
  gotas no fim (no sem fim, ao longo da partida: `pagarParcial`), 🎬 dobrar, 🎬 +1 reforço acabado,
  cesto novo vale na próxima partida).
- Os modos emitem `registro` (fusao/nivel/combo/poder com o `id`/pontos, só o jogador 1), `nivel`
  (start na partida nova, complete em cada nível novo, fail no fim), `cresceu`, `pedirVideo`,
  `fim` (no Duelo com `venceu`/`vsCpu`; o sem fim não emite) e, no sem fim, `evento`
  (aviso com a `classe`/start/pressa/fim/ok/falhou), `escada`, `resgate`, `recorde` (passou o de antes
  da partida, uma vez) e `intervalo` (`origem: 'evento'`). Os `som` de reforço e ataque levam o `pote`.
- **Retenção (1.1.0, depois do Player Fit Test da 1.0.0; roteiro em `docs/producao.md`):** o pote
  do sem fim nasce estreito (`INICIO` em `merge.js`) e cresce no nível 6 ou aos 150 s; a meta da
  vez fica acima da barra; cartão de slime novo; dica do reforço aos 60 s; demonstração para quem
  não toca; "quase lá" e o próximo item da loja no fim; qualidade adaptativa do render
  (`src/render/qualidade.js`); a telemetria nova está listada no roteiro.
- **Retenção (1.2.0, depois dos 2 Player Fit Tests da 1.1.1):** cartão de slime novo no alto (fora da
  mira no retrato); o celular começa na qualidade média e há o degrau `minima`; do nível 9 em diante a
  pílula alterna com uma meta curta (missão do dia ou as metas da partida de `src/jogo/missoes.js`);
  telemetria `partida/*`, `sair/*`, `custo/*`, `fps1/*` (hoje `fpsini/*`) e `meta/*` (lista no roteiro).
- **Retenção 2.0.0: pressão sem derrota (depois do Player Fit Test da 1.2.0: 92% saíam com o pote
  vivo e a novidade acabava no minuto 3; escolhas de 2026-10-17 em `docs/autoria.md`).** No sem fim,
  `src/jogo/pressao.js` (puro):
  - **escada:** do nível 9 em diante cada nível novo sobe o piso das gotas (`pisoPara`, teto 4: caem
    4 a 8, com `PESOS_ESCADA`); os slimes abaixo do piso evoluem ("Evolução!");
  - **agenda:** um evento a cada 60 s a partir dos 90 s (coringas, pedido, terremoto, gigante, calor,
    gelo; a chuva de gosma cinza saiu em 2026-10-17), com aviso no pote e a pílula da meta com contagem;
    o terremoto treme o pote inteiro **uma vez** (`pote.tremer`, 1,8 s: as paredes andam, o cesto e a tela
    tremem junto; eram 3 tremores até 2026-10-18);
  - **sem derrota:** o "Ufa!" vale a partida inteira (`resgatarSempre`) e zera o combo; o coringa não
    faz o próximo recorde;
  - **intervalo comercial:** no fim de um evento, do 3º em diante, com 150 s de jogo desde o anterior
    (`ESPACO_ANUNCIO`);
  - a gosma cinza (`src/jogo/cinza.js`) ficou só no Duelo.
  `?pressao=0` volta ao sem fim da 1.2.0 (com fim de partida).
- **Versão 2.0.1 (revisão do usuário em 2026-10-17, antes do envio; escolhas em `docs/autoria.md`):**
  - **fusão animada** (`FUSAO` em `soltar.js`, Merge e Duelo): `atrai` (os iguais se abraçam; quem
    encosta ou chega a 0,5 u entra no grupo), `funde` (um corpo só que encolhe aos poucos) e o estalo;
    **3+ iguais juntos pulam um nível (k+2)**. Quem está fundindo (`dados.fundindo`) fica fora da mira,
    do bot, do "Ufa!", da evolução e do perigo; o save guarda os membros de antes; a janela do combo
    para enquanto há fusão;
  - **selo do combo** ao lado do pote (`guias.js`, a partir do ×2; o texto `x2` saiu);
  - **humor de cada slime** (`src/jogo/humor.js`): contente, neutro, amassado, chorinho (aperto =
    alongamento + vizinhos), apático (20 s parado) e a careta da pancada de quem cai (desde 2026-10-18,
    5 em rodízio por slime, `PANCADA`: furioso, zonzo, susto, emburrado, xingando); o passageiro passa
    por cima;
  - **gosma do míssil** do tamanho do slime, que escorre com massa e aderência (`render/gosma.js`);
  - **tela de loading** (`#carregando` no `index.html`, só HTML e CSS; sai no 1º quadro).
- **Versão 2.0.2 (depois do Player Fit Test da 2.0.1: 6m55s; 2026-10-18; escolhas em `docs/autoria.md`,
  análise em `docs/producao.md`):**
  - **slime atravessado na parede** (print do iPhone): a parede é cápsula de dois lados. Agora há
    **teste de travessia** no `mundo.js` (`contatosParedes`: quem cruzou o eixo no subpasso volta para
    o lado de onde veio; a pré-estabilização também), a separação **só na posição** depois de partículas
    novas (`assentarNovas`: `redimensionar`, `recolocar`, `reposicionar`), o **save com a forma** de cada
    slime (`formaDe` no `merge.js`; `criarSlime({ pontos })`; o pote abre na hora ao restaurar), a mira
    que recua para o slime grande (`folgaGrande`), fusão só dentro do pote (`livre` + `pote.contem`), o
    remendo preso dentro (`pontoRemendo`, `pote.lugar`) e a **rede de segurança** do `pote.js` (`rede`:
    poucas partículas fora voltam para a face de dentro; um pedaço grande por `REDE_T` s volta o slime
    inteiro, evento `volta`, telemetria `rede/volta/m<min>`). Caçada: `node tools/vazamento.mjs`;
  - **olhos sempre abertos** (`rostos.js`): sem piscar; feliz, amassado, chorinho, choro e apático com
    o olho aberto (brilho, água no olho, olheira, sobrancelha, boca); a carinha do loading também;
  - **nível 14** (8,0 u: dois cabem em 100% do béquer; `d` na linha de `NIVEIS`): nasce de verdade
    (cartão, funil, gotas), **comemora ~2 s e estoura** (fase `comemora` do `soltar.js`: `maxNivel`,
    `comemora`, `estourar`; vale também para a tinta, o save e o Duelo); o **super slime** é isso. O
    novo alvo: **super slimes da partida** (`J.supers`, recorde `perfil.recordeSupers`, `PREMIO_SUPER`,
    pílula "Super slimes: N · recorde M", telemetria `super/<n>/m<min>`). Visual: ouro (textura 8 do
    shader, escolhido entre ouro, cristal, aurora e plasma); skins Troféus e Coroas;
  - **loading em camadas**: uma gota de cada nível cai e vira uma camada daquela cor;
  - **HUD no retrato**: o placar sai do canto do botão da Poki (58 px à esquerda; abaixo de 380 px de
    largura, desce para baixo dele) e mostra só o número dos pontos.
- **Botões de reforço (2026-10-18, depois da 2.0.2):** bolhas de gel com uma cor por reforço, o número no
  canto e o nome numa etiqueta embaixo (opção 1 de 5; registro em `docs/visuais/botoes-comparar-*`).
- **Versão 2.0.3 (depois do Player Fit Test da 2.0.2: 7m41s, 6m53s limitando a 30 min; pacote aprovado em
  2026-10-18; análise em `docs/producao.md`, escolhas em `docs/autoria.md`):**
  - **meta combo:** depois do combo 4 ela sobe (5, 6, 7...); antes a combo-4 se cumpria ~59 vezes por partida;
  - **vídeo que falha:** "Sem vídeo agora" e 30 s de espera (`ESPERA_VIDEO`), botões do vídeo apagados;
  - **física −30% no fim de jogo sem mudar a simulação** (mesmo `hash()`): marcas por partícula, cópias na
    ordem das células, ponteiro por célula, `rijP` e paredes por baldes (`mundo.js`). Ao mexer nesses laços,
    conferir o hash antes/depois e medir com `node tools/bancada.mjs --fim`;
  - **coringa no fim de jogo:** com o 13 feito, um a cada 3 eventos (`NIVEL_FIM`, `FIM_CORINGA`, `Agenda.f`);
  - **fusão de abertura:** a partida nova do sem fim nasce com uma gotinha no fundo e a gota da mão igual,
    que cai sozinha em 1 s sem toque (gancho `abrir` do `soltar.js`, opção `abertura` do `merge.js`,
    `abrirSozinho` no `main.js`); a demonstração espera 2 s e solta até 3 gotas;
  - **telemetria:** `intervalo/<origem>/start|complete` e `ufa/resgate/start|complete` (complete com 20 s de
    jogo depois), `dica/abertura/show`. A faixa `custo/fisica-16` é **8–16 ms** (`faixaMs`).
- **Versão 2.0.4 (revisão de 2026-10-18 à noite; escolhas em `docs/autoria.md`):** terremoto com **um tremor só**
  (`EVENTOS.terremoto.dur` 2,5 s); **5 caretas da pancada** em rodízio (`PANCADA` e `careta()` no `humor.js`;
  desenho em `sobrancelhasDaPancada`, `bocaDoHumor` e `extrasCareta` do `rostos.js`, sem balão nem "!"; folha
  `docs/visuais/humor-pancada-1000x1000.jpg`); o **vídeo do míssil volta com a mira armada** (`darPoder`).
- **Versão 2.0.5: falas do locutor de slime (2026-10-18, depois da 2.0.4; escolhas em `docs/autoria.md`):** "Ready?…
  Go!" no começo de cada partida e de cada rodada do Duelo (fala e texto no meio de cada pote, `largada()`
  no `main.js`, `LARGADA_VAI` 0,75 s; o texto fica em inglês nas 3 línguas); o **combo contado** do x3 ao
  x10 ("Three!"…"Ten!", mais rápido a cada degrau); o aviso de evento pela classe ("Get down!" no
  terremoto, "Power up!" no alívio, "Look out!" no resto); o pedido ("Hurry up!" nos 5 s finais,
  "Objective achieved!", "Time over"); "Medic!" no "Ufa!"; "Target engaged"/"Target destroyed!" no míssil;
  "Reloading!" no trocar; "New high score!" (e o aviso) quando o sem fim passa o recorde; "Congratulations!"
  no recorde de super slimes e na sequência diária (o aviso dela agora vem no primeiro gesto, ou mudo aos
  6 s); no Duelo "Fire in the hole!" (gosma de 2+), "You lose" contra a CPU e "You win!" no de 2 jogadores.
  A CPU não fala (`minhaVoz`). O tocador (`sons.js`) fala **uma por vez** com fila de uma por
  `PRIORIDADE` (marcos > missão/resgate > eventos e reforços > combo; cada uma vale `VALIDADE` s
  esperando; o `main.js` chama `sons.passo()` a cada quadro) e o arquivo toca mais agudo nos slimes
  pequenos e grave nos grandes (`taxaDoNivel`). Arquivos: `node tools/sons.mjs converter` (Voiceover Pack,
  as duas vozes); a build leva só as de slime (~136 KB de áudio; o limite do empacotar subiu para 150 KB).
- **Versão 2.0.6 (2026-10-18, depois da 2.0.5):** o pote não muda mais de tamanho quando a pílula da meta
  troca (a missão longa jogava a barra para uma segunda linha na paisagem e a câmera encolhia o pote ~8%);
  ver a convenção da `#area` abaixo.
- Protótipos (Croma, Loja, Molde, lab) só por `?modelo=` ou pelo hub; o `tools/empacotar.mjs`
  apaga os arquivos deles e as linhas `// prototipo` do `main.js`.

## Os 5 protótipos da avaliação (`?modelo=N`; 1 e 5 viraram modos da build)
1. **Merge Lab** (`src/jogo/modos/merge.js`): soltar e fundir iguais, 14 níveis
   (`src/jogo/niveis.js`; o 13 é de lava, escolha de 2026-10-15; o 14 comemora e estoura), pote que assenta e
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
- `src/fisica/` (pura e **determinística**: só `+ - * /` e `sqrt`; ver Convenções): `mundo.js` (SoA, subpasso de 1/240 s, contato
  com escala de massa pela altura, shape matching + plasticidade + memória, coesão e XSPH em
  velocidade, paredes-cápsula com tremor separado da base (`tremerParedes`), sono, contatos persistentes,
  fundir (um ou vários)/dividir/redimensionar, e o da fusão animada: `atrair`, `aparar`, `amolecer`,
  `pertoDe`, `refazerForma`, `escalarForma`, `rampaVel`),
  `forma.js` (disco em girassol, atribuição por anel e ângulo), `materiais.js`, `paredes.js`.
- `src/cor/`: `pigmentos.js` (**gerado** por `node tools/pigmentos.mjs`), `km.js` (mistura KM,
  OKLab, ΔE, uniformes do shader), `difusao.js` (difusão que conserva pigmento e frente de
  transmutação Fisher-KPP).
- `src/render/`: `campo.js` (P2G na CPU: densidade total + cor e dominância do slime dominante
  por célula), `composicao.js` (WebGL2, um passe: limiar, contorno, costura onde a dominância
  cai, KM espectral por pixel, brilho), `fallback2d.js`, `fundo.js` (papel e pote), `rostos.js` (e os humores),
  `vfx.js` (respingos, textos, explosão), `guias.js` (mão e teclas do onboarding, retícula de
  mira, selo do combo e aura das fusões), `qualidade.js` (qualidade adaptativa pelo fps, pura), `missil.js` e `gosma.js` (míssil da mira e gosma que escorre no canvas `cTela`, por
  cima do HUD), `cena.js`, `camera.js`.
- Visual escolhível (Estúdio de visuais, `modelos/visuais.html`): `src/jogo/cestos.js` (8 cestos:
  geometria da colisão, linha, limite da mira), `src/render/cestos.js` (desenho por estilo e
  reflexo do vidro), `src/render/cenarios.js` (8 cenários), `src/render/rostos.js` (8 estilos de
  personagem; `desenharAtras` para orelhas/chifres/folha). O `main.js` lê `?cesto=&cenario=&objeto=`
  (local), `window.__slimeVisual`, a escolha do Estúdio em `slime.visual` (só quando abre por
  `?modelo=`/hub) ou o que o jogador equipou na loja (perfil). **Padrão escolhido pelo usuário
  (2026-10-14): béquer, jardim, clássico.** As paredes de Loja/Molde/lab seguem o estilo do cesto.
- `src/jogo/`: `soltar.js` (motor dos jogos de soltar: 1 ou 2 jogadores, fila, reforços,
  fusões animadas e em grupo, resgate nos 3 primeiros minutos ou sempre com `resgatarSempre`, bot), `pote.js` (mira, preso, perigo, combo,
  chacoalhar, alargar, tremor, rede de segurança e geometria: `contem`, `lugar`, `prenderPontos`), `niveis.js`, `perfil.js`, `missoes.js` (metas da partida em cadeia, no
  meio do sem fim), `pressao.js` (escada e agenda de eventos do sem fim), `humor.js` (o rosto de base de
  cada slime), `cinza.js` (gosma cinza do Duelo), `skins.js` (skins por nível: paleta, codec da pixel art, catálogo `SKINS` com
  as 28 escolhidas, `aparencia`), `modos/*.js`. Só dos protótipos (saem da build; código da build
  não pode importá-los, o `empacotar` falha com import quebrado): `goo.js` (bicos e massas de
  goo), `cores.js` (40 cores com nome) e `fases-molde.js`.
- Contrato do modo: `criarModo({ semente, salvo, toque, lang, cesto, visto, vitrine, aparencias,
  regra, liga, doisJogadores })` (o `configModo` do `main.js` monta as opções a partir do perfil) →
  `{ mundo, janela, campoJanela, eventos, passo, apontar, tecla, poder, bot, hud, visual,
  reiniciar, reviver, salvar }`. Merge, Duelo e Croma são `criarSoltar(regras, o)` com ganchos
  (`sortear`, `criar`, `fusao`, `passo`, `transbordou`...; typedef `Regras` no `soltar.js`). Merge e
  Duelo têm a fusão animada (`animar`, `particulas`, `agrupa`, `nivelGrupo`, `juntar`, `concluir`);
  o Croma continua com o `fundir` na hora.
- Fluxo de um quadro: `core/laco.js` chama `modo.passo(1/60)` (a física faz 4 subpassos) →
  o modo empurra eventos em `modo.eventos` (`som`, `pouso`, `fusao`, `texto`, `nivel`,
  `registro`, `pedirVideo`, `fim`...) → `tratarEventos()` do `main.js` drena e vira áudio, VFX,
  `poki.measure` e metajogo (o modo nunca toca DOM, áudio ou SDK) → `cena.desenhar(modo)` em
  canvases empilhados (`cFundo` papel/pote, `cSlime` WebGL2, `cTopo` rostos/VFX; `cTela` por cima
  do HUD); HUD e menu em DOM. Textos de evento são chaves de `src/i18n/textos.js` (EN padrão;
  PT/ES pelo navegador).
- `src/core/`: `poki.js`, `armazenamento.js`, `depuracao.js`, `haptico.js`, `rng.js` (copiados
  do 2048_cards), `audio.js` (barramentos sfx/voz/música, compressor, mudo do anúncio), `laco.js`,
  `entrada.js`. `src/som/`: `catalogo.js` (categorias × variantes; `PADRAO` = escolha do usuário
  de 2026-10-15, sem música e com o locutor de voz de slime; `LEGADO`),
  `receitas.js` (síntese), `falas.js` (balbucio e a lista das falas do jogo), `sons.js` (`tocar`/`falar`,
  a fila das falas e o `passo`), `musica.js` e
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
- A câmera enquadra a `#area` do HUD: o que muda durante a partida não pode mudar a altura da
  `#meta`, do `#topo` nem da `#base`, senão o pote cresce e encolhe. A pílula da meta tem altura
  fixa, e na paisagem a `#meta.barra` tem a altura da barra (a pílula que não cabe ao lado sobe por
  cima do pé da área).
- Fronteiras vigiadas por `test/estilo.test.js`: `src/jogo/`, `src/fisica/` e `src/cor/` sem
  `Math.random`, `document`/`window`, `Date.now`/`performance.now` nem `setTimeout` (sorteio
  por `core/rng.js` com semente); `src/fisica/` também sem `Math.sin/cos/pow/exp...` nem `**`
  (determinismo entre V8 e JSC); `localStorage` só em `core/armazenamento.js` (prefixo
  `slime.`); a URL só em `core/depuracao.js`; nada de `console.log/info/debug`; a única URL
  externa é a do SDK da Poki; `src/` não importa `modelos/` nem `tools/`.
- Toda proposta visual vai como imagem ou protótipo jogável.

## Comandos
| Comando | O que faz |
|---|---|
| `npm test` | Física, cor, wrapper Poki, fronteiras, perfil, os modos com o bot, borda, míssil, pote estreito, telemetria de nível e do resgate, qualidade adaptativa, metas da partida, pressão do sem fim (`test/pressao.test.js`), fusão animada e tremor (`test/fusao.test.js`), humor (`test/humor.test.js`), parede (`test/parede.test.js`), áudio, sons, música e skins (186 testes, ~95 s) |
| `node --test test/fisica.test.js` | Um arquivo só (`node:test`, sem dependências); `--test-name-pattern="Croma"` filtra pelo nome do teste |
| `npm run menu` | Fluxo da build no Chrome headless: sequência, gotas no fim, dobrar, loja, missões, troca de modo, Loja › Skins e o editor (pintar, salvar, Esc). Prints em `.tmp/menu/`. `-- --tam=640x360` |
| `npm run empacotar` | Build da Poki em `dist/` e zip em `dist-poki/` (sem protótipos; só os sons do `PADRAO`; recusa import quebrado, URL externa, `console.log`, `.map`, > 500 KB gzip e áudio > 150 KB); `-- --thumb` confere e anexa `marketing/thumb/slime-merge-1256.png` (sem ele é ensaio) |
| `npm run thumb` | Opções de thumb da Poki (`tools/thumb.html`: física e render do jogo) em `marketing/thumb/`, com tiles e a régua (#83FFE7, tarja, opaca); `-- --final` grava a escolhida (`ESCOLHIDA` em `tools/thumb.mjs`) em `slime-merge-{1256,628}` |
| `npm run servir` | `http://127.0.0.1:5370/` (jogo) e `/modelos/` (hub de avaliação); `-- --lan` mostra o endereço para o celular |
| `npm run jogar` | Joga os modelos em tempo real (Chrome headless pelo DevTools Protocol, `tools/cdp.mjs`): gestos, pausa, mudo, reforço, fim, revive, jogar de novo. `-- 1 4 --tam=1031x580` |
| `npm run sdkcheck` | Banco do SDK da Poki em 5 cenários (`tools/sdkcheck.html`, ganchos `window.__slimeTeste`) |
| `npm run telas` | Iframe com altura/largura 0, escondido e girado |
| `npm run bancada` | ms de física, cor e campo com ~1.600 partículas; `-- --fim[=min]`: o sem fim com o bot, ms por quadro e partículas por minuto (o custo do fim de jogo) |
| `npm run gifs` | GIFs e capas dos modelos em `docs/modelos/` (filme determinístico `?filme=N&cada=K`) |
| `npm run visuais -- [cestos\|cenarios\|objetos]` | Prints das alternativas de visual em `docs/visuais/` (mesma partida para comparar) |
| `node tools/prints-reforcos.mjs` | Botões de reforço (colados no pote) em 3 tamanhos, no Duelo e a folha de ícones (`tools/icones.html`) em `docs/visuais/` |
| `node tools/sons.mjs baixar\|listar\|converter\|medir` | Pacotes CC0 da Kenney para `src/som/arquivos/` (MP3 mono 56 kbps, loudnorm, atraso medido) e `LICENCAS.txt` |
| `node tools/prints-skins.mjs` | Catálogo das skins e prints do editor em `docs/skins/` |
| `node tools/prints-eventos.mjs [--tam=390x844]` | Folha dos eventos da pressão (aviso, ativos, "Evolução!") em `docs/visuais/eventos-<LxA>.jpg` (laço pausado, `__slime.avancar(n)`) |
| `node tools/quadros.mjs [--tam=1031x580] [--alvo=pequeno]` | Quadros e GIF do míssil da mira e da gosma na tela (laço pausado, `__slime.avancar(n)`) em `docs/visuais/missil-*` |
| `node tools/prints-fusao.mjs [--tam=] [--cenas=par,trio,super,terremoto]` | GIFs e folha da fusão animada, do selo do combo, do super slime e do terremoto em `docs/visuais/fusao-*` |
| `node tools/prints-humor.mjs` | Folha dos humores em cada estilo de personagem e um pote real em `docs/visuais/humor-*` |
| `node tools/prints-carregando.mjs` | A tela de loading em 4 momentos, retrato e paisagem, em `docs/visuais/carregando.jpg`, e o GIF `carregando-390x844.gif` |
| `node tools/vazamento.mjs [--sementes=3] [--min=5] [--restaurar=240] [--src=…]` | Caçada do slime atravessado na parede: o sem fim com o bot, partícula fora do pote a cada quadro (teste próprio), restaurando a partida no meio; `--src` roda outra cópia do `src` |
| `npm run artifact` | Monta `.tmp/artifact/` (hub + `jogo-N.html` sem o SDK + `src/`) para publicar no claude.ai |
| `node tools/shot.mjs "<query>" LxA saida.png [ms]` | Print no Chrome headless (WebGL2 funciona). Ex.: `"modelo=1&semente=3&auto=800&passos=1800"` |
| `node tools/pigmentos.mjs` | Regera `src/cor/pigmentos.js` e imprime o relatório de misturas |

**Parâmetros de teste** (só localhost/rede local, `src/core/depuracao.js`): `?modelo=`, `?debug` (no lab:
sliders do material), `?semente=` (também ignora a partida salva), `?passos=N` (física antes do
1º desenho), `?auto=ms` (bot), `?semanuncio`, `?lang=en|pt|es`, `?semhud`, `?render=2d`,
`?material=` (lab), `?raio=&limiar=` (núcleo do campo), `?zoom=x0,y0,x1,y1`, `?filme=N&cada=K`,
`?vitrine=1..6` (níveis no pote, para ver as texturas; 5 = o 13, 6 = o 14, parado), `?cesto=&cenario=&objeto=`,
`?bot=borda` (o `?auto` solta em cima da borda), `?poder=<id>`, `?expr=choro` (ou contente, amassado, chorinho, apatico, furioso, zonzo, susto, emburrado, xingando...), `?demoReforcos`
(botões em todos os estados), `?sons=cat:variante`, `?skins=todas` (uma skin em cada nível),
`?qualidade=0..3` (alta, média, baixa, mínima; fixa o render e desliga a adaptativa; sem ele, o celular
começa na média), `?revelar=N` (cartão de slime novo parado, para prints), `?pressao=0` (sem fim da 1.2.0, que acaba), `?evento=<id>` (esse evento da
pressão começa depois dos `?passos`), `?abertura=1` (a fusão de abertura com `?semente`; sem `?semente` ela já vem). A prévia de `modelos/escolhas.html` passa a
vitrine por `slime.escolha`. Fora do localhost o modelo vem de `window.__slimeModelo` (páginas `jogo-N.html`).

## Avaliação
- Hub: `modelos/index.html`, com `visuais.html`, `escolhas.html` (registro de 2026-10-15: botões
  colados no pote e nível 13 de lava, com a prévia), `sons.html` (Estúdio de sons, grava `slime.sons`) e `skins.html`
  (Estúdio de skins com o editor, grava `slime.skinsEstudio`); Artifact privado https://claude.ai/artifact/5EgsYqYhWBrWJhARzaQTxy
  (republicar: `npm run artifact` e publicar `.tmp/artifact/index.html` com `root: .tmp/artifact`).
- Resumo comparativo e medidas: `docs/modelos.md`.
