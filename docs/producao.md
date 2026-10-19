# Produção: Merge Lab com Duelo (a partir de 2026-10-14)

Escolha do usuário em 2026-10-14: **"Merge Lab com opção de Duelo."** Visual: béquer, jardim,
personagem clássico. Este roteiro segue o plano aprovado ("depois da escolha: produção completa
do vencedor: metajogo com uma moeda, desafio diário, coleção, música, thumb, Inspector, Player Fit
Test").

## Decisões de produto (padrões assumidos; o usuário pode mudar)
- O jogo abre direto no **Merge Lab sem fim** (C2P). O Duelo, o Desafio do dia e a Loja ficam no
  menu (botão de pausa), sem tela entre o carregamento e o primeiro toque.
- **Uma moeda só: gotas 💧.** Ganha por partida (pontos), nível novo descoberto, missões, desafio
  do dia, vitória no Duelo e sequência diária. Gasta na **Loja de visuais**: os 7 cestos, 7
  cenários e 7 personagens que não são o padrão (as opções do Estúdio viram coleção).
- Reforços continuam itens (ganhos em missões e por vídeo), nunca comprados com outra moeda.
- **Duelo:** contra a CPU (liga de 3 níveis que sobe com as vitórias) ou 2 jogadores (teclado
  A/D/S × setas; no toque, cada metade da tela é de um jogador).
- **Desafio do dia:** semente da data, uma regra do dia (só caem níveis 1–3, pote aquário,
  xícara, chacoalhar a cada 25 s, sem reforços, muitos coringas) e meta de pontos; prêmio de
  100 gotas uma vez por dia.
- **Protótipos** (Croma, Loja, Molde, laboratório) saem da build da Poki, mas continuam no
  repositório e no hub de avaliação.

## Etapas
1. Recorte: build só com Merge Lab + Duelo; troca de modo em tempo de execução; menu (Jogar,
   Loja, Missões) no lugar da pausa simples.
2. Metajogo: gotas, loja de visuais, missões diárias com gotas, sequência diária, coleção da
   evolução (nomes dos níveis), tela de fim com gotas e 🎬 dobrar.
3. Desafio do dia.
4. Duelo: liga da CPU, 2 jogadores no toque, layout em pé, prêmio.
5. Áudio: música procedural leve e sons de vidro/gosma.
6. Poki: eventos (`level`, `game/toque/first`, `tempo`, `rewarded/*`), intervalos, i18n completo,
   teclado nos menus, thumb (1256 e 628), empacotamento 0.2.0.
7. Desempenho: qualidade adaptativa, válvula de câmera lenta, CPU limitada no Chrome; teste em
   celular real pelo usuário.

## Andamento
- **Etapas 1 a 3 feitas** (2026-10-14):
  - `src/jogo/perfil.js`, `src/ui/menu.js` e o `main.js` novo;
  - gotas no fim pela raiz dos pontos; depois de reviver, só a diferença;
  - 🎬 dobrar no fim e 🎬 +1 no reforço acabado (selo roxo no botão);
  - o cesto comprado vale na próxima partida, ou na hora se ainda não há pontos; cenário e personagem trocam na hora;
  - no desafio, a meta aparece no lugar do recorde, e um aviso de abertura mostra a regra;
  - a sequência diária paga ao abrir, com um aviso que não interrompe o jogo.
  - Verificado com `npm test` (64), `npm run menu` em 4 tamanhos, `npm run jogar`, `sdkcheck` (fonte e build) e `telas`. A build tem 197 KB gzip.
- **Etapa 4 em parte:**
  - feitos: liga da CPU, 2 jogadores desde o início (sem CPU), toque com 2 dedos (cada um no seu pote), título "J1/J2 venceu!" e prêmio da liga;
  - falta: o layout em pé do Duelo (no retrato os dois potes ficam pequenos lado a lado).
- **Correção de 2026-10-15** (print do usuário com dois laranjas encostados que não fundiam):
  - a fusão passou a contar **proximidade** (partículas a até 1,08 × (ri + rj)), e não a penetração do solver; em repouso, a penetração piscava entre 0 e 1 par;
  - a proximidade conta também entre dois slimes dormindo;
  - na caçada com o bot (3 sementes, 5 min cada), os casos de iguais encostados por mais de 1 s caíram de 17–21 por partida para 0;
  - custo: +0,27 ms de física com 1.624 partículas;
  - teste em `test/fisica.test.js`.
- **Etapa 6 em parte (2026-10-15):** thumb da Poki (`npm run thumb`, `tools/thumb.html`).
  - três opções; a oficial provisória é a `arcoiris`;
  - o `empacotar --thumb` aceita: 1256×1256, junto do zip;
  - falta a thumb animada (vídeo no hover).
- **Pedidos de 2026-10-15** (docs/autoria.md): borda com guia invisível, míssil da mira, talas
  fora, 13 níveis (reescala), ícones novos. Escolhidos e integrados: reforços colados no pote
  (B), nível 13 de lava, os sons do Estúdio e as skins (aba Skins da Loja com 2 prontas por
  nível e a Minha no editor de pixel; perfil `skins {possui, equipado, minhas}`). Falta medir o
  custo do shader com skins num celular de verdade.
- **Etapa 5 (áudio) feita em 2026-10-15:** barramentos com compressor (`src/core/audio.js`), sons
  sintetizados e 8 gravações CC0 (38,7 KB) do `PADRAO` escolhido, locutor com voz de slime nos
  marcos; o usuário escolheu ficar **sem música** (a música procedural continua no código e no
  Estúdio, e o botão dela volta se a escolha mudar).
- **Etapa 7:** pendente; da 6 faltam eventos, i18n e teclado nos menus.
- **Versão 1.0.1** (2026-10-15, pedido do usuário): `dist-poki/slime-merge-1.0.1.zip`, com a thumb
  provisória (arco-íris) até a escolha entre as 6 opções.
- **Retenção, versão 1.1.0** (2026-10-15, depois do Player Fit Test da 1.0.0: aprovado com média de 5m32s
  e 51% com 3 min ou mais; o 2º minuto perdia 24% de quem jogava, 25% do desktop nunca tocava e o celular
  saía mais depois de 5 min). Feito a pedido do usuário (itens 1, 2, 3, 5 e 6 da análise):
  - **começo:** o pote do sem fim nasce com 86% da largura e cresce no nível 6 (a primeira meta,
    alcançada entre 30 e 75 s pelo jogador casual na simulação) ou aos 150 s; pílula da meta acima
    da barra com o alvo pulsando; cartão "Slime novo!" na descoberta; com 60 s de jogo sem usar
    reforço, o míssil pulsa com a mão por 8 s (uma vez por aparelho). Mexer no sorteio das primeiras
    gotas (só 1 a 3, ou repetir o nível exposto) não mudou as fusões do 1º minuto e ficou de fora;
  - **desktop sem toque:** a mão fica até a primeira gota (antes sumia aos 20 s mesmo sem toque); parado
    há 4 s, a peça segue a mão e cai sozinha (2 vezes, sem abrir o gameplay); `window.focus()` ao abrir;
  - **celular:** a qualidade adaptativa passou a existir de verdade (`src/render/qualidade.js`: desce de
    alta para média e baixa com fps abaixo de 48 por 3 s; antes nada chamava `definirQualidade`);
  - **fim:** "faltou pouco para o nível N" ou "faltaram N pontos para o recorde" e o próximo item da loja
    (quanto falta, ou "já dá para comprar", abrindo a loja);
  - **telemetria nova:** `level/1/start` já na primeira partida, `level/N/complete` em cada nível novo
    da partida, `pote/cresceu/<nivel|tempo>`, `menu/<origem>/open`, `loja/<grupo-id>/buy`,
    `skin/<k-id>/buy`, `missao/<tipo>/complete`, `poder/<id>/use`, `video/<motivo>/<ok|fail>`,
    `fim/<botao>/click`, `dica/<poder|demo>/<show|use|outro>`, `fps/<55|45|30|0>/m<1|3|5|10>` e
    `qualidade/<nivel>/m<min>`.
  - Verificado com `npm test` (132), `npm run menu`, `jogar`, `sdkcheck`, `telas`, prints em retrato
    e paisagem (até 640×360) e CPU 12× mais lenta no Chrome (a qualidade desce em ~10 s).
- **Versão 1.1.1** (2026-10-15, pedido do usuário): no Duelo contra a CPU a coluna de reforços vai para
  a direita do pote da CPU (antes ficava entre os potes); no 2 jogadores não há reforços (botões, clique
  e teclas 1-5; só o jogador 1 teria). Verificado com `npm test` (133), `npm run menu` e prints em
  paisagem (1031×580, 800×600, 1280×720, 640×360).
- **Player Fit Test da 1.1.1** (15/10 20:20 e 16/10 09:46, 500 gameplays cada): média de 5m01s e 5m07s
  (a 1.0.0 teve 5m32s); 0–2 min 38% e 38,6% (igual à 1.0.0); 5 min+ 29,2% e 33,6% (37% na 1.0.0). Duas
  rodadas da mesma build diferem 4,4 pontos no 5 min+. Game Events (1.261 gameplays):
  - de quem toca, ficam 79%, 61% e 48% nos minutos 1 a 3 e 33% no 5; no celular, do minuto 2 para o 3
    saem 24% (no desktop, 14%); desktop sem toque: 19% (era 25%);
  - celular: 46% abaixo de 55 fps no minuto 1; abaixo de 30 fps, 10% no minuto 1 e 22% no 5; 47% descem
    para média e 34% para baixa no minuto 0; o celular chega menos aos níveis altos (12: 5% × 12%);
  - ritmo: o nível 9 aos ~3 min; o 10, o 11 e o 12 levam 2, 4 e 7 min cada;
  - o `level/N/fail` aparece com Failed 0% (o painel calcula sobre o Started, e só o nível 1 tem start).
- **Retenção, versão 1.2.0** (2026-10-16, pedido do usuário: frentes de telemetria, celular e metas no meio
  da partida; o A/B dentro da build ficou de fora):
  - **cartão de slime novo** (pedido do usuário): no retrato virou uma faixa baixa por cima da linha do HUD;
    a 13% do topo, cobria a slime segura e a mira no celular; na paisagem ficou igual; `?revelar=N` para prints;
  - **telemetria:** `partida/fim/m<min>` e `partida/fim/n<nivel>` (sem fim), `partida/ufa/m<min>` (o
    resgate emite `resgate`), `sair/<estado>/m<min>` na primeira vez que a aba some (`toque` antes do 1º
    toque), `custo/<fisica|desenho>-<4|8|16|16+>/m<1|5>` (ms médios do minuto, `faixaMs`) e
    `fps1/<faixa do minuto 1>/m<3|5|10>` (a permanência por faixa de fps), `meta/<tipo>-<meta>/complete`;
  - **celular:** com toque, começa na qualidade média (no celular, o `qualidade/media/m0` deixa de
    aparecer); 4º degrau `minima` (só o canvas do slime em dpr 0,75, célula 0,17, sem brilho; rostos e pote
    nítidos). A válvula da física (`MAX_PASSOS`) espera a telemetria `custo/*`;
  - **metas no meio da partida:** do nível 9 em diante no sem fim, a pílula alterna a cada 8 s entre o
    próximo nível e uma meta curta com progresso (no 13, só a meta): a missão do dia aberta mais perto de
    acabar (fusão, combo ou reforço); sem nenhuma, as metas da partida de `src/jogo/missoes.js` (fusão
    10/20/35/50, combo 2/3/4, reforço 1/2/3; 10 a 25 gotas; valem até o fim da partida). A vitrine passou a
    pôr o `maxNivel` do pote;
  - Verificado com `npm test` (138), `npm run menu`, `jogar 1 5`, `sdkcheck`, `telas`, os eventos novos no
    Chrome em tempo real, toque com CPU 12× mais lenta (média → baixa → mínima) e a build aberta.
    `dist-poki/slime-merge-1.2.0.zip` (325 KB gzip).
- **Player Fit Test da 1.2.0** (16/10 21:45, 500 gameplays): **5m27s**. Histograma 94 · 94 · 71 · 36 · 33 ·
  172 (3m+ 48%, 5m+ 34%); a série 1.0.0 5m32 · 1.1.1 5m01/5m07 · 1.2.0 5m27 está parada. Game Events (637
  gameplays: 312 celular, 246 desktop, ~79 tablet):
  - curva `tempo/N/min` 70 · 55 · 44 · 36 · 29% (5 min) · 12% (10) · 4% (20); de quem toca, 78/62/49/32%,
    igual à 1.1.1: ~20% saem a cada minuto, do 1 ao 5, no celular e no desktop;
  - **só 8% das partidas chegam ao fim** (`partida/fim`, todas nos níveis 9 a 13): 92% saem com o pote vivo.
    De quem perde, 57% clicam em "de novo";
  - a novidade acaba no minuto 3: alcançam o nível 6 81%, o 7 69%, o 8 55%, o 9 40%, o 10 27%, o 11 ~12%,
    o 12 ~6% e o 13 ~4%;
  - metajogo: só 5% abrem o menu; o Hexa Drop já mostrou que barra, prêmio e skins não mexem na perda por minuto;
  - celular: 69% caem para a qualidade baixa ou mínima no minuto 0; `fps/0` 6% (min 1), 19% (3) e 22% (5);
    o desktop, a 55+ fps, perde 55% do min 1 ao 5 (o celular, 64%);
  - furos: `fps1/*` não chegou nenhuma vez (a única categoria com dígito) e `sair/*` (só
    `visibilitychange`) pegou ~100 das ~450 saídas.
- **Retenção, versão 2.0.0** (2026-10-17; plano em `~/.claude/plans/analise-o-player-fit-delightful-penguin.md`;
  escolhas do usuário: **sem fim com pressão, sem derrota, intervalo nas pausas naturais**, `docs/autoria.md`):
  - **escada** (`src/jogo/pressao.js`): do nível 9 em diante cada nível novo sobe o piso das gotas, até o
    teto 4 (caem 4 a 8, pesos 40/30/18/9/3); os slimes abaixo do piso evoluem ("Evolução!"), a fila e o
    preso também. Com a pressão, o coringa não funde com o maior nível da partida: na chuva de
    coringas o bot subia do 9 ao 13 em 12 s;
  - **agenda:** um evento a cada 60 s a partir dos 90 s, avisado 2 s antes no pote e na pílula (contagem
    nos que acabam pelo relógio): coringas (3 prismas), pedido ("faça um nível X" em 45 s: prêmio físico e
    15 gotas), terremoto (3 tremores do pote inteiro), gota gigante (até o 9), calor (5 s) e gelo (8 s); a
    gosma cinza saiu na revisão do usuário (abaixo). O estado vai no save;
    a partida da 1.2.0 ganha agenda 30 s depois de voltar e evolui o que ficou abaixo do piso;
  - **sem derrota:** o "Ufa!" vale a partida inteira (`resgatarSempre`) e zera o combo; o sem fim não tem
    mais tela de fim (o desafio e o Duelo têm); as gotas dos pontos (mesma conta do fim) entram em cada
    nível novo e no fim de cada evento, com a missão de pontos (`pagarParcial`; `pagos` vai no save);
  - **intervalo comercial:** no fim de um evento, a partir do 3º, sem mira armada, com 150 s de jogo desde o
    anterior; antes o sem fim quase não tinha intervalo (só no "de novo");
  - **telemetria:** `evento/<id>/start`, `evento/pedido/<ok|falhou>`, `escada/p<piso>/m<min>`,
    `ritmo/n<nivel>/m<min>` (o minuto de cada nível novo), `intervalo/evento/show`; `fps1` virou `fpsini`;
    `sair` também no `pagehide`; `partida/ufa` vale em qualquer minuto; o sem fim não manda `level/N/fail`;
  - defeito: o Alargar já usado oferecia vídeo, e o +1 nunca servia: agora fica cinza e sem 🎬;
  - **ritmo simulado** (bot a cada 2 s, que chega ao 9 entre 104 e 214 s como o jogador real; 3 sementes):
    12 entre 376 e 517 s (na 1.2.0, o jogador real levava ~16 min), 0 a 4 resgates em 10 min, 700 a 835
    partículas no minuto 8 (sem a pressão, 628 a 715);
  - **válvula de física do celular: medida e fora.** `iter` 3 → 2 economiza ~5% e o pote dorme menos
    (1 de 6 slimes dormindo contra 5 de 6); fica para decidir pela telemetria `custo/*` da 2.0.0 (próximas
    alavancas: partículas maiores nos slimes grandes, que mudam o visual, ou 3 subpassos);
  - prints para a aprovação do usuário: `docs/visuais/eventos-390x844.jpg` e `eventos-1031x580.jpg`
    (`node tools/prints-eventos.mjs`);
  - verificado com `npm test` (148), `npm run menu`, `jogar 1 5`, `sdkcheck` (o "normal" falhou uma vez por
    tempo com a CPU ocupada e passou de novo), `telas` e os prints dos eventos em retrato e paisagem;
  - **metas do próximo teste (2 PFTs):** média ≥ 7:00; 5m+ ≥ 45%; 3m+ ≥ 58%; 1–2m ≤ 14%; `tempo/10/min` ≥
    20%; perda por minuto do 1 ao 5 ≤ 14%; nível 10 na mediana ≤ 4 min; nível 13 para ≥ 20%; `fps/0/m5` no
    celular ≤ 10%.
- **Revisão da 2.0.0 pelo usuário → versão 2.0.1** (2026-10-17, antes do envio; plano em
  `~/.claude/plans/pasted-content-id-8745-retirar-cheeky-hopper.md`; escolhas em `docs/autoria.md`):
  - **sem a chuva de gosma:** o evento `gosma` saiu da agenda (o ciclo tem 6); a gosma cinza ficou só no
    Duelo. Save com o evento ou com gosma cinza no pote: o evento acaba e a gosma volta slime do nível;
  - **terremoto de verdade:** as paredes do pote andam (tremor separado da base, `mundo.tremerParedes`,
    0,38 u na lateral a 7,5 Hz e 0,12 u na vertical, 3 tremores de 1,8 s), o cesto e a tela tremem junto
    (câmera deslocada até 8 px) e o celular vibra. Em 5 sementes com o pote cheio (870 a 1.370
    partículas), nenhuma saiu; um "Ufa!" no pote mais cheio;
  - **fusão visível e em grupo:** os iguais se abraçam (0,22 a 0,45 s), viram um corpo só que escoa e
    encolhe (0,4 s) e estalam. No caso relatado (grande | vão | grande com a gota no meio), os 27 casos
    simulados (níveis 3, 5 e 7; vão de 0,5 a 1 diâmetro; gota no centro e deslocada) juntam os três.
    **3+ iguais → k+2**, com os pontos das 2 fusões e o funil `level/N/complete` sem buraco. O **super
    slime** (2 do 13 ou 3 do 12) fica ~1 s inteiro (incha, treme, brilha) antes de estourar;
  - **selo do combo** (a partir do ×2) ao lado do pote, com o anel da janela, que para durante a fusão;
  - **humor de cada slime:** numa partida do bot (3 sementes, 5 min): neutro 43%, contente 18%,
    amassado 12%, feliz 10%, furioso 9%, chorinho 7%. A pressão de contato não servia (abaixo de 0,01 em
    99,9% do tempo): o aperto é o alongamento do corpo mais os vizinhos;
  - **gosma do míssil:** do tamanho do slime (3 a 9 manchas), chega achatando e balança; os pingos têm
    massa e aderência, escorrem em regime viscoso, deixam rastro e grudam; a gota pesada se solta. 1,1 a
    1,6 s. O estouro do super slime também espirra (a brasa da lava);
  - **tela de loading:** o béquer enchendo de slime com olhinhos (só HTML e CSS no `index.html`), que sai
    no 1º quadro, junto do `gameLoadingFinished`; nenhum toque é pedido;
  - verificado com `npm test` (168), `npm run menu`, `jogar 1 5`, `sdkcheck`, `telas`, `bancada` (física
    3,5 ms com 1.624 partículas) e a build aberta no Chrome (sem erro; a tela de loading sai);
    `dist-poki/slime-merge-2.0.1.zip` (361 KB; 350 KB gzip) com a thumb `slime-merge-2.0.1-thumb.png`;
  - **pendente:** aprovar os prints em `docs/visuais/`: `fusao-*` (par com combo, trio, super slime,
    terremoto), `humor-480x600.jpg` e `humor-pote-480x600.jpg`, `missil-*` (alvo grande e pequeno),
    `carregando.jpg` e `eventos-*`.
- **Player Fit Test da 2.0.1** (17/10 21:56, 500 gameplays): **6m55s** (2.0.0: 5m30s; 1.2.0: 5m27s).
  Histograma 65 · 73 · 49 · 49 · 36 · **228** (3m+ 62,6%, **5m+ 45,6%**; a 2.0.0 teve 83 · 108 · 60 · 56 ·
  23 · 170, 5m+ 34%, igual à 1.2.0: o salto veio da revisão da 2.0.1, não da pressão sozinha). Game Events
  (677 gameplays: 385 celular, 224 desktop e tablet):
  - metas batidas: 5m+ ≥ 45%, 3m+ ≥ 58%, `tempo/10` 22,6% (≥ 20%), nível 10 na mediana no minuto 4,
    nível 13 para 22% (148); faltaram média ≥ 7:00 (6:55), 1–2m ≤ 14% (14,6%), perda por minuto ≤ 14%
    (16 · 14 · 15 · 14% do 1 ao 5) e `fps/0/m5` no celular ≤ 10% (**23%**);
  - ritmo (mediana do minuto do nível novo): 9 m2 · 10 m4 · 11 m5 · 12 m7 · **13 m8**; depois do 13 não há
    novidade (`tempo` 189 no m8 → 110 no m13 → 39 no m20);
  - celular: do minuto 10 ao 20 perde 80% (88 → 18; o desktop, 68%); no minuto 5, física ≥ 8 ms em 34% (a faixa `16` é 8–16 ms; leitura
    corrigida em 2026-10-18) e
    fps < 30 em 23%; 76% caem para a qualidade baixa ou mínima no minuto 0;
  - "Ufa!": em cada minuto do 11 ao 16, 35–49% de quem joga leva um (o pote enche de novo e de novo);
  - eventos: coringas começam em 71%, pedido em 60% (91% cumpridos), terremoto 51%, gigante 44%, calor
    38%, gelo 32%; `intervalo/evento/show` em 50%. Metajogo: menu ~10%, 35 cestos, nenhuma skin; vídeo 14%.
- **Versão 2.0.2, depois do PFT da 2.0.1** (2026-10-18, pedido do usuário; plano em
  `~/.claude/plans/analise-o-resultado-do-eager-duckling.md`; escolhas em `docs/autoria.md`):
  - **slime atravessado na parede** (print do iPhone: um nível 11 meio para fora do béquer, pendurado
    abaixo do fundo). A parede é uma cápsula de dois lados e não havia trava "dentro do pote". Causas,
    pela caçada (`node tools/vazamento.mjs`): (1) **restaurar a partida** (o iOS descarta a aba em
    segundo plano): o save só tinha o centro e o disco no centro de um slime achatado nascia atravessando
    o fundo e as paredes (na 2.0.1, 10 episódios em 2 restaurações; o nível 12 com 35 partículas fora);
    (2) um empurrão de contato maior que a parede num subpasso (um nível 10 lançado 6 u para cima quando
    o slime de baixo evoluiu, e 10 partículas passaram na volta); (3) soltar o 8 ou o gigante em cima
    da borda (nasciam espetados na guia); (4) fusão em grupo puxando um slime que já estava fora.
    Correções: teste de travessia nas paredes (`mundo.js`), separação só na posição depois de partículas
    novas, save com a forma de cada slime (~8,7 KB) e o pote aberto na hora ao restaurar, mira que recua
    para o slime grande, fusão só dentro do pote, remendo do `redimensionar` preso dentro e a rede de
    segurança do `pote.js` (poucas partículas fora voltam na hora; um pedaço grande por 0,4 s volta o
    slime inteiro; telemetria `rede/volta/m<min>`). Caçada final (4 sementes × 8 min, restaurando aos
    300 s): nenhuma travessia; 2 casos na borda (um slime fundindo, um nível 5 em cima da borda no
    terremoto), que a rede resolveu. `test/parede.test.js` (7 testes);
  - **olhos sempre abertos:** sem piscar (nem na tela de loading); feliz com brilho duplo olhando para
    cima, amassado arregalado com boca torta, chorinho e choro marejados com sobrancelha triste, apático
    com olheira olhando para baixo. Folha `docs/visuais/humor-480x600.jpg`;
  - **nível 14** (8,0 u, 444 partículas; dois ocupam ~100% do béquer até a linha): nasce de verdade
    (cartão, `level/14`, 25 gotas da descoberta), comemora ~2 s (incha, aura dourada, estrelas) e estoura
    com os pontos do super slime (`pontosNivel(14)·2·n·combo`); 3 do 13 e o coringa no 13 fazem o 14; a
    tinta no 13 e o 14 de um save também comemoram; no Duelo, o estouro manda 6 gosmas ao rival. Visual
    escolhido: **ouro** (entre ouro, cristal, aurora e plasma, `docs/visuais/nivel14-comparar.jpg`); skins
    Troféus e Coroas (Arco-íris neon e Confete de ouro ficaram nas candidatas);
  - **novo alvo depois do 14:** super slimes da partida na pílula, 20 gotas cada e +20 ao bater o recorde
    (`PREMIO_SUPER`), telemetria `super/<n>/m<min>`;
  - **loading em camadas:** uma gota de cada nível cai do bico e vira uma camada ondulada daquela cor
    (`docs/visuais/carregando.jpg` e `carregando-390x844.gif`);
  - **HUD no retrato:** o placar sai do canto do botão da Poki (`docs/visuais/hud-poki-retrato.png`);
  - verificado com `npm test` (176), `npm run menu`, `jogar 1 5`, `sdkcheck` (5 cenários), `telas`, a
    caçada e os prints (`prints-humor`, `prints-carregando`, `prints-fusao --cenas=super`, `prints-skins`);
  - aprovado pelo usuário ("Tudo aprovado"); `dist-poki/slime-merge-2.0.2.zip` (371 KB; 359 KB gzip) com a
    thumb `slime-merge-2.0.2-thumb.png`; `sdkcheck` também na build (`dist/`) e a build aberta no Chrome sem
    erro. Fica para o próximo teste a física do celular (34% acima de 8 ms no minuto 5);
  - **metas do próximo teste:** média ≥ 7:30; 5m+ ≥ 50%; 1–2m ≤ 13%; `tempo/10` ≥ 26%; `tempo/15` ≥ 16%
    (hoje 12%); `level/14` para ≥ 12%; `super/1` em ≥ 8%; `rede/volta` em ≤ 2% das partidas; `fps/0/m5` no
    celular ≤ 15%.
- **Player Fit Test da 2.0.2** (18/10 03:49, 500 gameplays): **7m41s** (2.0.1: 6m55s). Histograma 74 · 87 ·
  49 · 42 · 45 · 203 (3m+ 58%, 5m+ 40,6%; a 2.0.1 teve 45,6%). A média crua subiu com a cauda: duas sessões de
  93 min e 3 h; sem a maior, 7m20s; **limitada a 30 min, 6m53s** (2.0.1: 6m37s); sem 1% de cada ponta,
  6m57s (6m32s). 20 min+: 42 (24 na 2.0.1); 5–10 min: 80 (110); mediana 3m55s (4m11s). As 39 saídas antes
  de 30 s estão no histórico (31 a 39; a 2.0.1, com 23, foi a exceção). Game Events (688 gameplays: 362
  celular, 250 desktop, 76 tablet):
  - metas: média ≥ 7:30 ✓ (só a crua), `level/14` 13,7% ✓, `super/1` 14,4% ✓; 5m+ 40,6% ✗, 1–2m 17,4% ✗,
    `tempo/10` 23,4% ✗, `tempo/15` 14,1% ✗ (12% na 2.0.1), `rede/volta` ~3–5% (estimado: o evento é por
    minuto, 52 registros) ✗, `fps/0/m5` no celular 21% ✗;
  - **os super slimes seguem o coringa:** `super/1` no minuto 13 em 29 partidas, `super/2` no 19 (13),
    `super/3` no 25 (8), `super/4` no 31: os minutos dos coringas (90 s + 6 min × k). O coringa não funde
    com o maior nível; depois do 1º 14 o maior é o 14 e cada coringa num 13 vira super slime. Ritmo
    (mediana do minuto): 9 m3 · 10 m4 · 11 m6 · 12 m7 · **13 m10** (era m8) · 14 m13;
  - **bug da meta combo-4:** 18.639 completes em 314 partidas (~59 por partida, +20 gotas em cada): o
    último degrau se repetia e o combo ainda alto cumpria a meta nova na fusão seguinte;
  - **entrada:** 16% das partidas nunca fundem (desktop 21,6%: 250 abrem, 240 carregam, 212 tocam, 196
    fundem; celular 11,6%); perda por minuto do 1 ao 5: 19 · 13 · 12 · 18%;
  - **celular:** física acima de 8 ms no minuto 5 em 33% (`custo/fisica-16` é 8–16 ms: 28%; ≥ 16 ms: 5%);
    abaixo de 30 fps em 7% (min 1), 17% (3), 21% (5) e 37,5% (10). O fps do começo quase não decide quem
    sai (dos que começam a 55+ fps, 50% chegam ao minuto 5; abaixo de 30, 44%). `tempo/15`: celular 11%,
    desktop 18,4%;
  - "Ufa!" de 32 a 46% de quem joga por minuto, do 10 ao 18 (igual à 2.0.1); eventos: coringas 65%,
    pedido 56% (94% cumpridos), terremoto 48%, gigante 41%, calor 36%, gelo 32%; intervalo comercial 48%;
    vídeo premiado 14%; o vídeo do míssil falhou 61 vezes em 8 partidas; menu ~9%, 36 compras, nenhuma skin.
- **Versão 2.0.3, depois do PFT da 2.0.2** (2026-10-18, pacote aprovado pelo usuário; escolhas em
  `docs/autoria.md`):
  - **combo-4** (`src/jogo/missoes.js`): depois do último degrau, o combo sobe um (5, 6, 7...); fusão e
    reforço repetem o último (somas);
  - **vídeo que falha** (`main.js`): "Sem vídeo agora" e 30 s sem pedir outro (`ESPERA_VIDEO`), com os
    botões do vídeo apagados (`hud.videoEspera`, `.espera-video`);
  - **física** (`src/fisica/mundo.js`), sem mudar a simulação (mesmo `hash()` do mundo nas sementes 11 e 12,
    6 min cada, 24 pontos): parada, peso e preso marcados por partícula no começo de cada `construirPares`
    (e remarcados quando um slime acorda no meio dos contatos); cópias de posição, raio, slime e marcas na
    ordem das células; um ponteiro por célula que só anda para a frente no lugar de reler os `j <= i`; a
    distância de contato de cada par guardada na montagem (`rijP`); e as paredes por baldes de 1 u (cada
    parede só vê as partículas cuja posição de agora ou do começo do subpasso cai na caixa dela, mais as
    que já andaram por outra parede na mesma chamada). Fim de jogo (`node tools/bancada.mjs --fim`, ~1.250
    partículas): 3,6 → 2,5 ms por quadro (−30%). As partículas maiores nos níveis 10 a 14 ficaram como a
    próxima alavanca;
  - **coringa no fim de jogo** (`pressao.js`: `NIVEL_FIM`, `FIM_CORINGA`, `Agenda.f`): com o 13 feito, um
    coringa a cada 3 eventos e os outros na ordem do ciclo; `forcarEvento` respeita a vez;
  - **fusão de abertura** (`merge.js` `abrir`, gancho novo do `soltar.js`; `main.js` `abrirSozinho`): a
    partida nova do sem fim nasce com uma gotinha no fundo e a gota da mão do nível 1; sem toque, aos 0,6 s
    ela vai para cima e no 1 s cai (as duas viram o nível 2). Conta como a 1ª gota da demonstração, que
    agora espera 2 s parado e solta até 3 (`DEMO_OCIOSO`, `DEMOS`). Com `?semente` só com `?abertura=1`;
  - **telemetria:** `intervalo/<origem>/start` (era `show`) e `ufa/resgate/start`, com o `complete` depois
    de 20 s de jogo (`SEGUIU`; o tempo de jogo para no anúncio): o Completed e o Left do painel dizem quem
    sai no anúncio ou logo depois do resgate; `dica/abertura/show`;
  - verificado com `npm test` (180), `npm run menu`, `jogar 1 5`, `sdkcheck`, `telas` e os prints da
    abertura (`docs/visuais/abertura-390x844.jpg`, `?semente=5&abertura=1`);
  - **metas do próximo teste (dois PFTs):** média limitada a 30 min ≥ 7:15; 5m+ ≥ 46%; 1–2m ≤ 14%;
    `tempo/15` ≥ 16%; `meta/combo-*` uma vez por partida; desktop `level/2` ≥ 85% de quem abre (78%);
    `super/2` ≥ 6%; `tempo/20` ≥ 10% (8,1%); física acima de 8 ms no minuto 5 do celular ≤ 15% (33%);
    `intervalo` e `ufa` com o Completed medido.
- **Recusa da Poki** (2026-10-19, Web Fit Test e game review): "já temos muitos títulos parecidos nessa categoria,
  e ela está ficando saturada". Sem KPIs nem crítica de execução; recomenda olhar o catálogo e uma direção mais
  única. O levantamento do catálogo (13 clones de Suika: Watermelon Drop 674k votos, Merge Rot 563k, Cats Drop
  317k...; Blob Drop e Jelly Fruit Merge já com estética "mole") e o das plataformas estão no cofre do Obsidian
  (`~/git/em_tech/obsidian/POKI/30 Referência/`). Caminhos escolhidos pelo usuário: o Slime Merge na CrazyGames e
  um conceito novo do motor para a Poki (fichas `40 Projetos/Loja de Slime.md` e `Molde.md` no cofre).
- **Versão 2.0.9: build da CrazyGames** (2026-10-19; requisitos lidos em docs.crazygames.com no mesmo dia):
  - `npm run empacotar -- --alvo=crazygames`: SDK v3 (`https://sdk.crazygames.com/crazygames-sdk-v3.js`) no lugar
    do da Poki e o import do `main.js` trocado para `src/core/crazygames.js` (adaptador sobre o `criarPoki`: init +
    `game.loadingStart`, `loadingStop`, `gameplayStart/Stop`, `ad.requestAd` com `adStarted/adFinished/adError`,
    rewarded só no `adFinished`, `measure` vazio, ambiente `disabled` = sem SDK);
  - **Basic Launch:** anúncios desligados pela plataforma e "botão de vídeo sem efeito" reprova, então a build sai
    sem anúncios (`dist-crazygames/slime-merge-2.0.9-basic.zip`): `temAnuncios` falso, `body.sem-anuncio`, nenhum
    pedido ao SDK; o erro `adsDisabledBasicLaunch` também desliga na sessão. `--anuncios` gera a do Full Launch;
  - `settings.muteAudio` (exigido no Full Launch) cala o mestre por cima do mudo do jogador
    (`audio.definirMudoPlataforma`, também no `addSettingsChangeListener`);
  - HUD retrato sem o recuo de 58 px do botão da Poki (`body[data-plataforma]`); textos visíveis sem a marca Poki;
  - o Basic Launch mede sessão média, D1 e conversão (jogar 1 min) em 7 dias e 500 plays (ou 21 dias); a
    referência deles é "10+ min", "10–15% D1" e "80%+". Nossos 7m41s do PFT da Poki ficam abaixo do primeiro;
  - **pendências do Full Launch:** módulo `data` para o progresso (hoje só `localStorage`); "o botão do rewarded
    não pode aparecer na tela de gameplay ativa" (os reforços acabados com 🎬 ficam no pote); `happytime()` nos
    marcos (opcional); capas no tamanho do portal;
  - verificado com `npm test` (201), `sdkcheck` (5 cenários), `telas` e `menu` na build da Poki (recuo de 58 px
    mantido), e as builds da CrazyGames no Chrome com o SDK de verdade: ambiente `local` (vídeo premiado depois
    do aviso de 5 s, áudio mudo no meio e de volta no fim), fora do localhost com `?useLocalSdk=true` (Basic: sem
    botões de vídeo) e no ambiente `disabled` (joga sem SDK), sem erros no console.
- **Versão 2.0.10** (2026-10-19, pedido do usuário; `docs/autoria.md`): cenário padrão = caderno; o jardim custa
  150 gotas na loja (o preço do caderno). Save antigo com o jardim fica com ele. Build da CrazyGames refeita.
- **Versão 2.1.0: Full Launch da CrazyGames** (2026-10-19; escolhas em `docs/autoria.md`). Regras lidas em
  docs.crazygames.com (ads, gameplay, technical, game-covers, sdk/data, sdk/user) e o que mudou por causa delas:
  - "o botão do rewarded não pode ficar na tela de gameplay ativa" e "dê uma alternativa ao anúncio": a oferta
    com pausa do reforço acabado (vídeo, 40 gotas, agora não; mesmo tamanho, fonte e cor, como a regra pede);
  - "áudio mudo só quando o anúncio começa": `calarNoInicio: false` no wrapper; "interface travada durante o
    anúncio": `body.em-anuncio`; "sem midgame em botão de navegação": sem intervalo ao trocar de modo pelo menu
    (o de "jogar de novo" fica: é transição de partida);
  - bloqueador: os vídeos somem com aviso na tela (sem popup) e o jogo segue igual;
  - progresso ligado à conta: módulo `data` (toggle "Progress Save" no portal), com a cópia do save do
    navegador; idioma do `systemInfo.locale`; `happytime` nos recordes;
  - já cumpria: SDK e gameplayStart, cair direto no gameplay, sem botão de tela cheia, sem links externos,
    inglês, física em passo fixo (mesma em qualquer taxa de quadros), legível em 800×450 e 1080×607;
  - verificado: `npm test` (208), `sdkcheck`, `telas`, `menu`; no Chrome com o SDK v3 de verdade (ambiente
    local) a oferta abre pausada, as gotas pagam o +1, Esc fecha, o vídeo premia no fim com o áudio mudo só
    durante ele, o perfil vai para o `SDK.data` e o idioma segue o `locale`. O SDK local avisa no console quando
    um `gameplayStop` vem menos de 1 s depois de um start (ele segura a chamada; não é erro do jogo);
  - builds: `dist-crazygames/slime-merge-2.1.0.zip` (Full, com anúncios) e `-basic.zip` (sem anúncios).
