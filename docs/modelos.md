# Os 5 modelos (protótipos 0.1.0, 2026-10-14)

Página de avaliação: `modelos/index.html` (local, pelo `npm run servir`) e o Artifact privado
https://claude.ai/artifact/5EgsYqYhWBrWJhARzaQTxy (abre no celular). GIFs e capas em
`docs/modelos/` (`npm run gifs`).

| # | Modelo | Loop | Diferencial | Ponto forte na Poki | Risco |
|---|---|---|---|---|---|
| 1 | Merge Lab | Mirar, soltar, fundir iguais (12 níveis) | Pilha que assenta e "derrete"; cor nova nasce na costura; 4 reforços da referência + 4 prêmios físicos | Leitura em 1 s (C2P alto), sessão longa, barra de "?" | Gênero Suika conhecido: o diferencial precisa aparecer nos 15 primeiros segundos |
| 2 | Croma | Funde mesmo tamanho, qualquer cor | A cor é a mistura física; Croma-dex de 40 cores; lama | O mais diferente do catálogo; descoberta | Lama pode frustrar; ensinar "tamanho conta, cor não" sem texto |
| 3 | Loja de Slime | Pedido de cor → despejar, sovar, entregar | Mistura KM como regra; sovar marmoriza; dica por gota | ASMR; pausa natural para o intervalo | C2P menor (ler o pedido); cor em tela pequena |
| 4 | Molde | Encher formas por fases (8) | A forma do recipiente é o puzzle; inclinar, espinho, aquecedor, cor alvo | Melhor vitrine do "slime que toma a forma" | Conteúdo curado à mão; gênero "encher" comum |
| 5 | Duelo | Dois potes, melhor de 3 | Gosma cinza que absorve tinta e vira slime | Categoria 2 jogadores forte no desktop | Potes pequenos no celular em pé; física dobrada |

## O que foi medido
- `npm test` (53 testes): física (tunelamento, pilha, energia, "desenha o recipiente",
  determinismo, fuzz, fusão, divisão), cor (pigmentos, matizes das misturas, conservação,
  frente), wrapper Poki, fronteiras do código e os 5 modelos com o bot (Merge Lab não perde
  nos 3 primeiros minutos; Loja entrega com estrela; Molde vence fases; Croma descobre cores;
  Duelo troca gosma).
- `npm run jogar`: os 6 (com o lab) jogados em tempo real com mouse e teclado, em 390×844 e
  1031×580: gestos, pausa (Esc), mudo, reforço, fim, revive e "Jogar de novo". ~60 fps no
  headless sem GPU.
- `npm run sdkcheck`: 5 cenários (normal, vídeo recusado, bloqueador, SDK pendurado,
  localStorage quebrado), ordem dos eventos sem repetição e áudio mudo nos anúncios.
- `npm run telas`: iframe com altura 0, largura 0, escondido e girado.
- `npm run bancada`: 1.624 partículas (pote mais que cheio) com física em 3,3 ms acordada e
  1,7 ms assentada, e campo do render em 1,3–1,5 ms (desktop).
- `npm run empacotar`: build de 142 KB em gzip, sem URL externa nem `console.log`.

## Pendências conhecidas (para a produção do escolhido)
- Teste em celular real (GPU e fps de verdade) e a válvula de câmera lenta se a física passar
  de 8 ms no p90; qualidade adaptativa automática (hoje fica em "alta").
- Música, thumb, metajogo completo (uma moeda, loja de skins, desafio diário), i18n revisado.
- O hub no claude.ai roda sem o SDK da Poki (sem anúncios).
