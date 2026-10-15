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
- **Etapas 5 a 7:** pendentes.
