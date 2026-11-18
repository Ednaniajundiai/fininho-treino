import { motivoSenhaInvalida } from './senha.js';
import { gerarSenhaProvisoria } from './senha-provisoria.js';

describe('gerarSenhaProvisoria', () => {
  it('gera senha que cumpre a política de senha', () => {
    expect(motivoSenhaInvalida(gerarSenhaProvisoria())).toBeNull();
  });

  it('não repete: 200 senhas geradas são todas diferentes', () => {
    const geradas = new Set(Array.from({ length: 200 }, () => gerarSenhaProvisoria()));
    expect(geradas.size).toBe(200);
  });

  it('usa só caracteres fáceis de ditar e copiar, sem os que se confundem (0/O, 1/l/I)', () => {
    for (let i = 0; i < 50; i += 1) {
      expect(gerarSenhaProvisoria()).toMatch(
        /^[a-hjkmnp-z2-9]{4}-[a-hjkmnp-z2-9]{4}-[a-hjkmnp-z2-9]{4}$/,
      );
    }
  });
});
