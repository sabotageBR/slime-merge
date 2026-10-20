# Slime Merge na GameDistribution: ficha de envio

Tudo o que o painel da GameDistribution (developer.gamedistribution.com) pede, com os textos prontos para
colar. Os textos vão em inglês, que é obrigatório.

## Antes de gerar o zip: o id

1. No dashboard, digite o título e clique em **Add**.
2. Na aba **UPLOAD**, copie o **Game ID** (32 caracteres hexadecimais) e cole em
   `marketing/portais/ids.json`, em `"gamedistribution"`.
3. Rode `node tools/portais.mjs --portal=gamedistribution --so=builds`. Sai `dist-portais/slime-merge-gamedistribution-2.1.0.zip` (enquanto faltar o id: `dist-portais/slime-merge-gamedistribution-2.1.0-sem-id.zip`, só para teste).
4. Suba o zip e abra o jogo pelo iframe da aba UPLOAD. **Assista um anúncio inteiro sem pular**: é assim que
   a GD aprova a integração do SDK, e o checkbox "Rewarded Ads" se marca sozinho depois do teste.

Sem o id o SDK nem é carregado: a GD não atribui a receita.

## Arquivos (abas ASSETS e UPLOAD)

| campo do painel | arquivo | regra |
|---|---|---|
| Zip | `dist-portais/slime-merge-gamedistribution-2.1.0.zip` | index.html na raiz, ≤ 500 MB |
| Thumbnail 512x384 | `gamedistribution/slime-merge-thumb-512x384.jpg` | obrigatória; JPG ≤ 500 KB, tamanho exato |
| Thumbnail 512x512 | `gamedistribution/slime-merge-thumb-512x512.jpg` | obrigatória; JPG ≤ 500 KB |
| Thumbnail 200x120 | `gamedistribution/slime-merge-thumb-200x120.jpg` | obrigatória; JPG ≤ 500 KB, sem logo |
| Promo 1280x720 | `gamedistribution/slime-merge-banner-1280x720.jpg` | opcional; JPG ≤ 500 KB, com o título |
| Promo 1280x550 | `gamedistribution/slime-merge-banner-1280x550.jpg` | opcional; JPG ≤ 500 KB, com o título |

As de 512 e a de 200 vão sem o nome (a GD diz que o título fica melhor só nas de 1280, e proíbe logo na de
200), com a arte inteira, sem área vazia nem borda arredondada. Os arquivos ficam em `marketing/portais/`.

## Opções do envio (aba EDIT)

- **Type:** HTML5. **Sub Type:** Javascript.
- **SDK:** GD HTML5 SDK, carregado pelo jogo depois do `GD_OPTIONS` com o `gameId`:
  - **pre-roll** depois do `SDK_READY`, antes de o jogo abrir;
  - mid-roll no "jogar de novo", na troca de modo pelo menu e nas pausas naturais dos modos;
  - o prêmio do vídeo só com `SDK_REWARDED_WATCH_COMPLETE`;
  - pausa e mudo no `SDK_GAME_PAUSE`.
- **Width / Height:** 800 x 600 (o padrão da GD; o jogo se ajusta a qualquer tamanho).
- **Genre (até 2):** Puzzle, Casual.
- **Tags (1 a 5):** Merge, Puzzle, Physics, Casual, Slime.
- **Age Group:** Kids, Teens, Young Adults, Adults. **Child Friendly:** sim. **No Blood:** sim.
- **Languages:** English, Português, Español.
- **Compatibility:** Both (Android e iOS). **Preferred mode of play:** Both.
- **HTTPS Ready:** sim (o jogo não chama nada fora do SDK).

## Name (11 caracteres, máx. 40)

```
Slime Merge
```

## Description (409 caracteres, 120 a 500, com o nome do jogo)

```
Slime Merge is a cozy merge puzzle with real jelly physics. Drop slimes into the jar and merge two of the same size into a bigger slime: they wobble, squash and take the shape of the jar. Chain combos, merge three at once to skip a level and climb 14 levels to the golden Super Slime. Play the endless mode with a new event every minute, the Daily Challenge, a Duel against the CPU or 2 players on one device.
```

## Instructions (348 caracteres, até 500)

```
Aim and drop slimes into the jar. Two slimes of the same size merge into the next level; merge three or more at once to skip a level. Merge again quickly for combos. Use boosts when the jar gets crowded: Swap, Shake, Widen and Missile. Reach level 14 to make a Super Slime. Earn drops by merging and completing missions, and spend them in the shop.
```

## Key game features (209 caracteres, até 300)

```
Squishy jelly physics. 14 slime levels up to the golden Super Slime. Boosts and a new event every minute. Daily Challenge, Duel vs CPU and 2 players. Jars, places and skins to unlock, plus a pixel skin editor.
```

## Pontos de atenção na revisão

- **Mobile Ready:** marcado, o QA testa em aparelhos Android e iOS antigos e novos, e só aprova se o jogo
  funcionar em todos.
- **Paridade de versão (§2.6.4 do contrato):** a versão na GD tem que ser sempre igual à última publicada
  em outro lugar. Toda atualização do jogo tem que subir aqui também.
- A revisão leva de dias a 3 semanas.

## Como regerar

```bash
node tools/portais.mjs --portal=gamedistribution             # zip e material deste portal
node tools/portais.mjs --portal=gamedistribution --so=builds # só o zip
node tools/portaischeck.mjs gamedistribution           # o SDK falso do portal: carregamento, anúncios, prêmio, pausa, idioma, save
```

O código que fala com o SDK é `src/core/portais/gamedistribution.js (sobre src/core/portal.js)`. A pesquisa das regras é de 2026-10-20; as páginas citadas
podem mudar, confira antes de enviar.
