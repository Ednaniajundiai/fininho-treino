import { decidirRotacao, gerarTokenRenovacao, hashDoToken } from './tokens.js';

const agora = new Date('2026-11-17T12:00:00Z');
const valido = {
  expiresAt: new Date('2026-11-24T12:00:00Z'),
  usedAt: null,
  revokedAt: null,
};

describe('decidirRotacao', () => {
  it('aceita token dentro do prazo, não usado e não revogado', () => {
    expect(decidirRotacao(valido, agora)).toBe('VALIDO');
  });

  it('recusa token que não existe', () => {
    expect(decidirRotacao(null, agora)).toBe('INVALIDO');
  });

  it('recusa token vencido', () => {
    expect(decidirRotacao({ ...valido, expiresAt: agora }, agora)).toBe('INVALIDO');
  });

  it('recusa token revogado', () => {
    expect(decidirRotacao({ ...valido, revokedAt: agora }, agora)).toBe('INVALIDO');
  });

  it('trata token já usado como reuso, mesmo que também esteja vencido ou revogado', () => {
    const usado = { ...valido, usedAt: new Date('2026-11-17T11:00:00Z') };
    expect(decidirRotacao(usado, agora)).toBe('REUSO');
    expect(decidirRotacao({ ...usado, revokedAt: agora, expiresAt: agora }, agora)).toBe('REUSO');
  });
});

describe('token de renovação', () => {
  it('gera valores distintos e guarda só o hash, que confere com o valor', () => {
    const a = gerarTokenRenovacao();
    const b = gerarTokenRenovacao();
    expect(a.valor).not.toBe(b.valor);
    expect(a.hash).not.toContain(a.valor);
    expect(hashDoToken(a.valor)).toBe(a.hash);
    expect(hashDoToken(b.valor)).not.toBe(a.hash);
  });
});
