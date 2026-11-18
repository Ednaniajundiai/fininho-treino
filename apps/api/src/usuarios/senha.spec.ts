import { motivoSenhaInvalida } from './senha.js';

describe('política de senha', () => {
  it('aceita de 8 a 128 caracteres', () => {
    expect(motivoSenhaInvalida('12345678')).toBeNull();
    expect(motivoSenhaInvalida('a'.repeat(128))).toBeNull();
  });

  it('recusa menos de 8 caracteres, dizendo o motivo', () => {
    expect(motivoSenhaInvalida('1234567')).toMatch(/pelo menos 8/);
  });

  it('recusa mais de 128 caracteres, dizendo o motivo', () => {
    expect(motivoSenhaInvalida('a'.repeat(129))).toMatch(/no máximo 128/);
  });
});
