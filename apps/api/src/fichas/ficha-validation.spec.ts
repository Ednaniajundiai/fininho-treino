import {
  type DiaEntrada,
  type ItemEntrada,
  MAX_DIAS,
  MAX_ITENS_POR_DIA,
  motivosDeRecusa,
  numerarDias,
  rotuloDoDia,
} from './ficha-validation.js';

const forca = (extra: Partial<ItemEntrada> = {}): ItemEntrada => ({
  tipo: 'forca',
  exercicioId: '00000000-0000-4000-8000-000000000001',
  series: 3,
  faixaMin: 8,
  faixaMax: 12,
  unidade: 'repeticoes',
  ...extra,
});
const cardio = (extra: Partial<ItemEntrada> = {}): ItemEntrada => ({
  tipo: 'cardio',
  modalidade: 'bike',
  duracaoMinMin: 10,
  duracaoMaxMin: 15,
  ...extra,
});
const dia = (itens: ItemEntrada[], titulo = 'Peito e tríceps'): DiaEntrada => ({ titulo, itens });

describe('validação da ficha: itens (FR-004, cenário 4)', () => {
  it('aceita item de força e de cardio bem formados', () => {
    expect(motivosDeRecusa([dia([forca(), cardio()])], { ativa: true })).toEqual([]);
  });

  it('aceita faixa e duração com mínimo igual ao máximo', () => {
    const itens = [
      forca({ faixaMin: 10, faixaMax: 10 }),
      cardio({ duracaoMinMin: 15, duracaoMaxMin: 15 }),
    ];
    expect(motivosDeRecusa([dia(itens)], { ativa: true })).toEqual([]);
  });

  it('recusa faixa mínima maior que a máxima e diz onde', () => {
    const motivos = motivosDeRecusa([dia([cardio(), forca({ faixaMin: 12, faixaMax: 8 })])], {
      ativa: false,
    });
    expect(motivos).toEqual(['Dia A, item 2: a faixa mínima não pode ser maior que a máxima.']);
  });

  it('recusa séries menor que 1', () => {
    expect(motivosDeRecusa([dia([forca({ series: 0 })])], { ativa: false })).toEqual([
      'Dia A, item 1: o número de séries precisa ser 1 ou mais.',
    ]);
  });

  it('recusa cardio com duração mínima maior que a máxima', () => {
    expect(
      motivosDeRecusa([dia([forca()]), dia([cardio({ duracaoMinMin: 20, duracaoMaxMin: 10 })])], {
        ativa: false,
      }),
    ).toEqual(['Dia B, item 1: a duração mínima não pode ser maior que a máxima.']);
  });

  it('recusa item de força sem os campos de força', () => {
    expect(motivosDeRecusa([dia([{ tipo: 'forca', series: 3 }])], { ativa: false })).toEqual([
      'Dia A, item 1: item de força precisa de exercício, séries, faixa mínima e máxima e unidade.',
    ]);
  });

  it('recusa item de cardio sem modalidade ou duração', () => {
    expect(
      motivosDeRecusa([dia([{ tipo: 'cardio', modalidade: 'bike' }])], { ativa: false }),
    ).toEqual(['Dia A, item 1: item de cardio precisa de modalidade e duração mínima e máxima.']);
  });

  it('recusa campos do outro tipo no mesmo item', () => {
    expect(motivosDeRecusa([dia([forca({ modalidade: 'bike' })])], { ativa: false })).toEqual([
      'Dia A, item 1: item de força não leva modalidade nem duração.',
    ]);
    expect(motivosDeRecusa([dia([cardio({ series: 3 })])], { ativa: false })).toEqual([
      'Dia A, item 1: item de cardio não leva exercício, séries, faixa nem unidade.',
    ]);
  });

  it('junta todos os motivos de uma vez', () => {
    const motivos = motivosDeRecusa([dia([forca({ series: 0, faixaMin: 9, faixaMax: 1 })])], {
      ativa: false,
    });
    expect(motivos).toHaveLength(2);
  });
});

describe('validação da ficha: dias, itens e tetos (FR-005, cenário 5)', () => {
  it('ficha sem dia não ativa', () => {
    expect(motivosDeRecusa([], { ativa: true })).toEqual([
      'Para ativar, a ficha precisa de ao menos um dia.',
    ]);
  });

  it('dia sem item não ativa', () => {
    expect(motivosDeRecusa([dia([forca()]), dia([])], { ativa: true })).toEqual([
      'Para ativar, o dia B precisa de ao menos um item.',
    ]);
  });

  it('rascunho pode ficar sem dia e com dia vazio', () => {
    expect(motivosDeRecusa([], { ativa: false })).toEqual([]);
    expect(motivosDeRecusa([dia([])], { ativa: false })).toEqual([]);
  });

  it(`aceita até ${MAX_DIAS} dias e recusa o ${MAX_DIAS + 1}º, mesmo em rascunho`, () => {
    const dias = (n: number) => Array.from({ length: n }, () => dia([forca()]));
    expect(motivosDeRecusa(dias(MAX_DIAS), { ativa: true })).toEqual([]);
    expect(motivosDeRecusa(dias(MAX_DIAS + 1), { ativa: false })).toEqual([
      'A ficha pode ter no máximo 10 dias.',
    ]);
  });

  it(`aceita até ${MAX_ITENS_POR_DIA} itens num dia e recusa o ${MAX_ITENS_POR_DIA + 1}º`, () => {
    const itens = (n: number) => Array.from({ length: n }, () => forca());
    expect(motivosDeRecusa([dia(itens(MAX_ITENS_POR_DIA))], { ativa: true })).toEqual([]);
    expect(
      motivosDeRecusa([dia([forca()]), dia(itens(MAX_ITENS_POR_DIA + 1))], { ativa: false }),
    ).toEqual(['O dia B pode ter no máximo 30 itens.']);
  });
});

describe('rótulo e ordem (FR-003, FR-004, FR-012, cenário 6)', () => {
  it('o rótulo deriva da ordem: A, B, C... até J', () => {
    expect([1, 2, 3, 10].map(rotuloDoDia)).toEqual(['A', 'B', 'C', 'J']);
  });

  it('numera dias e itens na ordem recebida, misturando força e cardio', () => {
    const numerados = numerarDias([
      dia([forca({ observacao: 'aquecer antes' }), cardio(), forca({ series: 4 })], 'Peito'),
      dia([cardio({ modalidade: 'esteira' })], 'Cardio'),
    ]);

    expect(numerados.map((d) => [d.ordem, d.rotulo, d.titulo])).toEqual([
      [1, 'A', 'Peito'],
      [2, 'B', 'Cardio'],
    ]);
    expect(numerados[0]?.itens.map((i) => [i.ordem, i.tipo])).toEqual([
      [1, 'forca'],
      [2, 'cardio'],
      [3, 'forca'],
    ]);
    expect(numerados[0]?.itens[0]?.observacao).toBe('aquecer antes');
    expect(numerados[0]?.itens[2]?.series).toBe(4);
    expect(numerados[1]?.itens[0]?.modalidade).toBe('esteira');
  });
  it('ao reordenar ou remover dias, os rótulos seguem A, B, C... sem buraco (FR-012)', () => {
    const [a, b, c, d] = ['Peito', 'Costas', 'Pernas', 'Ombros'].map((titulo) =>
      dia([forca()], titulo),
    );
    const rotulos = (dias: DiaEntrada[]) => numerarDias(dias).map((x) => [x.rotulo, x.titulo]);

    // Remove o B e põe o último na frente.
    expect(rotulos([d!, a!, c!])).toEqual([
      ['A', 'Ombros'],
      ['B', 'Peito'],
      ['C', 'Pernas'],
    ]);
    expect(rotulos([b!])).toEqual([['A', 'Costas']]);
  });
});
