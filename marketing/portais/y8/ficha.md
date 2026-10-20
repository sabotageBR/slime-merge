# Slime Merge na Y8: ficha de envio

Tudo o que o Developer Portal da Y8 (developer.y8.com) pede, com os textos prontos para colar.
Os textos vão em inglês; a Y8 traduz a página pelo subdomínio, e o jogo segue o idioma do site
(`getPlatformLocale`).

## Antes de gerar o zip: os ids

1. Crie o jogo no Developer Portal (só pede o *Game Name*).
2. Abra a aba **SDK Initialization**, copie o **App ID** e o **Game ID** e cole em
   `marketing/portais/ids.json`, em `"y8"`.
3. Rode `node tools/portais.mjs --portal=y8 --so=builds`. Sai `dist-portais/slime-merge-y8-2.1.0.zip` (enquanto faltar o id: `dist-portais/slime-merge-y8-2.1.0-sem-id.zip`, só para teste).

Sem os ids o SDK nem é iniciado, e o jogo roda sem anúncios.

## Arquivos (aba Media e Builds)

| campo do painel | arquivo | regra |
|---|---|---|
| Builds | `dist-portais/slime-merge-y8-2.1.0.zip` | index.html na raiz |
| Standard Screenshot (vira o thumbnail das listas, com teste A/B) | `y8/slime-merge-tela-760x570-1.jpg, -2, -3` | 760x570 exato, ≤ 2 MB, só gameplay |
| Widescreen Screenshot | `y8/slime-merge-tela-1280x720-1.jpg, -2` | 1280x720 exato, ≤ 5 MB, só gameplay |
| Landscape Promo | `y8/slime-merge-promo-1920x1080.jpg` | 1920x1080 exato, ≤ 5 MB |
| Portrait Promo | `y8/slime-merge-promo-1080x1920.jpg` | 1080x1920 exato, ≤ 5 MB |
| Game Card Promo | `y8/slime-merge-card-760x570.jpg` | 760x570 exato, ≤ 2 MB |
| Gameplay video | `y8/slime-merge-video-1920x1080.mp4` | 16:9, ≥ 1280x720, ≥ 15 s, ≤ 50 MB, gameplay desde o 1º segundo |

Os arquivos ficam em `marketing/portais/`. As telas mostram só o jogo, com o HUD e sem menu. As promos
têm o nome do jogo como parte da arte, longe das bordas. O vídeo é uma partida contínua do sem fim, a da CrazyGames sem a abertura com a capa, em H.264 `yuv420p` com trilha de áudio muda (o painel mostrava preto com o vídeo anterior). A `folha.jpg` é só para conferir e não vai para o envio.

## Opções do envio

- **SDK:** Y8 SDK 2-0, carregado do CDN deles (`cdn.y8.com/minimal-sdk/2-0/y8.min.js`, async), com
  `appId` e `gameId`. Anúncios por `showAd` (intersticial `next` e recompensado `reward`).
- **Login, leaderboards, conquistas, cloud save:** não usados (são opcionais). O progresso fica no navegador.
- **Aparelhos:** desktop e celular. **Orientação:** as duas. No desktop o pote fica no meio, com o HUD em volta; no celular, em pé ou deitado.
- **Idiomas do jogo:** English, Português, Español.
- **Anúncios:** intersticial na troca de modo pelo menu, no "jogar de novo" e nas pausas naturais dos modos, e vídeo premiado opcional (+1 reforço acabado, reviver, dobrar as gotas). Na Y8 o intersticial só sai depois de um clique (as diretrizes
  proíbem o automático): "jogar de novo" e a troca de modo pelo menu; as pausas automáticas dos modos e o fim de evento do sem fim não pedem anúncio.
  O pre-roll é da própria Y8.

## Nome

```
Slime Merge
```

## Descrição

```
Slime Merge is a cozy, squishy merge puzzle. Drop slimes into the jar, match two of the same size and watch them hug and merge into a bigger slime. Real jelly physics make every slime wobble, squash and take the shape of the jar, and each one has its own mood.

Chain merges for combos, merge three at once to skip a level and climb 14 levels to the golden Super Slime. Endless mode has no game over: every minute a new event shakes things up.

Features:
- Squishy jelly physics: slimes stretch, squash and slide down the glass
- 14 slime levels, from tiny drops to the golden Super Slime
- Boosts: Swap, Shake, Widen and a homing Missile
- Events: earthquakes, giant drops, heat waves, deep freezes and slime orders
- Daily Challenge, a Duel against the CPU and 2 players on one device
- Unlock jars, places and skins, or draw your own skin
```

## Como jogar / instruções

```
Aim and drop slimes into the jar. Two slimes of the same size merge into the next level; merge three or more at once to skip a level. Merge again quickly for combos. Use boosts when the jar gets crowded: Swap, Shake, Widen and Missile. Reach level 14 to make a Super Slime. Earn drops by merging and completing missions, and spend them in the shop.
```

## Controles

```
Mouse: move to aim, click to drop
Touch: drag to aim, release to drop
Keyboard: Left/Right or A/D to move, Space or Down to drop
Boosts: click or tap them, or press 1-4
Pause: Esc or P
2 players: A/D and S, Left/Right and Down; on touch, each player uses one half of the screen
```

## Categoria e tags

Puzzle · Merge, Puzzle, Physics, Casual, Slime, 2 Player, Drop

## Pontos de atenção na revisão

- **Intersticial só depois de clique:** o build já segue isso. Na revisão, peça dois anúncios seguidos
  para ver o limite de frequência e confirme que o jogo continua.
- **Vídeo:** a Y8 pede "a continuous gameplay clip with no cuts" e recusa trailer. O vídeo é um trecho só, sem corte e sem texto, e começa já no jogo. Depois do upload, o painel gera as prévias de até 20 s sozinho, e isso pode levar alguns minutos.
- A espera entre reenvios para revisão cresce: 0, 6 h, 12 h, 24 h, 2 dias, 5 dias.

## Como regerar

```bash
node tools/portais.mjs --portal=y8             # zip e material deste portal
node tools/portais.mjs --portal=y8 --so=builds # só o zip
node tools/portaischeck.mjs y8           # o SDK falso do portal: carregamento, anúncios, prêmio, pausa, idioma, save
```

O código que fala com o SDK é `src/core/portais/y8.js (sobre src/core/portal.js)`. A pesquisa das regras é de 2026-10-20; as páginas citadas
podem mudar, confira antes de enviar.
