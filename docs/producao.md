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
