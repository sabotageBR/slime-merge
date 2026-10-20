# Slime Merge na Yandex Games: ficha de envio

Tudo o que o Console da Yandex Games (yandex.com/dev/games/console) pede, com os textos prontos para colar.
O rascunho vem com as abas **EN** e **RU**: os textos das duas estão abaixo. **O jogo não está traduzido
para o russo**; em "Game translated into" marque só os idiomas do jogo, porque a moderação testa todos os
marcados.

**Antes de enviar para a moderação, assine o contrato** (ULM no Console, para pessoa jurídica de fora da
Rússia).

## Arquivos

| campo do painel | arquivo | regra |
|---|---|---|
| Archive | `dist-portais/slime-merge-yandex-2.1.0.zip` | index.html na raiz, ≤ 100 MB descompactado, nomes sem espaço |
| Icon | `yandex/slime-merge-icone-512x512.png` | 512x512, sem texto nem UI |
| Cover | `yandex/slime-merge-capa-800x470.png` | 800x470; o nome igual ao título do idioma |
| Cover (alternativa) | `yandex/slime-merge-capa-800x470-sem-texto.png` | a mesma, sem o nome |
| Hero image (opcional) | `yandex/slime-merge-hero-1560x520.png` | 1560x520 |
| Screenshots desktop | `yandex/slime-merge-tela-desktop-1920x1080-1.png, -2, -3` | 16:9, mínimo 2, gameplay real |
| Screenshots mobile | `yandex/slime-merge-tela-mobile-1080x1920-1.png, -2, -3` | 9:16, mínimo 2, gameplay real |
| Horizontal video | `yandex/slime-merge-video-1920x1080.mp4` | 16:9, ≤ 28 s, ≤ 100 MB, ≥ 70% gameplay |

Cada idioma do rascunho tem o seu conjunto de mídias. Use as mesmas nas duas abas: o nome na capa é
**Slime Merge**, e ele é o título nas duas. Os arquivos ficam em `marketing/portais/`.

## Opções do envio

- **SDK:** `<script src="/sdk.js">`, relativo, como a Yandex pede (item 1.7). Fora da Yandex o arquivo não
  existe e o jogo roda sem SDK. Confira no rascunho com `&debug-mode=16`: o painel deve mostrar `IT`.
- **O que o build faz pelos requisitos:**
  - `LoadingAPI.ready()` quando o jogo fica interativo (1.19.2);
  - o idioma por `environment.i18n.lang` na inicialização (2.14);
  - `game_api_pause` e `game_api_resume` calam e pausam o jogo, inclusive no anúncio que a Yandex mostra
    na abertura (4.7);
  - nenhum menu de contexto no clique direito nem no toque longo (1.6.1.8 e 1.6.2.7);
  - o prêmio do vídeo só no `onRewarded`.
- **Cloud save:** não. O progresso fica no armazenamento do navegador, que o requisito 1.9 aceita para jogo
  sem compra. **Compras:** não.
- **Supported platforms:** desktop, mobile, tablet. **Orientation:** as duas. No desktop o pote fica no meio, com o HUD em volta; no celular, em pé ou deitado.
- **Game translated into:** English, Português, Español.
- **Age rating:** 0+ (sem violência, sem texto livre, sem conta própria).
- **Categories (até 2):** Puzzle e Casual.
- **Anúncios:** intersticial na troca de modo pelo menu, no "jogar de novo" e nas pausas naturais dos modos, e vídeo premiado opcional (+1 reforço acabado, reviver, dobrar as gotas). O intervalo que vem do tempo de jogo (o fim de evento do sem fim) sai depois de um aviso de 2 s ("Ad in 2… 1") com o jogo parado, como o item 4.4 pede para fases com mais de 5 minutos.

## EN

**Title**
```
Slime Merge
```
**Short description** (65 caracteres, máx. 70, sem o nome)
```
Drop squishy slimes, merge matching ones and grow the Super Slime
```
**SEO description** (131 caracteres, 50 a 160)
```
A cozy merge puzzle with real jelly physics: drop squishy slimes into the jar, merge matching ones and grow the golden Super Slime.
```
**Description** (841 caracteres, 100 a 1000)
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
**How to play** (627 caracteres, 100 a 1000)
```
Aim and drop slimes into the jar. Two slimes of the same size merge into the next level; merge three or more at once to skip a level. Merge again quickly for combos. Use boosts when the jar gets crowded: Swap, Shake, Widen and Missile. Reach level 14 to make a Super Slime. Earn drops by merging and completing missions, and spend them in the shop.

Mouse: move to aim, click to drop
Touch: drag to aim, release to drop
Keyboard: Left/Right or A/D to move, Space or Down to drop
Boosts: click or tap them, or press 1-4
Pause: Esc or P
2 players: A/D and S, Left/Right and Down; on touch, each player uses one half of the screen
```
**Keywords** (61 caracteres, máx. 100)
```
merge, slime, physics, puzzle, jelly, drop, casual, 2 players
```

## RU

**Title**
```
Slime Merge
```
**Short description** (68 caracteres, máx. 70)
```
Бросайте мягких слаймов, соединяйте одинаковых и растите Суперслайма
```
**SEO description** (133 caracteres, 50 a 160)
```
Уютная головоломка с настоящей физикой желе: бросайте мягких слаймов в банку, соединяйте одинаковых и вырастите золотого Суперслайма.
```
**Description** (889 caracteres, 100 a 1000)
```
Slime Merge — уютная головоломка про мягких слаймов. Бросайте слаймов в банку, соединяйте двух одинаковых и смотрите, как они обнимаются и сливаются в слайма побольше. Настоящая физика желе: каждый слайм колышется, сплющивается и принимает форму банки, а у каждого своё настроение.

Собирайте комбо, соединяйте трёх сразу, чтобы перескочить уровень, и пройдите 14 уровней до золотого Суперслайма. В бесконечном режиме нет проигрыша: каждую минуту происходит новое событие.

Особенности:
- Мягкая физика желе: слаймы тянутся, сплющиваются и сползают по стеклу
- 14 уровней слаймов, от крошечной капли до золотого Суперслайма
- Бонусы: Обмен, Встряска, Расширение и самонаводящаяся Ракета
- События: землетрясение, гигантская капля, жара, заморозка и заказы
- Испытание дня, дуэль с компьютером и игра вдвоём на одном устройстве
- Банки, места и скины, а ещё свой скин в пиксельном редакторе
```
**How to play** (381 caracteres, 100 a 1000)
```
Прицельтесь и бросайте слаймов в банку. Два слайма одного размера сливаются в слайма следующего уровня; если соединить трёх и больше сразу, уровень перескакивается. Соединяйте быстро, чтобы собирать комбо. Когда в банке тесно, используйте бонусы: Обмен, Встряску, Расширение и Ракету. Дойдите до 14 уровня, чтобы получить Суперслайма. Капли за слияния и задания тратьте в магазине.
```
**Keywords** (61 caracteres, máx. 100)
```
слайм, слияние, физика, головоломка, желе, казуальная, вдвоём
```

## Developer's comment (opcional)

```
Ads: interstitials on "play again", when switching modes from the menu and, in the endless mode, after a 2-second "Ad in 2... 1" warning with the game paused. Rewarded videos only by the player choice, with the reward shown on the button. Progress is saved in the browser storage. The game has no purchases and no external links.
```

## Pontos de atenção na revisão

- **Russo:** não é obrigatório, mas a Yandex recomenda RU+EN, e a seção "Popular" exige os dois. Traduzir
  o jogo para o russo é o que mais aumentaria o alcance aqui.
- **Item 4.4:** confira na moderação que o aviso de 2 s aparece antes de cada intervalo do sem fim.
- A moderação leva de 3 a 5 dias úteis. Depois de uma recusa, a espera para reenviar começa em 24 h e dobra
  a cada recusa.

## Como regerar

```bash
node tools/portais.mjs --portal=yandex             # zip e material deste portal
node tools/portais.mjs --portal=yandex --so=builds # só o zip
node tools/portaischeck.mjs yandex           # o SDK falso do portal: carregamento, anúncios, prêmio, pausa, idioma, save
```

O código que fala com o SDK é `src/core/portais/yandex.js (sobre src/core/portal.js)`. A pesquisa das regras é de 2026-10-20; as páginas citadas
podem mudar, confira antes de enviar.
