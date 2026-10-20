# Slime Merge na GameMonetize: ficha de envio

Tudo o que o painel da GameMonetize (gamemonetize.com, Dashboard > My games) pede, com os textos prontos
para colar.

> **Leia antes de enviar.** Os termos de uso (atualizados em 27/02/2025) dizem que *"your submitted game
> cannot be removed because you have accepted publishing rules which are under exclusive agreement
> GameMonetize.com (GMO Holding Ltd.) and their partners"*: o jogo enviado não pode ser retirado depois.

## Antes de gerar o zip: o id

1. Dashboard > My games > **Add game**; na página do jogo criado, copie o **GameId**.
2. Cole em `marketing/portais/ids.json`, em `"gamemonetize"`.
3. Rode `node tools/portais.mjs --portal=gamemonetize --so=builds`. Sai `dist-portais/slime-merge-gamemonetize-2.1.0.zip` (enquanto faltar o id: `dist-portais/slime-merge-gamemonetize-2.1.0-sem-id.zip`, só para teste).
4. No painel: suba o zip, **Verify Game** e **REQUEST ACTIVATION**. Teste sem AdBlock nem VPN, e espere
   cerca de 2 minutos antes de pedir o anúncio de teste.

## Arquivos

| campo do painel | arquivo | regra |
|---|---|---|
| Zip | `dist-portais/slime-merge-gamemonetize-2.1.0.zip` | index.html e os arquivos na raiz (sem pasta por cima) |
| Default image | `gamemonetize/slime-merge-thumb-512x384.jpg` | 512x384, JPEG |
| 512x512 e 512x340 (se o painel pedir) | `gamemonetize/slime-merge-thumb-512x512.jpg, -512x340.jpg` | JPEG |

Os arquivos ficam em `marketing/portais/`.

## Opções do envio

- **SDK:** GameMonetize SDK (`api.gamemonetize.com/sdk.js`), carregado pelo jogo depois do `SDK_OPTIONS`
  com o `gameId`. Pausa e mudo no `SDK_GAME_PAUSE`, volta no `SDK_GAME_START`.
- **Não existe vídeo premiado na GameMonetize:** os botões de vídeo somem e o reforço acabado sai só por gotas.
- **Anúncios:** só o intersticial (`sdk.showBanner()`), e nunca no carregamento, que eles proíbem.
  Sai no "jogar de novo", na troca de modo pelo menu e nas pausas naturais dos modos; o fim de evento do sem fim, que vem do tempo, não pede anúncio. O SDK espera ~130 s entre um e outro.
- **Mobile:** sim. **Orientação:** as duas. No desktop o pote fica no meio, com o HUD em volta; no celular, em pé ou deitado. **Idiomas:** English, Português, Español.
- **Branding/links:** nenhum (o jogo não tem link externo nem "More Games").

## Title

```
Slime Merge
```

## Category e tags (até 7)

Puzzle · Merge, Puzzle, Physics, Casual, Slime, 2 Player, Drop

## Description

```
Slime Merge is a cozy merge puzzle with real jelly physics. Drop slimes into the jar and merge two of the same size into a bigger slime: they wobble, squash and take the shape of the jar. Chain combos, merge three at once to skip a level and climb 14 levels to the golden Super Slime. Play the endless mode with a new event every minute, the Daily Challenge, a Duel against the CPU or 2 players on one device.
```

## Instructions

```
Aim and drop slimes into the jar. Two slimes of the same size merge into the next level; merge three or more at once to skip a level. Merge again quickly for combos. Use boosts when the jar gets crowded: Swap, Shake, Widen and Missile. Reach level 14 to make a Super Slime. Earn drops by merging and completing missions, and spend them in the shop.

Mouse: move to aim, click to drop
Touch: drag to aim, release to drop
Keyboard: Left/Right or A/D to move, Space or Down to drop
Boosts: click or tap them, or press 1-4
Pause: Esc or P
2 players: A/D and S, Left/Right and Down; on touch, each player uses one half of the screen
```

## Como regerar

```bash
node tools/portais.mjs --portal=gamemonetize             # zip e material deste portal
node tools/portais.mjs --portal=gamemonetize --so=builds # só o zip
node tools/portaischeck.mjs gamemonetize           # o SDK falso do portal: carregamento, anúncios, prêmio, pausa, idioma, save
```

O código que fala com o SDK é `src/core/portais/gamemonetize.js (sobre src/core/portal.js)`. A pesquisa das regras é de 2026-10-20; as páginas citadas
podem mudar, confira antes de enviar.
