# Slime Merge nos portais de distribuição

Builds e material gráfico para Y8, Playgama, Yandex Games, GameMonetize, GameDistribution e GamePix
(2026-10-20, versão 2.1.0). Cada pasta tem as imagens e os vídeos no tamanho e no formato exatos que o
painel pede, a `ficha.md` com as opções do envio e os textos para colar, e uma `folha.jpg` para conferir
tudo de uma vez.

**Arte das capas e dos ícones (desde 2026-10-21):** a imagem que o usuário escolheu, feita no Grok
(`marketing/capa-heroi/grok/grok-original-1408.jpg`: a pilha de slimes do jogo, o par azul se fundindo, raios
de sol), composta por `tools/capa-pilha.html?modo=grok` em cada tamanho: com o título "Slime Merge" onde o
portal aceita; sem o título (GameDistribution 512x384, 512x512 e 200x120; Yandex sem texto), só a arte
recortada na proporção; os ícones (Yandex 512, GamePix 256), o close do slime vermelho. As capas da
CrazyGames (`marketing/crazygames/capa-*.png`) e a abertura dos vídeos usam a mesma arte. As telas continuam
o jogo de verdade.

| portal | zip | material e ficha | estado |
|---|---|---|---|
| Y8 | `dist-portais/slime-merge-y8-2.1.0-sem-id.zip` | [`y8/`](y8/ficha.md) | **falta o id do painel** |
| Playgama | `dist-portais/slime-merge-playgama-2.1.0.zip` | [`playgama/`](playgama/ficha.md) | pronto |
| Yandex Games | `dist-portais/slime-merge-yandex-2.1.0.zip` | [`yandex/`](yandex/ficha.md) | pronto |
| GameMonetize | `dist-portais/slime-merge-gamemonetize-2.1.0-sem-id.zip` | [`gamemonetize/`](gamemonetize/ficha.md) | **falta o id do painel** |
| GameDistribution | `dist-portais/slime-merge-gamedistribution-2.1.0-sem-id.zip` | [`gamedistribution/`](gamedistribution/ficha.md) | **falta o id do painel** |
| GamePix | `dist-portais/slime-merge-gamepix-2.1.0.zip` | [`gamepix/`](gamepix/ficha.md) | pronto |

## Os ids dos painéis

Y8, GameDistribution e GameMonetize dão ao jogo um id que vai **dentro** do zip. Crie o jogo em cada
painel, cole os ids em `ids.json` (nesta pasta) e gere de novo:

```bash
node tools/portais.mjs --portal=y8,gamedistribution,gamemonetize --so=builds
```

Enquanto faltar o id, o zip sai com `-sem-id` no nome e roda sem anúncios: serve só para testar.

## Tudo de uma vez

```bash
node tools/portais.mjs              # os seis zips e todo o material
node tools/portais.mjs --so=builds  # só os zips
node tools/portais.mjs --so=arte    # só as imagens e os vídeos
node tools/portais.mjs --so=capas   # só as capas e os ícones (a arte)
node tools/portais.mjs --so=videos  # só os vídeos (o vertical da Yandex sai antes, de tools/capas-crazy.mjs --so=videos --video=1080x1920)
node tools/portaischeck.mjs         # os seis builds com o SDK falso de cada portal
```

As regras de cada portal (SDK, anúncios, imagens, textos) vêm da pesquisa de 2026-10-20 nas páginas oficiais.
A fonte de cada regra está citada na ficha do portal e no cofre do Obsidian
(`POKI/30 Referência/Outras plataformas web.md`).
