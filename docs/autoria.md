# Autoria: escolhas do usuário

Registro das decisões de direção tomadas pelo usuário, com data. As escolhas de identidade
são dele; o código segue estas notas.

## 2026-10-14: pedido inicial
- Jogo HTML5 + JS para a Poki, seguindo o exemplo de `conceito/` (prints de um jogo estilo
  "Ball Guys": slimes com rostinhos caem num pote rabiscado e iguais se fundem).
- **A física do slime é determinante:** o material se desenha no formato do recipiente e a
  junção de cores tem física muito real.
- **5 modelos de jogo antes de aprovar**, com várias mecânicas para ser diferente dos
  jogos que já existem; todos os critérios da Poki; foco em retenção; responsivo em
  qualquer aparelho.
- Plano aprovado: `~/.claude/plans/quero-desenvolver-um-jogo-humming-teapot.md`.

## 2026-10-14: acabamento dos 5 modelos
- Escolha: **protótipo jogável** (motor de slime completo e polido, compartilhado; cada
  modelo com loop principal, HUD, fim, reinício e recorde salvo; metajogo só esboçado).
  A produção completa vem depois, só para o modelo escolhido.

## 2026-10-14: os 5 modelos
- 1 Merge Lab, 2 Croma, 3 Loja de Slime, 4 Molde, 5 Duelo (o "Pote Giratório" e o
  "Mix Master" da primeira ideia foram trocados pela revisão técnica; o usuário aprovou o
  plano com a troca).

## 2026-10-14: barra de power-ups
- O usuário mandou o print dos 4 botões da referência (`conceito/powerups.jpg`): trocar
  (setas), chacoalhar (rosto tonto), alargar (V com setas para fora) e mira.
- Viraram o kit base do Merge Lab (e do Croma e do Duelo), ligados à física: Trocar troca o
  slime da vez com o próximo; Chacoalhar sacode o pote; Alargar abre as paredes com talas de
  madeira; Mira estoura um slime. Visual igual ao do print: quadrado turquesa listrado,
  contorno grosso, leve inclinação, contador embaixo, cinza quando vazio.
- Calor, Gelo, Tesoura e Gota de tinta são prêmios de marco num 5º espaço. O "+1 por vídeo"
  usa um selo 🎬 roxo (rewarded nunca verde).

## 2026-10-14: entrega dos protótipos
- Os 5 modelos e o laboratório estão jogáveis; hub de avaliação em `modelos/index.html` e no
  Artifact privado https://claude.ai/artifact/5EgsYqYhWBrWJhARzaQTxy. Aguardando a escolha do
  usuário (e o "feel" do slime no laboratório).

## 2026-10-14: depois de jogar os protótipos
- **Junção entre slimes "não está legal"** (print com slimes entrando um no outro, fiapos e
  manchas pretas): a física ganhou a fronteira entre slimes encostados (`separarCelulas` em
  `src/fisica/mundo.js`): a linha passa pelo ponto onde os dois se tocam e corrige só as
  partículas invasoras, na pós-estabilização. Um slime não engole mais o outro.
- **Mira até a metade do objeto sobre a parede:** agora o slime cabe inteiro no fundo do pote
  (a parte mais estreita) e cai reto (`limitarMira` em `src/jogo/pote.js`).
- **"O roxo do nível alto ficou parecido; nos níveis altos eu quero texturas":** do nível 7
  ao 12, cada um tem uma textura no shader, presa ao corpo (nuvem com bolinhas, arco-íris em
  anéis, mar com ondas, uva com bolinhas, chiclete com listras de bala, galáxia com estrelas;
  o coringa é glitter). O arco-íris deixou de ser mármore de pigmento (a difusão o virava
  lama cinza). A barra de evolução mostra as texturas.

## 2026-10-14: tremor, bordas e alternativas de visual
- **"Quando uma cor muito grande sobrepõe outra ela fica tremendo":** a fronteira entre
  slimes devolvia a partícula invasora sem tirar a velocidade dela, e ela voltava no subpasso
  seguinte (saltos de até 0,19 u por quadro). Agora é choque sem quique (0,03 u, como sem a
  fronteira), e o slime grande assenta em ~8 s em vez de ~13 s (`lam` da gelatina 0,4 → 0,9).
- **"Diminua a largura das bordas":** contorno ~65% do anterior (1,6–2,8 px), costura entre
  slimes e traço dos rostos mais finos.
- **"Crie outros modelos de objetos, cenários e cestos e me apresente para ir escolhendo":**
  8 de cada, no Estúdio de visuais (`modelos/visuais.html`, prints em `docs/visuais/` por
  `node tools/prints-visuais.mjs`), com prévia jogável. Cestos mudam a física
  (`src/jogo/cestos.js`): pote listrado, vime, aquário, béquer, balde, caldeirão, xícara, pote
  de vidro. Cenários (`src/render/cenarios.js`): caderno, laboratório, cozinha, mar, espaço,
  doceria, jardim, quarto. Personagens (`src/render/rostos.js`): clássico, kawaii, bichinhos,
  monstrinhos, chapéus por nível, olhos de boneco, frutinhas, docinho. A escolha fica em
  `slime.visual` no navegador. Aguardando a escolha do usuário.

## 2026-10-14: visual escolhido
- **Cesto 4 (béquer) · Cenário 7 (jardim) · Personagem 1 (clássico).** Virou o padrão do jogo
  (`src/main.js`, `criarPote`, `criarCena`); os recipientes próprios da Loja, do Molde e do
  laboratório usam o estilo de vidro do cesto escolhido. As outras opções continuam no
  Estúdio de visuais para comparação.

## 2026-10-14: modelo escolhido
- **"Merge Lab com opção de Duelo."** Começou a produção (roteiro em `docs/producao.md`).

## 2026-10-15: fusão de iguais encostados
- **"Aqui deveria ter unido os laranjas"** (print com dois laranjas encostados no fundo): a
  fusão passou a contar proximidade, inclusive entre slimes dormindo (`src/fisica/mundo.js`).

## 2026-10-15: thumb da Poki
- Pedido: **"Crie uma thumb de acordo com as politicas da poki"**. Regras conferidas no guia
  (developers.poki.com/guide/game-thumbnail): quadrado sangrado de no mínimo 628 px, sem texto,
  borda nem moldura, um assunto com pose dinâmica, personagem na skin padrão, fundo limpo,
  parecida com o jogo, nada perto do #83FFE7 e legível nos tiles pequenos.
- `tools/thumb.html` monta a cena com a física e o render do próprio jogo (béquer, céu do
  jardim sem nuvens, raios e vinheta), sem os números da graduação. Três opções em
  `marketing/thumb/comparar.png` (tiles em `comparar-tiles.png`):
  - **fusao:** dois vermelhos iguais se espremendo no fundo do béquer, com o brilho no encosto;
  - **pote:** um laranja caindo no béquer cheio, com riscos de movimento;
  - **arcoiris:** o slime arco-íris (nível 8) no alto da pilha, feliz, com estrelas.
- As três passam na régua (perto do #83FFE7 ≤ 0,15%, beirada ≥ ΔE 45, sem tarja, opacas).
  O anel ciano-verde do arco-íris passava de 1% e um passo de cor da thumb o afasta.
- **Oficial provisória: arcoiris** (recomendação: a mais legível nos tiles de 94 a 314 px),
  em `marketing/thumb/slime-merge-{1256,628}.{png,jpg}`. **Escolha final pendente do usuário.**
- Falta a thumb animada (vídeo no hover), que a Poki pede antes do lançamento global.
- Pedido (fim do dia 2026-10-15): **"gere mais 3 opções de thumb"**. Novas: **lava** (o nível 13
  de olhos abertos no topo da pilha; contraste 6,2:1, o maior das seis), **míssil** (o laranja
  chorando com a retícula travada e o míssil mergulhando) e **close** (um uva grande de perto, o
  rosto ocupando o quadro). As seis lado a lado em `marketing/thumb/comparar-6.png`; todas
  passam na régua da Poki. A provisória (arco-íris) foi re-renderizada com a reescala dos níveis
  e vai na build até a escolha.
- Pedido (noite de 2026-10-15, com a `fusao` de referência): **"faça 3 thumbs de cores iniciais
  mais neutras no estilo [fusão] que ocupe o ícone todo, para o usuário entender o jogo só pela
  thumb"**. Novas: **fusao-azul**, **fusao-verde** e **fusao-lilas** (os níveis 1, 2 e 3). O par
  igual se espreme no alto de uma pilha que enche o quadro (o céu fica só no alto, com as
  estrelas do encosto), com vizinhos só dos três níveis calmos e de tamanho parecido. A pilha é
  uma grade em favo pintada para que só o par seja igual entre os que se tocam; semente e ordem
  das cores escolhidas olhando as variantes. Todas passam na régua da Poki; o aviso de contraste
  (régua nossa) cai porque os cantos agora são slimes, não céu. Lado a lado em
  `marketing/thumb/comparar.png` (tiles em `comparar-tiles.png`). **Escolha pendente do usuário.**
- Pedido seguinte: **"Faça a fusão azul com um slime vermelho e amarelo atrás"**. Na fusao-azul o
  par agora se apoia num vermelho (nível 4) e num amarelo (nível 6), que sobe por trás do azul da
  direita (opção `apoio` de `fusaoInicial`). Testados também os dois ladeando o par: ficavam quase
  todos cortados pela borda. Com o fundo quente o azul salta até no tile de 94 px.
- Pedido seguinte: **"Faça um que cobre o ícone inteiro de slime"**. Nova opção **fusao-cheia**: a
  azul com uma fileira de cinco soltos por cima do par (lilás e verde nos lados, um vermelho no
  meio, amarelo e laranja nos cantos) e o quadro baixo o bastante para não sobrar céu (medido:
  nenhum pixel de céu). Os olhos do vermelho de cima ficam um pouco cortados pela borda.
- **"Tira a marca em cima do azul, parece uma letra japonesa"** (print com as estrelas
  circuladas): as estrelas do encosto saíram das quatro fusões de cores calmas (azul, verde,
  lilás e cheia). As outras opções (fusao, arcoiris, lava, close) ainda têm estrelas.

## 2026-10-15: borda, míssil, botões, nível 13, skins e sons
Pedidos com prints anotados do Merge Lab (plano em
`~/.claude/plans/algumas-demandas-1-2-mutable-chipmunk.md`):
- **"Deixar o usuário jogar o slime na borda do recipiente"** (a seta passava da parede). Escolha:
  **em cima da borda**. O centro do slime vai até o topo do vidro; ele pousa, balança e escorrega
  para dentro por uma guia invisível (uma aba a 30° no topo de cada parede, `src/jogo/pote.js`).
  Isto **inverte** a regra de 2026-10-14 ("cabe inteiro no fundo"). No Duelo, a guia é cortada
  antes do meio entre os potes e a mira recua o que a guia perdeu; o Alargar não deixa um pote
  invadir o outro (bug antigo no vime, xícara, balde e caldeirão). De quebra: o toque rápido
  soltava o slime de onde ele estava, não de onde o dedo tocou (a peça presa só chegava ao alvo
  no passo seguinte); agora cai da mira (`soltar` em `src/fisica/mundo.js`).
- **"Ao aumentar o pote, tire esses X de cada lado da parede"**: as talas de madeira do Alargar
  saíram (a nota de 2026-10-14 fica como histórico).
- **Mira:** "um símbolo de mira em vez desses círculos; quando seleciono, faz cara de choro, vem
  um míssil teleguiado e explode, voando gosma na tela, que escorre, animação rápida". Feito:
  retícula de mira (`src/render/guias.js`), choro em todos os 8 personagens (`src/render/rostos.js`),
  míssil saindo do botão (`src/render/missil.js`), explosão (`vfx.explosao`) e gosma na tela que
  escorre (`src/render/gosma.js`, canvas `cTela` por cima do HUD). Tempo total ~0,75 s até o
  impacto e ~1,3 s de gosma. O alvo marcado não funde no meio do voo; o fim espera o impacto.
- **Botões de reforço:** "alterar o layout e colocar ícones mais nítidos e coerentes". Ícones
  novos (`src/ui/icones.js`: formas cheias, um contorno só) e três layouts para escolher
  (A régua embaixo, B coluna colada ao pote, C grade compacta; registro em
  `docs/visuais/reforcos-comparar-*.png`). **Escolha: B, colada no pote.** Na paisagem a coluna
  encosta na parede direita do pote do jogador 1 e o pote cresce; no retrato, a fileira embaixo
  da barra. Os ícones antigos e o `?reforcos`/`?icones` saíram. Depois (2026-10-15): **no Duelo
  contra a CPU a coluna vai para a direita do pote da CPU** (antes ficava entre os potes) e **no
  2 jogadores não há reforços** (nem botões nem as teclas 1-5; só o jogador 1 teria).
- **"Quero aumentar mais 1 nível de cor."** Escolha: **reescalar todos** (o 13 tem o tamanho que
  o 12 tinha; fator 1,14121). Quatro candidatas de visual (ouro, lava, aurora, cristal) em
  `docs/visuais/nivel13-comparar.{jpg,gif}`. **Escolha: lava** (crosta escura com rachaduras
  em brasa que pulsam; textura 7 do shader). As outras três saíram do código.
- **Skins por nível com editor de pixel.** Escolhas: compra com gotas numa aba nova da Loja; a
  "Minha" por nível, comprada uma vez e editável; o editor tem os dois modos (ladrilho 16×16 e
  estampa no corpo inteiro). Estúdio de skins em `modelos/skins.html`. **Escolha do usuário (2 por
  nível):** 1 bolhas e gotas · 2 melancia e folhinhas · 3 xadrez lilás e florzinhas · 4 morango e
  bengala doce · 5 gomos e onça · 6 abelha e estrelinhas · 7 chuva e trovão · 8 mosaico e balões ·
  9 bolhas do mar e âncoras · 10 xadrez de uva e morcegos · 11 granulado e cupcake · 12 galáxia
  ciano e constelação · 13 tesouro e diamantes (`SKINS` em `src/jogo/skins.js`). As quatro
  perguntas do estúdio ficaram sem resposta e valeu a primeira opção (a recomendada): **preços
  como propostos** (paramétrica 80+10k, pixel 120+15k, Minha 150), **níveis ainda não descobertos
  bloqueados**, a aba se chama **"Skins"** (o grupo "Slimes" dos personagens fica) e a **gosma
  cinza do Duelo mantém a regra da cor** (todas as skins têm C+M+Y ≥ 0,25). Na Loja: pausa ›
  Loja › Skins; a Minha comprada abre o editor; as skins valem na hora (a cor nova avança pelo
  corpo) e nos dois potes do Duelo (a CPU usa as mesmas).
- **Sons:** "quero escolher os efeitos musicais, algumas falas, palmas, moeda, conquista, água,
  meleca". Estúdio de sons em `modelos/sons.html`. **Escolha do usuário (é o `PADRAO` de
  `src/som/catalogo.js`):** soltar sopro (o de antes), pouso gelatina, fusão marimba, combo
  sininhos, estouro explosão (o de antes), míssil plop + assobio, choro buáá, gosma ventosa,
  trocar pluc-pluc, chacoalhar chocalho, alargar esticar, armar o alvo radar, ataque chuva de
  plops, botões pop, gotas moedinha, compra pilha de fichas, nível novo fanfarra de metais,
  missão ta-dá, palmas turminha, fim trombone triste, falas **locutor com voz de slime** (inglês,
  CC0 Kenney) e **sem música** (o botão da música some enquanto a escolha for "nenhuma").
  Gravações na build: 8 MP3, 38,7 KB.
- Bugs achados no caminho: dois 12 que estouravam registravam um "nível 13" (gotas e `visto`;
  migração do perfil versão 2); a tesoura dividia em dois iguais que se fundiam de novo no
  quadro seguinte (pontos de graça) e não repintava os pedaços.

## 2026-10-17: Player Fit Test da 1.2.0 e a pressão do sem fim (2.0.0)
- Pedido: "analise o player fit test e crie um plano de como aumentar drasticamente a retenção". A
  análise (5m27s, a curva igual à da 1.1.1, só 8% das partidas chegando ao fim, a novidade acabando no
  minuto 3) está em `docs/producao.md`; o plano, em
  `~/.claude/plans/analise-o-player-fit-delightful-penguin.md`.
- **Estrutura: "Sem fim com pressão"** (entre mundos, pressão e os dois em A/B): uma partida só, com a
  escada das gotas e um evento a cada ~60 s.
- **Derrota: "Nunca"**: o "Ufa!" vale sempre no sem fim (o desafio do dia continua perdendo).
- **Intervalo comercial: nas pausas naturais, do 3º em diante** (a opção recomendada, escrita para os
  mundos): sem mundos, a pausa natural é o fim de um evento, a partir do 3º, com 150 s de jogo desde o
  anterior.
- **Pendente:** aprovar o visual dos eventos pelas folhas `docs/visuais/eventos-390x844.jpg` e
  `eventos-1031x580.jpg` (aviso no pote, pílula com ícone e contagem, gosma cinza, "Evolução!"), antes de
  enviar a 2.0.0 e pedir dois Player Fit Tests.
