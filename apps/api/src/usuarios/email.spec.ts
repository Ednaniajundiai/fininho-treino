import { normalizarEmail } from './email.js';

describe('normalizarEmail', () => {
  it('trata maiúsculas e espaços nas pontas como o mesmo e-mail', () => {
    expect(normalizarEmail('  Ana.Lima@Exemplo.TEST ')).toBe('ana.lima@exemplo.test');
  });
});
