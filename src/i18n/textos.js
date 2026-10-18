// Textos da interface. EN e o padrao (a Poki e global); PT e ES pelo navegador.
// Quase tudo no jogo e icone: estes textos sao os de menu, loja e missoes.
// Modelos com {n} sao preenchidos por `formatar`.

const TEXTOS = {
  en: {
    pontos: 'Score', recorde: 'Best', proximo: 'Next', pausa: 'Paused', continuar: 'Continue', recomecar: 'Restart',
    fim: 'Overflow!', deNovo: 'Play again', reviver: 'Revive', novoRecorde: 'New best!', dobrar: 'Double', menu: 'Menu',
    good: 'Good!', great: 'Great!', slimey: 'Slimey!', incrivel: 'Gooey!', perfeito: 'Perfect!', triplo: 'Triple!', super: 'Super slime!',
    pedido: 'Order', entregar: 'Serve', fase: 'Level', proximaFase: 'Next', estrelas: 'Stars',
    vitoria: 'You win!', derrota: 'You lose', vence1: 'P1 wins!', vence2: 'P2 wins!', ufa: 'Phew!', cpu: 'CPU', jogador: 'P', rodada: 'Round',
    abaJogar: 'Play', abaLoja: 'Shop', abaMissoes: 'Missions',
    grupoCesto: 'Jars', grupoCenario: 'Places', grupoObjeto: 'Slimes',
    semfim: 'Endless', desafio: 'Daily challenge', duelo: 'Duel vs CPU', duelo2: '2 players',
    meta: 'Goal {n}', melhorN: 'Best {n}', liga: 'League {n}', vitorias: '{n}/3 wins', feito: 'Done',
    teclas2p: 'Keys: A D S  ×  ← → ↓ · Touch: each half of the screen',
    equipado: 'Equipped', equipar: 'Equip', dia: 'Day {n}', amanha: 'Tomorrow: +{n}',
    novoNivel: 'New level!', missaoFeita: 'Mission complete!', sequenciaDia: 'Day {n} streak!', proximaPartida: 'Applies next run',
    // o "Ready... Go!" fica em ingles nas 3 linguas, igual a fala do locutor
    'largada.pronto': 'Ready?', 'largada.vai': 'Go!',
    evolucao: 'Evolution!', pedidoOk: 'Order done!', pedidoFeito: 'Order complete!', 'pilula.pedido': 'Make a', 'pilula.super': 'Super slimes: {n} · best {r}',
    'ev.coringas': 'Prism shower!', 'ev.pedido': 'Order!', 'ev.terremoto': 'Earthquake!',
    'ev.gigante': 'Giant drop!', 'ev.calor': 'Heat wave!', 'ev.gelo': 'Deep freeze!',
    poteCresceu: 'The jar grew!', objetivoCresce: 'Level {n}: the jar grows', objetivoProximo: 'Next: level {n}', novoSlime: 'New slime!',
    quaseNivel: 'So close to level {n}!', faltaRecorde: '{n} points short of your best', faltaLoja: '{n} 💧 more for: {item}', podeComprar: 'You can buy: {item}!',
    experimente: 'Try it!',
    'missao.fusao': 'Merge {n} slimes', 'missao.nivel': 'Reach level {n}', 'missao.combo': 'Make a ×{n} combo',
    'missao.pontos': 'Score {n} in one run', 'missao.poder': 'Use {n} boosts', 'missao.duelo': 'Win {n} duels',
    'regra.pequenos': 'Only small slimes fall', 'regra.aquario': 'Round fishbowl', 'regra.xicara': 'Teacup',
    'regra.chacoalho': 'The jar shakes every 25 s', 'regra.semPoderes': 'No boosts', 'regra.prisma': 'Lots of wild prisms',
    'cesto.becher': 'Beaker', 'cesto.vime': 'Wicker basket', 'cesto.balde': 'Wooden bucket', 'cesto.pote': 'Striped pot',
    'cesto.vidro': 'Glass jar', 'cesto.xicara': 'Teacup', 'cesto.caldeirao': 'Cauldron', 'cesto.aquario': 'Fishbowl',
    'cenario.jardim': 'Garden', 'cenario.caderno': 'Notebook', 'cenario.laboratorio': 'Lab', 'cenario.cozinha': 'Kitchen',
    'cenario.quarto': 'Bedroom', 'cenario.doceria': 'Candy shop', 'cenario.mar': 'Under the sea', 'cenario.espaco': 'Space',
    'objeto.classico': 'Classic', 'objeto.kawaii': 'Kawaii', 'objeto.frutinhas': 'Fruits', 'objeto.docinho': 'Candy',
    'objeto.bichinhos': 'Critters', 'objeto.boneco': 'Googly eyes', 'objeto.chapeus': 'Hats', 'objeto.monstrinhos': 'Monsters',
    'poder.trocar': 'Swap', 'poder.chacoalhar': 'Shake', 'poder.alargar': 'Widen', 'poder.mira': 'Missile',
    'poder.calor': 'Heat', 'poder.gelo': 'Freeze', 'poder.tesoura': 'Scissors', 'poder.tinta': 'Paint drop',
    'poder.video': 'watch a video for +1', semVideo: 'No video right now', 'poder.vago': 'Prize slot', 'poder.tinta.curto': 'Paint', 'poder.vago.curto': 'Prize',
    somEfeitos: 'Sound effects and voices', somMusica: 'Music',
    grupoSkins: 'Skins', editar: 'Edit', nivelN: 'Level {n}', 'skin.padrao': 'Default', 'skin.minha': 'My skin',
    'skin.bolhas': 'Bubbles', 'skin.gotas': 'Raindrops', 'skin.melancia': 'Watermelon', 'skin.folhinhas': 'Leaves',
    'skin.xadrez': 'Lilac check', 'skin.florzinhas': 'Little flowers', 'skin.morango': 'Strawberry', 'skin.bengala': 'Candy cane',
    'skin.gomos': 'Orange slices', 'skin.onca': 'Jaguar', 'skin.abelha': 'Bee', 'skin.estrelinhas': 'Little stars',
    'skin.chuva': 'Rain', 'skin.trovao': 'Thunder', 'skin.mosaico': 'Mosaic', 'skin.baloes': 'Balloons',
    'skin.bolhasMar': 'Sea bubbles', 'skin.ancoras': 'Anchors', 'skin.xadrezUva': 'Grape check', 'skin.morcegos': 'Bats',
    'skin.granulado': 'Sprinkles', 'skin.cupcake': 'Cupcake', 'skin.nebulosa': 'Cyan galaxy', 'skin.constelacao': 'Constellation',
    'skin.tesouro': 'Treasure', 'skin.diamantes': 'Diamonds', 'skin.trofeu': 'Trophies', 'skin.coroas': 'Crowns',
  },
  pt: {
    pontos: 'Pontos', recorde: 'Recorde', proximo: 'Próximo', pausa: 'Pausa', continuar: 'Continuar', recomecar: 'Recomeçar',
    fim: 'Transbordou!', deNovo: 'Jogar de novo', reviver: 'Reviver', novoRecorde: 'Novo recorde!', dobrar: 'Dobrar', menu: 'Menu',
    good: 'Boa!', great: 'Ótimo!', slimey: 'Gosmento!', incrivel: 'Incrível!', perfeito: 'Perfeito!', triplo: 'Triplo!', super: 'Super slime!',
    pedido: 'Pedido', entregar: 'Entregar', fase: 'Fase', proximaFase: 'Próxima', estrelas: 'Estrelas',
    vitoria: 'Você venceu!', derrota: 'Você perdeu', vence1: 'J1 venceu!', vence2: 'J2 venceu!', ufa: 'Ufa!', cpu: 'CPU', jogador: 'J', rodada: 'Rodada',
    abaJogar: 'Jogar', abaLoja: 'Loja', abaMissoes: 'Missões',
    grupoCesto: 'Potes', grupoCenario: 'Lugares', grupoObjeto: 'Slimes',
    semfim: 'Sem fim', desafio: 'Desafio do dia', duelo: 'Duelo contra a CPU', duelo2: '2 jogadores',
    meta: 'Meta {n}', melhorN: 'Melhor {n}', liga: 'Liga {n}', vitorias: '{n}/3 vitórias', feito: 'Feito',
    teclas2p: 'Teclas: A D S  ×  ← → ↓ · Toque: cada metade da tela',
    equipado: 'Em uso', equipar: 'Usar', dia: 'Dia {n}', amanha: 'Amanhã: +{n}',
    novoNivel: 'Nível novo!', missaoFeita: 'Missão cumprida!', sequenciaDia: 'Dia {n} seguido!', proximaPartida: 'Vale na próxima partida',
    'largada.pronto': 'Ready?', 'largada.vai': 'Go!',
    evolucao: 'Evolução!', pedidoOk: 'Pedido feito!', pedidoFeito: 'Pedido cumprido!', 'pilula.pedido': 'Faça um', 'pilula.super': 'Super slimes: {n} · recorde {r}',
    'ev.coringas': 'Chuva de coringas!', 'ev.pedido': 'Pedido!', 'ev.terremoto': 'Terremoto!',
    'ev.gigante': 'Gota gigante!', 'ev.calor': 'Onda de calor!', 'ev.gelo': 'Congelou!',
    poteCresceu: 'O pote cresceu!', objetivoCresce: 'Nível {n}: o pote cresce', objetivoProximo: 'Próximo: nível {n}', novoSlime: 'Slime novo!',
    quaseNivel: 'Faltou pouco para o nível {n}!', faltaRecorde: 'Faltaram {n} pontos para o recorde', faltaLoja: 'Faltam {n} 💧 para: {item}', podeComprar: 'Já dá para comprar: {item}!',
    experimente: 'Experimente!',
    'missao.fusao': 'Funda {n} slimes', 'missao.nivel': 'Chegue ao nível {n}', 'missao.combo': 'Faça um combo ×{n}',
    'missao.pontos': 'Faça {n} pontos numa partida', 'missao.poder': 'Use {n} reforços', 'missao.duelo': 'Vença {n} duelos',
    'regra.pequenos': 'Só caem slimes pequenos', 'regra.aquario': 'Aquário redondo', 'regra.xicara': 'Xícara',
    'regra.chacoalho': 'O pote chacoalha a cada 25 s', 'regra.semPoderes': 'Sem reforços', 'regra.prisma': 'Muitos coringas',
    'cesto.becher': 'Béquer', 'cesto.vime': 'Cesta de vime', 'cesto.balde': 'Balde de madeira', 'cesto.pote': 'Pote listrado',
    'cesto.vidro': 'Pote de vidro', 'cesto.xicara': 'Xícara', 'cesto.caldeirao': 'Caldeirão', 'cesto.aquario': 'Aquário',
    'cenario.jardim': 'Jardim', 'cenario.caderno': 'Caderno', 'cenario.laboratorio': 'Laboratório', 'cenario.cozinha': 'Cozinha',
    'cenario.quarto': 'Quarto', 'cenario.doceria': 'Doceria', 'cenario.mar': 'Fundo do mar', 'cenario.espaco': 'Espaço',
    'objeto.classico': 'Clássico', 'objeto.kawaii': 'Kawaii', 'objeto.frutinhas': 'Frutinhas', 'objeto.docinho': 'Docinho',
    'objeto.bichinhos': 'Bichinhos', 'objeto.boneco': 'Olhos de boneco', 'objeto.chapeus': 'Chapéus', 'objeto.monstrinhos': 'Monstrinhos',
    'poder.trocar': 'Trocar', 'poder.chacoalhar': 'Chacoalhar', 'poder.alargar': 'Alargar', 'poder.mira': 'Míssil',
    'poder.calor': 'Calor', 'poder.gelo': 'Gelo', 'poder.tesoura': 'Tesoura', 'poder.tinta': 'Gota de tinta',
    'poder.video': 'assista a um vídeo para ganhar +1', semVideo: 'Sem vídeo agora', 'poder.vago': 'Espaço do prêmio', 'poder.tinta.curto': 'Tinta', 'poder.vago.curto': 'Prêmio',
    somEfeitos: 'Efeitos e falas', somMusica: 'Música',
    grupoSkins: 'Skins', editar: 'Editar', nivelN: 'Nível {n}', 'skin.padrao': 'Padrão', 'skin.minha': 'Minha',
    'skin.bolhas': 'Bolhas', 'skin.gotas': 'Gotas', 'skin.melancia': 'Melancia', 'skin.folhinhas': 'Folhinhas',
    'skin.xadrez': 'Xadrez lilás', 'skin.florzinhas': 'Florzinhas', 'skin.morango': 'Morango', 'skin.bengala': 'Bengala doce',
    'skin.gomos': 'Gomos', 'skin.onca': 'Onça', 'skin.abelha': 'Abelha', 'skin.estrelinhas': 'Estrelinhas',
    'skin.chuva': 'Chuva', 'skin.trovao': 'Trovão', 'skin.mosaico': 'Mosaico', 'skin.baloes': 'Balões',
    'skin.bolhasMar': 'Bolhas do mar', 'skin.ancoras': 'Âncoras', 'skin.xadrezUva': 'Xadrez de uva', 'skin.morcegos': 'Morcegos',
    'skin.granulado': 'Granulado', 'skin.cupcake': 'Cupcake', 'skin.nebulosa': 'Galáxia ciano', 'skin.constelacao': 'Constelação',
    'skin.tesouro': 'Tesouro', 'skin.diamantes': 'Diamantes', 'skin.trofeu': 'Troféus', 'skin.coroas': 'Coroas',
  },
  es: {
    pontos: 'Puntos', recorde: 'Récord', proximo: 'Siguiente', pausa: 'Pausa', continuar: 'Seguir', recomecar: 'Reiniciar',
    fim: '¡Se desbordó!', deNovo: 'Jugar de nuevo', reviver: 'Revivir', novoRecorde: '¡Nuevo récord!', dobrar: 'Doblar', menu: 'Menú',
    good: '¡Bien!', great: '¡Genial!', slimey: '¡Viscoso!', incrivel: '¡Increíble!', perfeito: '¡Perfecto!', triplo: '¡Triple!', super: '¡Súper slime!',
    pedido: 'Pedido', entregar: 'Entregar', fase: 'Nivel', proximaFase: 'Siguiente', estrelas: 'Estrellas',
    vitoria: '¡Ganaste!', derrota: 'Perdiste', vence1: '¡Gana J1!', vence2: '¡Gana J2!', ufa: '¡Uf!', cpu: 'CPU', jogador: 'J', rodada: 'Ronda',
    abaJogar: 'Jugar', abaLoja: 'Tienda', abaMissoes: 'Misiones',
    grupoCesto: 'Frascos', grupoCenario: 'Lugares', grupoObjeto: 'Slimes',
    semfim: 'Sin fin', desafio: 'Desafío del día', duelo: 'Duelo contra la CPU', duelo2: '2 jugadores',
    meta: 'Meta {n}', melhorN: 'Mejor {n}', liga: 'Liga {n}', vitorias: '{n}/3 victorias', feito: 'Hecho',
    teclas2p: 'Teclas: A D S  ×  ← → ↓ · Táctil: cada mitad de la pantalla',
    equipado: 'En uso', equipar: 'Usar', dia: 'Día {n}', amanha: 'Mañana: +{n}',
    novoNivel: '¡Nivel nuevo!', missaoFeita: '¡Misión cumplida!', sequenciaDia: '¡Día {n} seguido!', proximaPartida: 'Vale en la próxima partida',
    'largada.pronto': 'Ready?', 'largada.vai': 'Go!',
    evolucao: '¡Evolución!', pedidoOk: '¡Pedido listo!', pedidoFeito: '¡Pedido cumplido!', 'pilula.pedido': 'Haz un', 'pilula.super': 'Súper slimes: {n} · récord {r}',
    'ev.coringas': '¡Lluvia de comodines!', 'ev.pedido': '¡Pedido!', 'ev.terremoto': '¡Terremoto!',
    'ev.gigante': '¡Gota gigante!', 'ev.calor': '¡Ola de calor!', 'ev.gelo': '¡Congelado!',
    poteCresceu: '¡El frasco creció!', objetivoCresce: 'Nivel {n}: el frasco crece', objetivoProximo: 'Siguiente: nivel {n}', novoSlime: '¡Slime nuevo!',
    quaseNivel: '¡Casi llegas al nivel {n}!', faltaRecorde: 'Te faltaron {n} puntos para tu récord', faltaLoja: 'Faltan {n} 💧 para: {item}', podeComprar: '¡Ya puedes comprar: {item}!',
    experimente: '¡Pruébalo!',
    'missao.fusao': 'Fusiona {n} slimes', 'missao.nivel': 'Llega al nivel {n}', 'missao.combo': 'Haz un combo ×{n}',
    'missao.pontos': 'Haz {n} puntos en una partida', 'missao.poder': 'Usa {n} ayudas', 'missao.duelo': 'Gana {n} duelos',
    'regra.pequenos': 'Solo caen slimes pequeños', 'regra.aquario': 'Pecera redonda', 'regra.xicara': 'Taza',
    'regra.chacoalho': 'El frasco se sacude cada 25 s', 'regra.semPoderes': 'Sin ayudas', 'regra.prisma': 'Muchos comodines',
    'cesto.becher': 'Vaso de precipitado', 'cesto.vime': 'Cesta de mimbre', 'cesto.balde': 'Cubo de madera', 'cesto.pote': 'Bote a rayas',
    'cesto.vidro': 'Frasco de vidrio', 'cesto.xicara': 'Taza', 'cesto.caldeirao': 'Caldero', 'cesto.aquario': 'Pecera',
    'cenario.jardim': 'Jardín', 'cenario.caderno': 'Cuaderno', 'cenario.laboratorio': 'Laboratorio', 'cenario.cozinha': 'Cocina',
    'cenario.quarto': 'Habitación', 'cenario.doceria': 'Pastelería', 'cenario.mar': 'Fondo del mar', 'cenario.espaco': 'Espacio',
    'objeto.classico': 'Clásico', 'objeto.kawaii': 'Kawaii', 'objeto.frutinhas': 'Frutitas', 'objeto.docinho': 'Caramelo',
    'objeto.bichinhos': 'Bichitos', 'objeto.boneco': 'Ojos locos', 'objeto.chapeus': 'Sombreros', 'objeto.monstrinhos': 'Monstruitos',
    'poder.trocar': 'Cambiar', 'poder.chacoalhar': 'Sacudir', 'poder.alargar': 'Ensanchar', 'poder.mira': 'Misil',
    'poder.calor': 'Calor', 'poder.gelo': 'Hielo', 'poder.tesoura': 'Tijeras', 'poder.tinta': 'Gota de tinta',
    'poder.video': 'mira un video para +1', semVideo: 'No hay video ahora', 'poder.vago': 'Espacio del premio', 'poder.tinta.curto': 'Tinta', 'poder.vago.curto': 'Premio',
    somEfeitos: 'Efectos y voces', somMusica: 'Música',
    grupoSkins: 'Skins', editar: 'Editar', nivelN: 'Nivel {n}', 'skin.padrao': 'Original', 'skin.minha': 'La mía',
    'skin.bolhas': 'Burbujas', 'skin.gotas': 'Gotas', 'skin.melancia': 'Sandía', 'skin.folhinhas': 'Hojitas',
    'skin.xadrez': 'Cuadros lila', 'skin.florzinhas': 'Florecitas', 'skin.morango': 'Fresa', 'skin.bengala': 'Bastón de caramelo',
    'skin.gomos': 'Gajos', 'skin.onca': 'Jaguar', 'skin.abelha': 'Abeja', 'skin.estrelinhas': 'Estrellitas',
    'skin.chuva': 'Lluvia', 'skin.trovao': 'Trueno', 'skin.mosaico': 'Mosaico', 'skin.baloes': 'Globos',
    'skin.bolhasMar': 'Burbujas de mar', 'skin.ancoras': 'Anclas', 'skin.xadrezUva': 'Cuadros de uva', 'skin.morcegos': 'Murciélagos',
    'skin.granulado': 'Chispas de colores', 'skin.cupcake': 'Magdalena', 'skin.nebulosa': 'Galaxia cian', 'skin.constelacao': 'Constelación',
    'skin.tesouro': 'Tesoro', 'skin.diamantes': 'Diamantes', 'skin.trofeu': 'Trofeos', 'skin.coroas': 'Coronas',
  },
};

/**
 * Textos do editor de skins (src/ui/editor.js) nos outros idiomas; o padrao do editor e o
 * portugues (TEXTOS_EDITOR).
 */
const EDITOR = {
  en: {
    titulo: 'My skin', nivel: 'Level {n}', salvar: 'Save', fechar: 'Close', salvo: 'Saved!',
    pincel: 'Brush', borracha: 'Eraser', balde: 'Fill', contaGotas: 'Picker', espelho: 'Mirror', guias: 'Guides',
    desfazer: 'Undo', refazer: 'Redo', limpar: 'Clear',
    modo: 'Drawing', ladrilho: 'Tile', estampa: 'Print', tamanho: 'Size', P: 'S', M: 'M', G: 'L',
    corDoCorpo: 'Body color', paleta: 'Colors', comecarDe: 'Start from', previa: 'Preview', grade: '16 by 16 pixel grid',
    'modelo.vazio': 'Blank', 'modelo.listras': 'Stripes', 'modelo.bolinhas': 'Dots', 'modelo.xadrez': 'Check', 'modelo.borda': 'Border',
    dicaLadrilho: 'The drawing repeats over the body: what leaves one side comes in on the other.',
    dicaEstampa: 'One drawing covers the whole body. The face stays on top.',
    descartar: 'Discard the changes?', sim: 'Discard', nao: 'Keep editing',
    cores: {
      slime: 'Slime color', tinta: 'Ink', branco: 'White', cinza: 'Gray', vermelho: 'Red', laranja: 'Orange', amarelo: 'Yellow',
      verdeClaro: 'Light green', verde: 'Green', turquesa: 'Turquoise', azul: 'Blue', azulEscuro: 'Dark blue', roxo: 'Purple', rosa: 'Pink',
      marrom: 'Brown', bege: 'Beige',
    },
    bases: {
      nivel: 'Level color', vermelho: 'Red', laranja: 'Orange', amarelo: 'Yellow', limao: 'Lime', verde: 'Green', turquesa: 'Turquoise',
      azul: 'Blue', anil: 'Indigo', roxo: 'Purple', rosa: 'Pink', areia: 'Sand', chocolate: 'Chocolate',
    },
  },
  es: {
    titulo: 'Mi skin', nivel: 'Nivel {n}', salvar: 'Guardar', fechar: 'Cerrar', salvo: '¡Guardado!',
    pincel: 'Pincel', borracha: 'Goma', balde: 'Cubo', contaGotas: 'Cuentagotas', espelho: 'Espejo', guias: 'Guías',
    desfazer: 'Deshacer', refazer: 'Rehacer', limpar: 'Borrar todo',
    modo: 'Dibujo', ladrilho: 'Mosaico', estampa: 'Estampado', tamanho: 'Tamaño', P: 'P', M: 'M', G: 'G',
    corDoCorpo: 'Color del cuerpo', paleta: 'Colores', comecarDe: 'Empezar de', previa: 'Vista previa', grade: 'Cuadrícula de 16 por 16 píxeles',
    'modelo.vazio': 'Vacío', 'modelo.listras': 'Rayas', 'modelo.bolinhas': 'Lunares', 'modelo.xadrez': 'Cuadros', 'modelo.borda': 'Borde',
    dicaLadrilho: 'El dibujo se repite por el cuerpo: lo que sale por un lado entra por el otro.',
    dicaEstampa: 'Un dibujo cubre todo el cuerpo. La cara queda encima.',
    descartar: '¿Descartar los cambios?', sim: 'Descartar', nao: 'Seguir editando',
    cores: {
      slime: 'Color del slime', tinta: 'Tinta', branco: 'Blanco', cinza: 'Gris', vermelho: 'Rojo', laranja: 'Naranja', amarelo: 'Amarillo',
      verdeClaro: 'Verde claro', verde: 'Verde', turquesa: 'Turquesa', azul: 'Azul', azulEscuro: 'Azul oscuro', roxo: 'Morado', rosa: 'Rosa',
      marrom: 'Marrón', bege: 'Beige',
    },
    bases: {
      nivel: 'Color del nivel', vermelho: 'Rojo', laranja: 'Naranja', amarelo: 'Amarillo', limao: 'Lima', verde: 'Verde', turquesa: 'Turquesa',
      azul: 'Azul', anil: 'Añil', roxo: 'Morado', rosa: 'Rosa', areia: 'Arena', chocolate: 'Chocolate',
    },
  },
};

/** Textos do editor de skins no idioma ({} no portugues: o editor ja vem nele). @param {string} idioma */
export function textosEditor(idioma) {
  return EDITOR[idioma] || {};
}

/** @param {string} [forcado] */
export function escolherIdioma(forcado) {
  const pedidos = [forcado, ...(typeof navigator !== 'undefined' ? navigator.languages || [navigator.language] : [])];
  for (const l of pedidos) {
    const k = String(l || '').slice(0, 2).toLowerCase();
    if (k in TEXTOS) return k;
  }
  return 'en';
}

/** @param {string} idioma @returns {Record<string, string>} */
export function textos(idioma) {
  return { ...TEXTOS.en, ...(TEXTOS[idioma] || {}) };
}

/** Preenche {n} (e outros {chave}) num texto. */
export function formatar(t, valores) {
  return String(t || '').replace(/\{(\w+)\}/g, (_, k) => (valores && k in valores ? String(valores[k]) : ''));
}

/** Numero com separador de milhar do idioma. */
export function numero(n, idioma) {
  try { return Number(n).toLocaleString(idioma === 'pt' ? 'pt-BR' : idioma); } catch { return String(n); }
}
