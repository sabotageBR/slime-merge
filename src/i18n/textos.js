// Textos da interface. EN e o padrao (a Poki e global); PT e ES pelo navegador.
// Quase tudo no jogo e icone: estes textos sao os de menu, loja e missoes.
// Modelos com {n} sao preenchidos por `formatar`.

const TEXTOS = {
  en: {
    pontos: 'Score', recorde: 'Best', proximo: 'Next', pausa: 'Paused', continuar: 'Continue', recomecar: 'Restart',
    fim: 'Overflow!', deNovo: 'Play again', reviver: 'Revive', novoRecorde: 'New best!', dobrar: 'Double', menu: 'Menu',
    good: 'Good!', great: 'Great!', slimey: 'Slimey!', incrivel: 'Gooey!', perfeito: 'Perfect!',
    pedido: 'Order', entregar: 'Serve', fase: 'Level', proximaFase: 'Next', estrelas: 'Stars',
    vitoria: 'You win!', derrota: 'You lose', vence1: 'P1 wins!', vence2: 'P2 wins!', ufa: 'Phew!', cpu: 'CPU', jogador: 'P', rodada: 'Round',
    abaJogar: 'Play', abaLoja: 'Shop', abaMissoes: 'Missions',
    grupoCesto: 'Jars', grupoCenario: 'Places', grupoObjeto: 'Slimes',
    semfim: 'Endless', desafio: 'Daily challenge', duelo: 'Duel vs CPU', duelo2: '2 players',
    meta: 'Goal {n}', melhorN: 'Best {n}', liga: 'League {n}', vitorias: '{n}/3 wins', feito: 'Done',
    teclas2p: 'Keys: A D S  ×  ← → ↓ · Touch: each half of the screen',
    equipado: 'Equipped', equipar: 'Equip', dia: 'Day {n}', amanha: 'Tomorrow: +{n}',
    novoNivel: 'New level!', missaoFeita: 'Mission complete!', sequenciaDia: 'Day {n} streak!', proximaPartida: 'Applies next run',
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
  },
  pt: {
    pontos: 'Pontos', recorde: 'Recorde', proximo: 'Próximo', pausa: 'Pausa', continuar: 'Continuar', recomecar: 'Recomeçar',
    fim: 'Transbordou!', deNovo: 'Jogar de novo', reviver: 'Reviver', novoRecorde: 'Novo recorde!', dobrar: 'Dobrar', menu: 'Menu',
    good: 'Boa!', great: 'Ótimo!', slimey: 'Gosmento!', incrivel: 'Incrível!', perfeito: 'Perfeito!',
    pedido: 'Pedido', entregar: 'Entregar', fase: 'Fase', proximaFase: 'Próxima', estrelas: 'Estrelas',
    vitoria: 'Você venceu!', derrota: 'Você perdeu', vence1: 'J1 venceu!', vence2: 'J2 venceu!', ufa: 'Ufa!', cpu: 'CPU', jogador: 'J', rodada: 'Rodada',
    abaJogar: 'Jogar', abaLoja: 'Loja', abaMissoes: 'Missões',
    grupoCesto: 'Potes', grupoCenario: 'Lugares', grupoObjeto: 'Slimes',
    semfim: 'Sem fim', desafio: 'Desafio do dia', duelo: 'Duelo contra a CPU', duelo2: '2 jogadores',
    meta: 'Meta {n}', melhorN: 'Melhor {n}', liga: 'Liga {n}', vitorias: '{n}/3 vitórias', feito: 'Feito',
    teclas2p: 'Teclas: A D S  ×  ← → ↓ · Toque: cada metade da tela',
    equipado: 'Em uso', equipar: 'Usar', dia: 'Dia {n}', amanha: 'Amanhã: +{n}',
    novoNivel: 'Nível novo!', missaoFeita: 'Missão cumprida!', sequenciaDia: 'Dia {n} seguido!', proximaPartida: 'Vale na próxima partida',
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
  },
  es: {
    pontos: 'Puntos', recorde: 'Récord', proximo: 'Siguiente', pausa: 'Pausa', continuar: 'Seguir', recomecar: 'Reiniciar',
    fim: '¡Se desbordó!', deNovo: 'Jugar de nuevo', reviver: 'Revivir', novoRecorde: '¡Nuevo récord!', dobrar: 'Doblar', menu: 'Menú',
    good: '¡Bien!', great: '¡Genial!', slimey: '¡Viscoso!', incrivel: '¡Increíble!', perfeito: '¡Perfecto!',
    pedido: 'Pedido', entregar: 'Entregar', fase: 'Nivel', proximaFase: 'Siguiente', estrelas: 'Estrellas',
    vitoria: '¡Ganaste!', derrota: 'Perdiste', vence1: '¡Gana J1!', vence2: '¡Gana J2!', ufa: '¡Uf!', cpu: 'CPU', jogador: 'J', rodada: 'Ronda',
    abaJogar: 'Jugar', abaLoja: 'Tienda', abaMissoes: 'Misiones',
    grupoCesto: 'Frascos', grupoCenario: 'Lugares', grupoObjeto: 'Slimes',
    semfim: 'Sin fin', desafio: 'Desafío del día', duelo: 'Duelo contra la CPU', duelo2: '2 jugadores',
    meta: 'Meta {n}', melhorN: 'Mejor {n}', liga: 'Liga {n}', vitorias: '{n}/3 victorias', feito: 'Hecho',
    teclas2p: 'Teclas: A D S  ×  ← → ↓ · Táctil: cada mitad de la pantalla',
    equipado: 'En uso', equipar: 'Usar', dia: 'Día {n}', amanha: 'Mañana: +{n}',
    novoNivel: '¡Nivel nuevo!', missaoFeita: '¡Misión cumplida!', sequenciaDia: '¡Día {n} seguido!', proximaPartida: 'Vale en la próxima partida',
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
  },
};

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
