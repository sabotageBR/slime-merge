// Candidatas do Estudio de skins (modelos/skins.html, 2026-10-15): 4 por nivel, o usuario marca
// 2 e as escolhidas entram no catalogo SKINS de src/jogo/skins.js. Fica fora de src (nao vai
// para a build). Gerado a partir das formas desenhadas a mao; as regras de cada uma (C+M+Y >=
// 0,25 por causa da gosma do Duelo, e DeltaE >= 12 da cor media contra a padrao dos niveis
// vizinhos) sao conferidas em test/skins.test.js.
//
// px: 16 linhas de 16 digitos hex (indices da PALETA; 0 = cor do slime). modo 0 ladrilho, 1 estampa.

import { PROC, precoSugerido } from '../src/jogo/skins.js';

/** @type {Array<import('../src/jogo/skins.js').Skin & { nome: string, nota: string }>} */
export const CANDIDATAS = [
  // ---- nivel 1
  { id: 'bolhas', nivel: 1, nome: 'Bolhas', tipo: 'proc', preco: precoSugerido('proc', 1), pig: [0.46, 0.02, 0, 0], proc: PROC.bolhas, cor: '#ffffff', escala: 1.6, nota: 'Bolhas de sabão com brilho, no azul da gotinha.' },
  {
    id: 'gotas', nivel: 1, nome: 'Gotas', tipo: 'pixel', preco: precoSugerido('pixel', 1), pig: [0.42, 0, 0, 0], modo: 0, escala: 1.8, nota: 'Gotas d’água com reflexo.',
    px: [
      '0000000000000000', '0002000000000000', '0002000000000000', '0022200000002000',
      '0222220000000000', '02a2220000000000', '0222220000000000', '0022200000000000',
      '0000000000020000', '0000000000020000', '0000000000222000', '0000020002222200',
      '0000000002a22200', '0000000002222200', '0000000000222000', '0000000000000000',
    ],
  },
  {
    id: 'flocos', nivel: 1, nome: 'Flocos de neve', tipo: 'pixel', preco: precoSugerido('pixel', 1), pig: [0.5, 0.08, 0, 0], modo: 0, escala: 1.8, nota: 'Flocos de neve brancos num azul mais frio.',
    px: [
      '0000000000000000', '0000200000000000', '0020202000000000', '0002220000002000',
      '0222222200000000', '0002220000000000', '0020202000000000', '0000200000000000',
      '0000000000000000', '0000000000000000', '0000000000000000', '0000000000002000',
      '0000200000022200', '0000000000002000', '0000000000000000', '0000000000000000',
    ],
  },
  {
    id: 'pinguim', nivel: 1, nome: 'Pinguim', tipo: 'pixel', preco: precoSugerido('pixel', 1), pig: [0.75, 0.3, 0, 0.06], modo: 1, nota: 'Máscara branca, bochechas e pezinhos laranja.',
    px: [
      '0000000000000000', '0000000000000000', '0000000000000000', '0000000000000000',
      '0000222002220000', '0002222222222000', '0022222222222200', '0022222222222200',
      '0002222222222000', '000d22222222d000', '0000222222220000', '0002222222222000',
      '0002222222222000', '0000222222220000', '0000555225550000', '0000055225500000',
    ],
  },
  // ---- nivel 2
  {
    id: 'folhinhas', nivel: 2, nome: 'Folhinhas', tipo: 'pixel', preco: precoSugerido('pixel', 2), pig: [0.32, 0, 0.68, 0], modo: 0, escala: 1.6, nota: 'Folhas claras com nervura.',
    px: [
      '0000000000000000', '0000000000000000', '0000777000000700', '0007787000007000',
      '0077877000000000', '0078770000000000', '0077700000000000', '0000000000000000',
      '0800000000000008', '0000000000700000', '0000000007877000', '0000000000787700',
      '0007000000778700', '0000700000077870', '0000000000000700', '0000000008000000',
    ],
  },
  {
    id: 'melancia', nivel: 2, nome: 'Melancia', tipo: 'pixel', preco: precoSugerido('pixel', 2), pig: [0, 0.5, 0.36, 0], modo: 1, nota: 'Casca verde por fora e sementes.',
    px: [
      '8888888888888888', '8888887777888888', '8888700000078888', '8887001000107888',
      '8870000000000788', '8800000000000088', '8700000000000078', '8710000000000178',
      '8700000000000078', '8700000000000078', '8800000000000088', '8870100000010788',
      '8887100000017888', '8888710010078888', '8888887717818888', '8888888888888888',
    ],
  },
  {
    id: 'cacto', nivel: 2, nome: 'Cacto', tipo: 'pixel', preco: precoSugerido('pixel', 2), pig: [0.17, 0, 0.52, 0], modo: 1, nota: 'Gomos, espinhos e uma flor no alto.',
    px: [
      '0000000dd0000000', '000000d66d000000', '0000000dd0000000', '0008080082808000',
      '0080280080800800', '0080080080802800', '0080080080800800', '0080800080080800',
      '0080800080080800', '0080080080800800', '0080080080800800', '0082080080800800',
      '0008080080808000', '0008082080808000', '0000808088080000', '0000000020000000',
    ],
  },
  { id: 'camuflado', nivel: 2, nome: 'Camuflado', tipo: 'proc', preco: precoSugerido('proc', 2), pig: [0.1, 0, 0.7, 0], proc: PROC.manchas, cor: '#2f6a3c', escala: 1, nota: 'Manchas verde-escuro no verde-limão.' },
  // ---- nivel 3
  { id: 'xadrez', nivel: 3, nome: 'Xadrez lilás', tipo: 'proc', preco: precoSugerido('proc', 3), pig: [0.2, 0.35, 0, 0], proc: PROC.xadrez, cor: '#d9c6ff', escala: 1, nota: 'Xadrez lavanda.' },
  {
    id: 'florzinhas', nivel: 3, nome: 'Florzinhas', tipo: 'pixel', preco: precoSugerido('pixel', 3), pig: [0.2, 0.35, 0, 0], modo: 0, escala: 1.4, nota: 'Flores brancas e rosas com miolo amarelo.',
    px: [
      '0000000000000000', '0002200000000000', '0002200000000000', '0226622000000000',
      '0226622000002000', '0002200000000000', '0002200800000000', '0000000080000000',
      '0000000000000000', '00000000000dd000', '00000000000dd000', '000000000dd66dd0',
      '000020000dd66dd0', '00000000000dd000', '00000000000dd008', '8000000000000000',
    ],
  },
  {
    id: 'pijama', nivel: 3, nome: 'Pijama', tipo: 'pixel', preco: precoSugerido('pixel', 3), pig: [0.25, 0.4, 0, 0], modo: 0, escala: 1.4, nota: 'Luas e estrelas, de pijama.',
    px: [
      '0000000000000000', '0000000000002000', '0006000000022200', '0066000000002000',
      '0066000000000000', '0066000000000000', '0066600000000000', '0006666000000020',
      '0000000000000000', '0000000000006000', '0000000000006000', '0000000000666660',
      '0020000000066600', '0000000000060600', '0000002000000000', '0000000000000000',
    ],
  },
  {
    id: 'losangos', nivel: 3, nome: 'Losangos', tipo: 'pixel', preco: precoSugerido('pixel', 3), pig: [0.16, 0.3, 0, 0], modo: 0, escala: 1.3, nota: 'Losangos em dois tons com linhas brancas.',
    px: [
      '200000002bbbbbbb', '000cc0000bbbbbb0', '020cc00002bbbbb0', '00cccc0000bbbb00',
      '002ccc00002bbb00', '0cccccc0000bb000', '0cc2ccc00002b000', 'cccccccc00000000',
      'cccc2ccc00002000', '0cccccc0000bb000', '0cccc2c0000bb200', '00cccc0000bbbb00',
      '00cccc2000bbbb20', '000cc0000bbbbbb0', '000cc0020bbbbbb2', '00000000bbbbbbbb',
    ],
  },
  // ---- nivel 4
  {
    id: 'joaninha', nivel: 4, nome: 'Joaninha', tipo: 'pixel', preco: precoSugerido('pixel', 4), pig: [0, 0.62, 0.42, 0], modo: 1, nota: 'Cabeça e pintas pretas.',
    px: [
      '1111111111111111', '1111111111111111', '1111111111111111', '0000000000000000',
      '0110000000000110', '0110000000000110', '0000000000000000', '0000000000000000',
      '0011100000011100', '0011100000011100', '0011000110001100', '0000000110000000',
      '0001110110111000', '0001110110111000', '0000110110110000', '0000000110000000',
    ],
  },
  {
    id: 'morango', nivel: 4, nome: 'Morango', tipo: 'pixel', preco: precoSugerido('pixel', 4), pig: [0, 0.92, 0.08, 0.005], modo: 1, nota: 'Coroa de folhas e sementes amarelas.',
    px: [
      '8888888778888888', '8888888888888888', '0880888008880880', '0080080000800800',
      '0006000000006000', '0000000000000000', '0000000000000000', '0000000000000000',
      '0000000000000000', '0060000000000600', '0000000000000000', '0000000000000000',
      '0000060000600000', '0006000000006000', '0000000060000000', '0000000000000000',
    ],
  },
  {
    id: 'cerejas', nivel: 4, nome: 'Cerejas', tipo: 'pixel', preco: precoSugerido('pixel', 4), pig: [0.02, 0.27, 0, 0], modo: 0, escala: 1.3, nota: 'Pares de cereja no rosa.',
    px: [
      '0000007000000040', '0000877000000000', '0008080000000000', '0008080000000000',
      '0040008000000000', '0244004000000000', '0444024400000000', '0040044400000000',
      '0000004000000070', '0000000000008770', '0000000000080800', '0000000000080800',
      '0000000000400080', '0000000002440040', '0000000004440244', '0000000000400444',
    ],
  },
  { id: 'bengala', nivel: 4, nome: 'Bengala doce', tipo: 'proc', preco: precoSugerido('proc', 4), pig: [0, 0.62, 0.38, 0], proc: PROC.listras, cor: '#ffffff', escala: 1.15, nota: 'Listras de bala natalina.' },
  // ---- nivel 5
  {
    id: 'onca', nivel: 5, nome: 'Onça', tipo: 'pixel', preco: precoSugerido('pixel', 5), pig: [0, 0.04, 0.94, 0], modo: 0, escala: 1.2, nota: 'Rosetas pretas e marrons.',
    px: [
      '0000000000000100', '0011010001100000', '01eee00000100000', '01eee10000000000',
      '00eee10000000000', '0101100000000000', '0000000000101100', '00000000000eee10',
      '10000000001eee10', '00000000001eee00', '0000000000011010', '0001011000000000',
      '0000eee100000000', '0001eee110000010', '0001eee000000011', '0000110100000000',
    ],
  },
  { id: 'gomos', nivel: 5, nome: 'Gomos', tipo: 'proc', preco: precoSugerido('proc', 5), pig: [0, 0.2, 0.8, 0], proc: PROC.gomos, cor: '#fff1cf', escala: 1, nota: 'Gomos de tangerina, com casca.' },
  {
    id: 'abobora', nivel: 5, nome: 'Abóbora', tipo: 'pixel', preco: precoSugerido('pixel', 5), pig: [0, 0.12, 0.88, 0], modo: 1, nota: 'Gomos e cabinho.',
    px: [
      '0000000ee7700000', '0000000ee0700000', '0000505005050000', '0005005005005000',
      '0005050000505000', '0050050000500500', '0050050000500500', '0050050000500500',
      '0050050000500500', '0050050000500500', '0050050000500500', '0005050000505000',
      '0005005005005000', '0000505005050000', '0000005005000000', '0000000000000000',
    ],
  },
  {
    id: 'raposa', nivel: 5, nome: 'Raposa', tipo: 'pixel', preco: precoSugerido('pixel', 5), pig: [0, 0.2, 0.8, 0], modo: 1, nota: 'Bochechas e peito brancos.',
    px: [
      '0000000000000000', '0000000000000000', '0000000000000000', '0000000000000000',
      '0000000000000000', '0000000000000000', '0000000000000000', '0000000000000000',
      '0022200000022200', '0222220000222220', '0222222222222220', '0222222222222220',
      '0022222222222200', '0002222222222000', '0002222222222000', '0000222222220000',
    ],
  },
  // ---- nivel 6
  {
    id: 'abelha', nivel: 6, nome: 'Abelha', tipo: 'pixel', preco: precoSugerido('pixel', 6), pig: [0, 0, 0.88, 0], modo: 1, nota: 'Listras pretas e asinhas.',
    px: [
      '0000000000000000', '0022220000222200', '0022222002222200', '0032220000222300',
      '0000000000000000', '0000000000000000', '0000000000000000', '0000000000000000',
      '0000000000000000', '0000000000000000', '1111111111111111', '1111111111111111',
      '0000000000000000', '1111111111111111', '1111111111111111', '0000000000000000',
    ],
  },
  { id: 'estrelinhas', nivel: 6, nome: 'Estrelinhas', tipo: 'proc', preco: precoSugerido('proc', 6), pig: [0, 0, 0.86, 0], proc: PROC.estrelinhas, cor: '#ff7a1a', escala: 1, nota: 'Estrelinhas laranja que piscam.' },
  {
    id: 'queijo', nivel: 6, nome: 'Queijo', tipo: 'pixel', preco: precoSugerido('pixel', 6), pig: [0, 0, 0.88, 0], modo: 0, escala: 1.15, nota: 'Furinhos com sombra.',
    px: [
      '0000000000000000', '000000000000ee00', '000eee000000ee00', '00eeeee000005500',
      '005eee5000000000', '0055555000000000', '0005550000000000', '0000000055000000',
      '0000000000eeee00', '0000000005eeee50', '0000000005eeee50', '0000000005555550',
      '000ee00000555500', '0005500000000000', '0000000000000000', '0000000000000000',
    ],
  },
  {
    id: 'girassol', nivel: 6, nome: 'Girassol', tipo: 'pixel', preco: precoSugerido('pixel', 6), pig: [0, 0, 0.88, 0], modo: 1, nota: 'Miolo de sementes e pétalas.',
    px: [
      '0055500550055500', '0005500550055000', '5000550550550005', '5500050000500055',
      '55500eeeeee00555', '0055e1e1e1e15500', '0000eeeeeeee0000', '5550e1e1e1e10555',
      '5550eeeeeeee0555', '0000e1e1e1e10000', '0055eeeeeeee5500', '555001e1e1e00555',
      '5500050000500055', '5000550550550005', '0005500550055000', '0055500550055500',
    ],
  },
  // ---- nivel 7
  { id: 'ceu', nivel: 7, nome: 'Céu', tipo: 'proc', preco: precoSugerido('proc', 7), pig: [0.51, 0, 0, 0], proc: PROC.degrade, cor: '#ffffff', escala: 1, nota: 'Degradê do azul ao branco.' },
  {
    id: 'carneirinho', nivel: 7, nome: 'Carneirinho', tipo: 'pixel', preco: precoSugerido('pixel', 7), pig: [0.03, 0.05, 0.2, 0], modo: 1, nota: 'Lã branca e carinha.',
    px: [
      '2222222222222222', '2222222232222222', '2232222223222222', '2223222222222222',
      '2222220000223222', '2222000000002322', '2220000000000222', '2220000000000222',
      '3220000000000222', '2320000000000322', '2220000000000232', '2222000000002222',
      '2222220000222222', '2223222222222222', '2222322222322222', '2222222222232222',
    ],
  },
  {
    id: 'chuva', nivel: 7, nome: 'Chuva', tipo: 'pixel', preco: precoSugerido('pixel', 7), pig: [0.9, 0.1, 0, 0], modo: 0, escala: 1, nota: 'Nuvens e pingos.',
    px: [
      '000000000000b000', '00022200000b0000', '0023332000b00000', '02333333000000b0',
      '0033333000000b00', '0000000000000000', '00b0000000000000', '0b000b0000000000',
      '0000b00000000000', '000b000000022200', '00b0000000233320', '0000000002333333',
      '000000b000333330', '00000b0000000000', '0000000000b00000', '000000000b000b00',
    ],
  },
  {
    id: 'trovao', nivel: 7, nome: 'Trovão', tipo: 'pixel', preco: precoSugerido('pixel', 7), pig: [0.3, 0.12, 0.05, 0.1], modo: 0, escala: 1, nota: 'Raios amarelos na nuvem escura.',
    px: [
      '0000000000000000', '0000660000000000', '0006600000000000', '0066600000002000',
      '0666660000000000', '0006600000000000', '0066000000000000', '0060000000000000',
      '0000000000006600', '0000000000066000', '0000000000666000', '0000000006666600',
      '0000200000066000', '0000000000660020', '0000000000600000', '0000000000000000',
    ],
  },
  // ---- nivel 8
  { id: 'confete', nivel: 8, nome: 'Confete', tipo: 'proc', preco: precoSugerido('proc', 8), pig: [0, 0.25, 0, 0], proc: PROC.confete, cor: '#ffd23a', escala: 1, nota: 'Confete colorido no rosa.' },
  { id: 'faixas', nivel: 8, nome: 'Arco em listras', tipo: 'proc', preco: precoSugerido('proc', 8), pig: [0.1, 0.25, 0.2, 0], proc: PROC.faixas, cor: '#ffffff', escala: 1, nota: 'Faixas do arco-íris de cima a baixo.' },
  {
    id: 'mosaico', nivel: 8, nome: 'Mosaico', tipo: 'pixel', preco: precoSugerido('pixel', 8), pig: [0.06, 0.12, 0.08, 0], modo: 0, escala: 1, nota: 'Azulejos de quatro cores.',
    px: [
      '44406660aaa08880', '44406660aaa08880', '44406660aaa08880', '0000000000000000',
      'aaa0888044406660', 'aaa0888044406660', 'aaa0888044406660', '0000000000000000',
      '666044408880aaa0', '666044408880aaa0', '666044408880aaa0', '0000000000000000',
      '8880aaa066604440', '8880aaa066604440', '8880aaa066604440', '0000000000000000',
    ],
  },
  {
    id: 'baloes', nivel: 8, nome: 'Balões', tipo: 'pixel', preco: precoSugerido('pixel', 8), pig: [0.25, 0, 0, 0], modo: 0, escala: 1, nota: 'Balões coloridos.',
    px: [
      '0044000000000010', '0424400000006600', '0444400000062660', '0444400000066660',
      '0044000000066660', '0001000000006600', '0010000aa0000100', '000100a2aa001000',
      '000000aaaa000100', '000000aaaa000880', '0000000aa0008288', '0000000010008888',
      '0000000100008888', '0000000010000880', '0000000000000010', '0000000000000100',
    ],
  },
  // ---- nivel 9
  { id: 'escamas', nivel: 9, nome: 'Escamas', tipo: 'proc', preco: precoSugerido('proc', 9), pig: [0.45, 0, 0.2, 0], proc: PROC.escamas, cor: '#3fd6c8', escala: 1, nota: 'Escamas de sereia.' },
  { id: 'bolhasMar', nivel: 9, nome: 'Bolhas do mar', tipo: 'proc', preco: precoSugerido('proc', 9), pig: [0.95, 0, 0.05, 0], proc: PROC.bolhas, cor: '#7ff0ff', escala: 0.85, nota: 'Bolhas no fundo do mar.' },
  {
    id: 'peixinhos', nivel: 9, nome: 'Peixinhos', tipo: 'pixel', preco: precoSugerido('pixel', 9), pig: [0.9, 0, 0.1, 0.02], modo: 0, escala: 1, nota: 'Peixinhos laranja no mar fundo.',
    px: [
      '0000000002000000', '0000000000000000', '0505500020000000', '0555150000000000',
      '0505500000000000', '0000000000000000', '0000000000000000', '0000000000550500',
      '0000000005155500', '0000000000550500', '0000000000000000', '0000000000000000',
      '0005055000000000', '0005551500000020', '0005055000000000', '0000000000000000',
    ],
  },
  {
    id: 'ancoras', nivel: 9, nome: 'Âncoras', tipo: 'pixel', preco: precoSugerido('pixel', 9), pig: [0.5, 0, 0.2, 0], modo: 0, escala: 1, nota: 'Âncoras azul-marinho.',
    px: [
      '0000000000000000', '0000b00000000000', '000b0b0000000000', '0000b00000000000',
      '00bbbbb000000000', '0000b00000000000', '0b00b00b00000000', '00bbbbb000000000',
      '0000000000000000', '000000000000b000', '00000000000b0b00', '000000000000b000',
      '0000000000bbbbb0', '000000000000b000', '000000000b00b00b', '0000000000bbbbb0',
    ],
  },
  // ---- nivel 10
  {
    id: 'coracoes', nivel: 10, nome: 'Corações', tipo: 'pixel', preco: precoSugerido('pixel', 10), pig: [0.25, 0.4, 0, 0], modo: 0, escala: 0.95, nota: 'Corações rosa e vermelhos.',
    px: [
      '0000000000000000', '00dd0dd000000000', '0d2ddddd00000000', '0ddddddd00002000',
      '00ddddd000000000', '000ddd0000000000', '0000d00000000000', '0000000000000000',
      '0000000000000000', '0000000000440440', '0000000004244444', '0000000004444444',
      '0000200000444440', '0000000000044400', '0000000000004000', '0000000000000000',
    ],
  },
  { id: 'xadrezUva', nivel: 10, nome: 'Xadrez de uva', tipo: 'proc', preco: precoSugerido('proc', 10), pig: [0.25, 0.4, 0, 0], proc: PROC.xadrez, cor: '#3c2266', escala: 0.75, nota: 'Xadrez roxo-escuro.' },
  {
    id: 'cacho', nivel: 10, nome: 'Cacho', tipo: 'pixel', preco: precoSugerido('pixel', 10), pig: [0.25, 0.4, 0, 0], modo: 1, nota: 'Bagos com brilho e folha.',
    px: [
      '00000008e8800000', '000000888e800000', '0000000000000000', '000000c2cc000000',
      '0002cccccc2cc000', '000ccc0cc0ccc000', '000ccc0000ccc000', '00000cc00cc00000',
      '02ccc2ccc2cc2cc0', '0ccc0cccccc0ccc0', '0ccc00c00c00ccc0', '0002ccc2cc2cc000',
      '000cccccccccc000', '000ccc0cc0ccc000', '00000002c0000000', '000000cccc000000',
    ],
  },
  {
    id: 'morcegos', nivel: 10, nome: 'Morcegos', tipo: 'pixel', preco: precoSugerido('pixel', 10), pig: [0.3, 0.45, 0, 0], modo: 0, escala: 0.95, nota: 'Morcegos e lua.',
    px: [
      '0000000000000000', '0000000000000000', '1000000010000600', '1101010110006660',
      '1111111110000600', '0101110100000000', '0000000000000000', '0000000000000000',
      '0000002000000000', '0000000000000000', '1000000010000000', '1000000011010101',
      '1000000011111111', '0002000001011101', '0000000000000000', '0000000000000000',
    ],
  },
  // ---- nivel 11
  { id: 'granulado', nivel: 11, nome: 'Granulado', tipo: 'proc', preco: precoSugerido('proc', 11), pig: [0, 0.25, 0, 0], proc: PROC.granulado, cor: '#ffffff', escala: 1, nota: 'Cobertura com granulado.' },
  { id: 'algodao', nivel: 11, nome: 'Algodão-doce', tipo: 'proc', preco: precoSugerido('proc', 11), pig: [0, 0.25, 0, 0], proc: PROC.manchas, cor: '#a8dcff', escala: 0.45, nota: 'Nuvens azul-bebê no rosa.' },
  {
    id: 'cupcake', nivel: 11, nome: 'Cupcake', tipo: 'pixel', preco: precoSugerido('pixel', 11), pig: [0, 0.25, 0, 0], modo: 1, nota: 'Cereja, granulado e forminha.',
    px: [
      '0000000440000000', '0000000420000000', '0000020000700000', '00060000a0009000',
      '0000000000000000', '0000000000000000', '00a0000000000600', '0000000000000000',
      '0000000000000000', '0000900000020000', '2022022022022022', 'efefefefefefefef',
      'efefefefefefefef', 'efefefefefefefef', 'efefefefefefefef', 'efefefefefefefef',
    ],
  },
  {
    id: 'lacos', nivel: 11, nome: 'Laços', tipo: 'pixel', preco: precoSugerido('pixel', 11), pig: [0, 0.3, 0.02, 0], modo: 0, escala: 0.95, nota: 'Lacinhos vermelhos.',
    px: [
      '0000000000000000', '0000000000000000', '0400000400000000', '0442024400000000',
      '0444444400002000', '0440004400000000', '0400000400000000', '0000000000000000',
      '0000000000000000', '0000000000000000', '0000000004000004', '0000000004420244',
      '0000200004444444', '0000000004400044', '0000000004000004', '0000000000000000',
    ],
  },
  // ---- nivel 12
  { id: 'nebulosa', nivel: 12, nome: 'Galáxia ciano', tipo: 'proc', preco: precoSugerido('proc', 12), pig: [0.72, 0.26, 0, 0.02], proc: PROC.nebulosa, cor: '#3fd6c8', escala: 1, nota: 'Nebulosa ciano e estrelas.' },
  {
    id: 'constelacao', nivel: 12, nome: 'Constelação', tipo: 'pixel', preco: precoSugerido('pixel', 12), pig: [0.8, 0.2, 0, 0], modo: 0, escala: 0.85, nota: 'Estrelas ligadas.',
    px: [
      '0000000000000000', '0000000600000002', '0000006260000000', '0020a00600000000',
      '000000000a000000', '0000000000000000', '0000000000020000', '000000000a000000',
      '0200000a0000a000', '0000002000000000', '000000000000a000', '00000a0000000600',
      '0000000000006260', '0002000000000600', '0000000002000000', '0000000000000000',
    ],
  },
  {
    id: 'lua', nivel: 12, nome: 'Lua', tipo: 'pixel', preco: precoSugerido('pixel', 12), pig: [0.72, 0.26, 0, 0.02], modo: 1, nota: 'Lua crescente e estrelas.',
    px: [
      '0000000000000000', '0000602000600000', '0006660006600000', '0002600006600000',
      '0000000006660000', '0000000000666000', '0000000000000000', '0200000000000020',
      '0000000000000000', '0000000000000000', '0000000000000000', '0000000000000200',
      '0020000000000000', '0000000000000000', '0000000020000000', '0000000000000000',
    ],
  },
  { id: 'aurora', nivel: 12, nome: 'Aurora boreal', tipo: 'proc', preco: precoSugerido('proc', 12), pig: [0.72, 0.26, 0, 0.02], proc: PROC.ondas, cor: '#7dffb0', escala: 0.8, nota: 'Ondas verde-menta no escuro.' },
  // ---- nivel 13
  {
    id: 'diamantes', nivel: 13, nome: 'Diamantes', tipo: 'pixel', preco: precoSugerido('pixel', 13), pig: [0.75, 0.25, 0, 0], modo: 0, escala: 0.85, nota: 'Gemas facetadas e brilhos.',
    px: [
      '0000000000000000', '002299a000000000', '0229999a00002000', '02999aab00022200',
      '0099aab000002000', '0009ab0000000000', '0000b00000000000', '0000000000000000',
      '0000000000000000', '00000000002299a0', '000020000229999a', '0002220002999aab',
      '000020000099aab0', '000000000009ab00', '000000000000b000', '0000000000000000',
    ],
  },
  {
    id: 'tesouro', nivel: 13, nome: 'Tesouro', tipo: 'pixel', preco: precoSugerido('pixel', 13), pig: [0, 0.55, 0.42, 0.12], modo: 0, escala: 0.85, nota: 'Moedas de ouro no veludo.',
    px: [
      '0000000000000000', '0000500000055000', '0055655000526500', '0052665000566500',
      '0566666500055000', '0056665000000000', '0055655000000000', '0000500000000000',
      '0000000000005000', '0000000000556550', '0000000000526650', '0005500005666665',
      '0052650000566650', '0056650000556550', '0005500000005000', '0000000000000000',
    ],
  },
  {
    id: 'rei', nivel: 13, nome: 'Rei', tipo: 'pixel', preco: precoSugerido('pixel', 13), pig: [0.2, 0.35, 0, 0], modo: 1, nota: 'Coroa e gola de arminho.',
    px: [
      '0006000660006000', '0006606666066000', '0006666446666000', '0006a666666a6000',
      '0000000000000000', '0000000000000000', '0000000000000000', '0000000000000000',
      '0000000000000000', '0000000000000000', '0000000000000000', '0000000000000000',
      '2122221222212222', '2222122221222212', '2212222122221222', '2222222222222222',
    ],
  },
  {
    id: 'superestrela', nivel: 13, nome: 'Superestrela', tipo: 'pixel', preco: precoSugerido('pixel', 13), pig: [0.75, 0.25, 0, 0], modo: 1, nota: 'Estrela dourada.',
    px: [
      '0000000000000000', '0000000000000000', '0200000550000020', '0000000550000000',
      '0000000550000000', '0000005665000000', '0555556666555550', '0056666666666500',
      '0005566666655000', '0020056666500200', '0000056666500000', '0000566556650000',
      '0000565005650000', '0000550000550000', '0205000000005020', '0000000000000000',
    ],
  },
];
