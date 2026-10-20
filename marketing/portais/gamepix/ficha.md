# Slime Merge na GamePix: ficha de envio

Tudo o que o painel da GamePix (my.gamepix.com) pede, com os textos prontos para colar.

> **A GamePix pede "Do not use AI-generated text"** na descrição. Os textos abaixo partem dos da CrazyGames;
> revise e ajuste com as suas palavras antes de colar.

## Arquivos

| campo do painel | arquivo | regra |
|---|---|---|
| Build | `dist-portais/slime-merge-gamepix-2.1.0.zip` | index.html na raiz (compacte os arquivos, não a pasta) |
| Icon | `gamepix/slime-merge-icone-256x256.png` | 256x256, ≤ 1 MB |
| Cover | `gamepix/slime-merge-capa-1360x850.png` | 1360x850, ≤ 1,5 MB |
| Video (opcional) | `link do YouTube ou Vimeo` | o painel não aceita upload |

O título nas imagens é o do jogo. Os arquivos ficam em `marketing/portais/`.

## Opções do envio (aba Info)

- **Game engine:** HTML5-JS. **SDK integration:** sim. O GamePix SDK v3 é o primeiro script do `<head>`,
  sem async.
- **O que o build faz pelas diretrizes:**
  - `loaded()` antes de tudo e `lang()` para o idioma;
  - `pause`/`resume` calam e pausam;
  - o save no `GamePix.localStorage`;
  - `updateLevel` e `happyMoment` nos marcos;
  - intersticial só entre partidas e modos, nunca por tempo;
  - nenhum link externo nem botão de sair.
- **Orientation:** all. **Desktop friendly** e **Mobile friendly:** sim.
- **Main tag:** Puzzle. **Tags extras (até 4, da lista do painel):** Merge, Physics, Casual, Slime
  (use as que existirem na lista).
- **Allow distribution:** sim, se quiser o jogo também nos sites parceiros.

## Title

```
Slime Merge
```

## Description (409 caracteres, 100 a 500)

```
Slime Merge is a cozy merge puzzle with real jelly physics. Drop slimes into the jar and merge two of the same size into a bigger slime: they wobble, squash and take the shape of the jar. Chain combos, merge three at once to skip a level and climb 14 levels to the golden Super Slime. Play the endless mode with a new event every minute, the Daily Challenge, a Duel against the CPU or 2 players on one device.
```

## How to Play (controles primeiro, até 500)

```
Desktop: move the mouse to aim and click to drop (or Left/Right and Space). Esc or P to pause.
Mobile: drag to aim and release to drop.

Aim and drop slimes into the jar. Two slimes of the same size merge into the next level; merge three or more at once to skip a level. Merge again quickly for combos. Use boosts when the jar gets crowded: Swap, Shake, Widen and Missile. Reach level 14 to make a Super Slime. Earn drops by merging and completing missions, and spend them in the shop.
```

## Pontos de atenção na revisão

- **Duplicatas:** "if the submitted game is already present in the GamePix catalog, it may not be approved". O catálogo tem vários jogos de soltar e fundir (a Poki recusou o Slime Merge por categoria saturada). Na descrição, deixe claro o que é só dele: a física de gelatina, a mistura de cor e os eventos.
- Teste antes no Testing Toolkit (my.gamepix.com/sdk/toolkit): ele aceita o zip (até 200 MB, fica 24 h no ar)
  e tem os testes "Pause", "Resume" e "Open Tab to Check Audio Stop". Lá o vídeo premiado responde
  `success` em metade das vezes, de propósito.

## Como regerar

```bash
node tools/portais.mjs --portal=gamepix             # zip e material deste portal
node tools/portais.mjs --portal=gamepix --so=builds # só o zip
node tools/portaischeck.mjs gamepix           # o SDK falso do portal: carregamento, anúncios, prêmio, pausa, idioma, save
```

O código que fala com o SDK é `src/core/portais/gamepix.js (sobre src/core/portal.js)`. A pesquisa das regras é de 2026-10-20; as páginas citadas
podem mudar, confira antes de enviar.
