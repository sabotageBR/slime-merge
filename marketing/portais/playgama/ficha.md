# Slime Merge na Playgama: ficha de envio

Tudo o que o painel da Playgama (developer.playgama.com) pede, com os textos prontos para colar.
O título e os textos vão em inglês, que é obrigatório e é o idioma padrão do jogo.

## Arquivos

| campo do painel | arquivo | regra |
|---|---|---|
| Build (Plain JS) | `dist-portais/slime-merge-playgama-2.1.0.zip` | index.html e playgama-bridge-config.json na raiz, ≤ 300 MB |
| Cover Square 1:1 | `playgama/slime-merge-capa-800x800.png` | 800x800, ≤ 10 MB, obrigatória |
| Cover Portrait 9:16 | `playgama/slime-merge-capa-1080x1920.png` | 1080x1920, ≤ 10 MB, obrigatória |
| Cover Landscape 16:9 | `playgama/slime-merge-capa-1920x1080.png` | 1920x1080, ≤ 10 MB, obrigatória |
| Other assets (opcional) | `playgama/slime-merge-tela-*.jpg, slime-merge-video-1920x1080.mp4` | telas e vídeo de gameplay |

Sem as três capas o painel deixa testar o build, mas não manda para a moderação. As capas também viram
os banners das campanhas de tráfego do sandbox. Os arquivos ficam em `marketing/portais/`.

## Opções do envio

- **Game engine:** Plain JS (`js`). **SDK:** Playgama Bridge v2, do CDN deles (o único recurso de fora
  que o checklist aceita), com a config `playgama-bridge-config.json` (intervalo mínimo de 60 s entre
  intersticiais).
- **Obrigatórios do Bridge, todos no build:**
  - `platform.language` antes do jogo;
  - `sendMessage('game_ready')` quando o jogo fica interativo;
  - `isAudioEnabled` e os eventos de som e de pausa;
  - **o save pelo `bridge.storage`**;
  - o prêmio só no estado `rewarded`.
- **Supported devices:** Desktop, iOS, Android. **Screen orientation:** as duas. No desktop o pote fica no meio, com o HUD em volta; no celular, em pé ou deitado.
- **Game languages:** English, Português, Español.
- **Category:** `merge`.
- **Anúncios:** intersticial na troca de modo pelo menu, no "jogar de novo" e nas pausas naturais dos modos, e vídeo premiado opcional (+1 reforço acabado, reviver, dobrar as gotas). O intervalo que vem do tempo de jogo (o fim de evento do sem fim) sai depois de um aviso de 2 s ("Ad in 2… 1"), com o jogo parado.
- **Distribution:** aceite a distribuição nos parceiros. Para a Playhop/Yandex eles pedem russo, e o
  jogo não tem; deixe a Yandex de fora aqui, porque ela tem build própria (`marketing/portais/yandex/`).

## Title

```
Slime Merge
```

## Description (841 caracteres, mínimo 100)

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

## How to play (627 caracteres, mínimo 100)

```
Aim and drop slimes into the jar. Two slimes of the same size merge into the next level; merge three or more at once to skip a level. Merge again quickly for combos. Use boosts when the jar gets crowded: Swap, Shake, Widen and Missile. Reach level 14 to make a Super Slime. Earn drops by merging and completing missions, and spend them in the shop.

Mouse: move to aim, click to drop
Touch: drag to aim, release to drop
Keyboard: Left/Right or A/D to move, Space or Down to drop
Boosts: click or tap them, or press 1-4
Pause: Esc or P
2 players: A/D and S, Left/Right and Down; on touch, each player uses one half of the screen
```

## Pontos de atenção na revisão

- **"+1 vida" a cada derrota é proibido (regra 6.3):** o "reviver" por vídeo do fim de partida sai deste build (CSS). Os outros vídeos são bônus opcionais, com o selo 🎬 no botão.
- **Botão de mute obrigatório:** o jogo tem.
- A moderação leva de 1 a 5 dias úteis. O sandbox (link público sem moderação) exige Bridge ≥ 2.2.0, e o
  CDN `v2/stable` já está na 2.3.1.

## Como regerar

```bash
node tools/portais.mjs --portal=playgama             # zip e material deste portal
node tools/portais.mjs --portal=playgama --so=builds # só o zip
node tools/portaischeck.mjs playgama           # o SDK falso do portal: carregamento, anúncios, prêmio, pausa, idioma, save
```

O código que fala com o SDK é `src/core/portais/playgama.js (sobre src/core/portal.js)`. A pesquisa das regras é de 2026-10-20; as páginas citadas
podem mudar, confira antes de enviar.
