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

## 2026-10-17 (tarde): revisão da 2.0.0 antes do envio
- Pedido (lista do usuário): "retirar a chuva de gosma"; "o terremoto tem que tremer mesmo... o tubo de
  ensaio"; "3 peças podem se fundir, às vezes eu vejo somente 2 (1 peça grande | um espaço | 1 peça
  grande, jogo 1 da mesma cor no espaço e ela se agrupa somente com 1)"; "quando as peças se fundem isso
  acontece muito rápido, eu queria ver a combinação sendo feita e um marcador de combo"; "o míssil está
  legal mas a gosma que vai na tela eu quero algo dinâmico com o tamanho dele e o escorrer tem que ter uma
  física interessante, mas não demorada"; "os olhinhos têm que ser individuais de cada slime: se eles
  estiverem bem apertados é uma cara de choro, se estão confortáveis, feliz, tem o apático, tem o
  furioso"; "crie uma tela de loading com slime". Depois: "quando fundir a partícula final eu quero ver o
  resultado antes de explodir tudo".
- Escolhas (todas na opção recomendada):
  - **3 iguais juntos → k+2** (pula um nível; 4 também; acima do 13, o super slime estoura);
  - **furioso:** levou uma pancada (um slime de outro nível caiu nele com força), ~2 s;
  - **apático:** mais de 20 s parado sem se fundir;
  - **marcador de combo:** selo ao lado do pote, do lado oposto aos reforços, com o anel do tempo;
  - padrões assumidos e ajustáveis pelos prints: folga de 0,5 u para entrar no grupo, pontos do grupo =
    as 2 fusões que ele substitui, super slime = `pontosNivel(13)·2·n·combo`, um cartão e um prêmio só no
    nível pulado (o funil fica completo), o texto flutuante `x2` saiu.
- O que foi feito está em `docs/producao.md` ("Revisão da 2.0.0 pelo usuário").
- **Pendente:** aprovar os prints (`docs/visuais/fusao-*`, `humor-*`, `missil-*`, `carregando.jpg`,
  `eventos-*`). O usuário pediu a build em seguida: **versão 2.0.1** (`dist-poki/slime-merge-2.0.1.zip`),
  a que vai para os dois Player Fit Tests.

## 2026-10-18: Player Fit Test da 2.0.1, parede, olhos, nível 14 e loading
- Pedido: "analise o resultado do player fit test, veja o que pode melhorar para aumentar a retenção, e
  quero algumas demandas: 1) no mobile deu esse bug no visual [print do iPhone com um slime atravessado
  na parede do béquer] 2) Eu não quero mais nenhuma animação que os olhos estejam fechados 3) Aumente
  mais um slime de nível". No meio: "o loading vai caindo slime de todas as cores, fazendo camadas de
  cores". Plano em `~/.claude/plans/analise-o-resultado-do-eager-duckling.md`; análise em `docs/producao.md`.
- **Nível 14:** "14 maior, mas não pode passar do 100%" → **dois 14 cabem em 100% do béquer** (8,0 u; o
  13 tem 7,56). Depois de nascer: **comemora e estoura** (a recomendada; com o 14 parado no pote, o 2º 14
  pediria ~138% do béquer). É o super slime.
- **Olhos:** **abertos, a expressão no resto** (a recomendada): sem piscar; brilho, água no olho,
  olheira, sobrancelha e boca.
- **Retenção desta vez:** **HUD longe do botão da Poki** e **novo alvo depois do 14** (os super slimes da
  partida). A física do celular ficou para depois do próximo teste.
- **Padrões assumidos e ajustáveis:** 2 s de comemoração; 20 gotas por super slime e +20 no recorde;
  visual do 14 em **ouro** e skins **Troféus** e **Coroas** até a escolha; abaixo de 380 px de largura o
  placar desce para baixo do botão da Poki.
- **Aprovado ("Tudo aprovado", 2026-10-18):** o 14 em **ouro** (entre ouro, cristal, aurora e plasma,
  `docs/visuais/nivel14-comparar.jpg`; as outras três saíram do código), as skins **Troféus** e **Coroas**,
  os olhos (`humor-480x600.jpg`), o loading (`carregando*`), o 14 comemorando (`fusao-super-*`) e o HUD
  (`hud-poki-retrato.png`). Build: **versão 2.0.2**.

## 2026-10-18: botões de reforço com nome
- Pedido: "Quero mudar totalmente o layout desses botões [print da coluna de reforços], me dê 5 opções de
  escolha" e, no meio, "Coloque nome nos botões". Cinco opções, todas com o nome, no jogo de verdade
  (`docs/visuais/botoes-comparar-{1031x580,390x844,640x360}.jpg` e a folha com os estados,
  `botoes-folha.png`): 1 bolhas de gel, 2 gotas de slime, 3 frascos do laboratório, 4 pílulas com nome,
  5 bandeja escura.
- **Escolha: 1, bolhas de gel** (a recomendada). Botão redondo e brilhante com **uma cor por reforço**
  (trocar azul, chacoalhar rosa, alargar verde, míssil vermelho; o prêmio continua dourado, o acabado com
  vídeo lilás e o vazio cinza), o número no canto de cima e o **nome numa etiqueta branca embaixo**. Sem a
  placa listrada e torta de antes. Nomes curtos onde não cabia: "Tinta" (gota de tinta) e "Prêmio" (o
  espaço do prêmio). A posição continua a da escolha de 2026-10-15 (colada no pote); na paisagem baixa
  (até 460 px de altura) a coluna vira duas. As outras quatro e o `?botoes` saíram do código.

## 2026-10-18 (tarde): Player Fit Test da 2.0.2 e o pacote da 2.0.3
- Pedidos: "faça somente uma análise do player fit test" (link do Game Events da 2.0.2), depois "Quais os
  planos de melhoria ?" e "pacote aprovado pode implementar". A análise está em `docs/producao.md`.
- **Pacote aprovado (os 6 planos, todos na opção recomendada):**
  1. **combo-4 repetida** (bug): depois do combo 4 a meta sobe (5, 6, 7...); fusão e reforço continuam
     repetindo o último degrau;
  2. **vídeo que falha:** "Sem vídeo agora" e 30 s de espera, com os botões do vídeo apagados;
  3. **física do celular no fim de jogo:** a recomendada era **(a) partículas mais espaçadas nos níveis
     10 a 14**, "com o número medido na bancada antes". A bancada do fim de jogo mostrou que o custo está
     na montagem dos pares (40%), nos contatos (26%) e nas paredes (15%), não no shape matching (1%).
     Feito primeiro: **otimizações que não mudam a simulação** (mesmo hash do mundo em 2 sementes × 6
     min), −30% no fim de jogo. As partículas maiores (mudam a maciez dos slimes grandes e pedem prints)
     ficaram como a próxima alavanca, se a telemetria `custo/*` da 2.0.3 ainda pedir;
  4. **coringa no fim de jogo:** com o 13 feito, **um coringa a cada 3 eventos** (~3 min; era a cada 6);
  5. **entrada no desktop:** **fusão de abertura** (o pote nasce com uma gotinha no fundo e a gota da mão
     é igual; sem toque, aos 1 s ela cai sozinha em cima) e a demonstração com **2 s parado e 3 gotas**
     (eram 4 s e 2);
  6. **telemetria das saídas:** o intervalo comercial e o "Ufa!" viram eventos de progresso (start e o
     complete com 20 s de jogo depois).
- **Correção da análise:** a faixa `custo/fisica-16` é **8 a 16 ms** (`faixaMs`), não "acima de 16 ms". No
  celular, no minuto 5, a física passa de 8 ms em 33% e de 16 ms em 5%. A meta do celular passou a ser a
  física acima de 8 ms (faixas `16` e `16+`) no minuto 5 em ≤ 15%.
- **Metas do próximo teste (dois PFTs):** média limitada a 30 min ≥ 7:15 (a 2.0.2 teve 6:53; a média
  crua, 7:41, subia com duas sessões de 1 h 33 e 3 h); 5m+ ≥ 46%; 1–2m ≤ 14%; `tempo/15` ≥ 16%.

## 2026-10-18 (noite): terremoto, caretas da pancada e míssil depois do vídeo
- Pedido (lista do usuário): "1) Terremoto só 1 tremida. 2) As caretas têm que ser variadas quando o slime
  toma uma na cabeça. Somente com raiva está repetitivo. Quero umas 5 variações. 3) Quando ele clica no
  míssil e tem que assistir o vídeo, no retorno tem que vir com a mira acionada". Plano em
  `~/.claude/plans/pasted-content-id-9c33-1-terremoto-idempotent-fox.md`.
- **Terremoto:** um tremor de 1,8 s, com a mesma força de antes (eram 3, um a cada 2,5 s). O evento dura
  2,5 s (era 7): o tremor e o assentar.
- **Caretas da pancada (5, todas de olho aberto):** `furioso` (a de antes: sobrancelha em V, dentes
  cerrados, rosto vermelho, veia e fumacinha), `zonzo` (vesgo, língua de fora, galo na cabeça e
  estrelinhas girando), `susto` (olho arregalado com a pupila em pontinho, boca em "O" e tracinhos de impacto; o "!" amarelo
  saiu no mesmo dia: "e o outro balaozinho que tem exclamação"),
  `emburrado` (vira a cara, sobrancelha reta, biquinho, bochechas cheias e bufo) e `xingando` (uma
  sobrancelha em V e a outra erguida, boca gritando e rosto vermelho; o balão com "#@$!" saiu no mesmo
  dia: "tira esse balaozinho", com o print de um pote). **Rodízio por slime:** cada um
  começa numa careta (pelo índice) e passa pelas 5 antes de repetir; outra pancada no meio renova o tempo
  sem trocar o rosto. Não usa o sorteio do jogo (as gotas não mudam). Folha:
  `docs/visuais/humor-pancada-1000x1000.jpg` (5 caretas × 7 estilos).
- **Míssil:** o vídeo do reforço acabado volta com a mira armada (a retícula na tela; o próximo toque num
  slime dispara). Os outros reforços continuam só ganhando +1, porque agem na hora.
- **Build: versão 2.0.4** (`dist-poki/slime-merge-2.0.4.zip`, com a thumb), pedida pelo usuário depois de
  tirar os dois balões ("gere a build da poki").

## 2026-10-18 (noite): mais falas do locutor de slime
- Pedido: "quero adicionar mais falas de slime no jogo, o powerup e mission complete está muito legal.
  Quero em outros lugares tb, me sugira". Das sugestões (ouvidas numa página com a voz de slime), a
  escolha: "Inicio: Ready, Go! e os outros eu quero todos de maneira dinamica" e "e aparece Ready go na
  tela... escrito e some rapido".
- **Largada:** "Ready?… Go!" no começo de cada partida (sem fim, desafio, cada rodada do Duelo): a fala e o
  texto grande no meio de cada pote ("Ready?" amarelo, "Go!" verde 0,75 s depois, cada um some em 1,1 s).
  Em inglês nas 3 línguas, como a fala. Na primeira abertura o áudio ainda não destravou: só o texto.
- **As outras, todas:** combo contado do x3 ao x10 ("Three!"…"Ten!"; no lugar do "iupi" que o locutor
  não tinha e calava a fusão grande); aviso de evento ("Get down!" no terremoto, "Power up!" nos de alívio,
  "Look out!" nos outros); pedido ("Hurry up!" nos 5 s finais, "Objective achieved!", "Time over");
  "Medic!" no "Ufa!"; "Target engaged" ao armar a mira e "Target destroyed!" no impacto; "Reloading!" no
  trocar; "New high score!" com o aviso "Novo recorde!" quando o sem fim passa o recorde de antes (uma vez
  por partida); "Congratulations!" no recorde de super slimes e na sequência diária; Duelo: "Fire in the
  hole!" na gosma de 2 ou mais, "You lose" na derrota contra a CPU, "You win!" no de 2 jogadores (antes,
  "Game over" quando o jogador 2 vencia). "It's a tie" ficou de fora: o Duelo não tem empate.
- **Dinâmica:** a voz do arquivo segue o slime (mais rápida e aguda nos pequenos, grave nos grandes) e o
  combo sobe 4% por degrau; uma fala por vez, e a mais importante espera a vez em vez de sumir (o "Level
  up!" passa na frente de um combo; o combo velho não fala).
- **Sequência diária:** o aviso agora vem no primeiro gesto, junto com o "Congratulations!" (sem gesto,
  aos 6 s e mudo); antes vinha a 1,2 s, sem áudio.
- **Peso:** 21 falas novas (~95 KB na voz de slime); a build vai a ~136 KB de áudio e 462 KB gzip. O limite
  de áudio do empacotar subiu de 120 para 150 KB (a qualidade das vozes ficou em 56 kbps).
- **Bug junto:** no sem fim, "Recomeçar" no meio da partida fazia a partida nova gravar o recorde antigo
  por cima do maior (o `soltar.js` só atualizava o recorde no fim, que o sem fim não tem).
- **Build: versão 2.0.5** (`dist-poki/slime-merge-2.0.5.zip`, com a thumb), pedida pelo usuário depois de
  testar ("pode gerar a build da poki"): 136,2 KB de áudio, 462 KB gzip.
