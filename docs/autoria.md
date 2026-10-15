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
