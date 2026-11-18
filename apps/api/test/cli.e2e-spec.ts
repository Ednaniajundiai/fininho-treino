import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { UsuariosService } from '../src/usuarios/usuarios.service.js';
import { entrar, limparBanco, PAULA, subirApp } from './apoio.js';

// lento: usa o banco de teste. O comando de CLI (src/cli/main.ts) só lê os dados do terminal
// e chama UsuariosService.criarProfessor: as regras testadas aqui são as do comando.
describe('comando administrativo: criar professor', () => {
  let app: NestExpressApplication;
  let usuarios: UsuariosService;

  beforeAll(async () => {
    app = await subirApp();
    usuarios = app.get(UsuariosService);
  });
  beforeEach(() => limparBanco(app));
  afterAll(() => app.close());

  it('cria a conta de professor com senha definitiva, e ele consegue entrar (FR-003)', async () => {
    const resultado = await usuarios.criarProfessor({ ...PAULA, email: ' Paula@Exemplo.TEST ' });

    expect(resultado.acao).toBe('criado');
    const { resposta } = await entrar(app, PAULA);
    expect(resposta.status).toBe(200);
    expect(resposta.body.usuario).toMatchObject({ papel: 'PROFESSOR', senhaProvisoria: false });
  });

  it('pode criar mais de um professor (FR-003)', async () => {
    await usuarios.criarProfessor(PAULA);
    await usuarios.criarProfessor({
      nome: 'Caio Costa',
      email: 'caio@exemplo.test',
      senha: 'senha-do-caio-1',
    });

    expect(await app.get(PrismaService).user.count({ where: { role: 'PROFESSOR' } })).toBe(2);
  });

  it('recusa senha fora da política, sem criar a conta (FR-003)', async () => {
    await expect(usuarios.criarProfessor({ ...PAULA, senha: 'curta' })).rejects.toThrow(
      /pelo menos 8/,
    );
    expect(await app.get(PrismaService).user.count()).toBe(0);
  });

  it('recusa e-mail fora do formato e nome vazio, sem criar a conta (FR-003)', async () => {
    await expect(usuarios.criarProfessor({ ...PAULA, email: 'isto-nao-e-email' })).rejects.toThrow(
      /e-mail/i,
    );
    await expect(usuarios.criarProfessor({ ...PAULA, nome: '  ' })).rejects.toThrow(/nome/i);
    expect(await app.get(PrismaService).user.count()).toBe(0);
  });

  it('sem a confirmação de redefinir, recusa professor que já existe e não muda a senha (FR-004)', async () => {
    await usuarios.criarProfessor(PAULA);

    await expect(
      usuarios.criarProfessor({ ...PAULA, senha: 'outra-senha-qualquer' }),
    ).rejects.toThrow(/já existe/i);
    expect((await entrar(app, PAULA)).resposta.status).toBe(200);
  });

  it('com a confirmação, redefine a senha e derruba as sessões abertas do professor (FR-004)', async () => {
    await usuarios.criarProfessor(PAULA);
    const sessaoAntiga = await entrar(app, PAULA);

    const resultado = await usuarios.criarProfessor({
      ...PAULA,
      senha: 'senha-nova-da-paula',
      redefinir: true,
    });

    expect(resultado.acao).toBe('senha-redefinida');
    expect((await entrar(app, PAULA)).resposta.status).toBe(401);
    expect((await entrar(app, { ...PAULA, senha: 'senha-nova-da-paula' })).resposta.status).toBe(
      200,
    );
    const renovacao = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .set('Cookie', sessaoAntiga.cookie);
    expect(renovacao.status).toBe(401);
  });

  it('recusa e-mail que pertence a um aluno, sem alterar a conta dele (FR-004)', async () => {
    const { usuario: paula } = await usuarios.criarProfessor(PAULA);
    const prisma = app.get(PrismaService);
    const ari = await prisma.user.create({
      data: {
        name: 'Ari Alves',
        email: 'ari@exemplo.test',
        passwordHash: 'hash-original',
        role: 'ALUNO',
        teacherId: paula.id,
      },
    });

    await expect(
      usuarios.criarProfessor({
        nome: 'Ari Alves',
        email: 'ari@exemplo.test',
        senha: 'senha-qualquer-1',
        redefinir: true,
      }),
    ).rejects.toThrow(/aluno/i);
    const depois = await prisma.user.findUniqueOrThrow({ where: { id: ari.id } });
    expect(depois).toMatchObject({ role: 'ALUNO', passwordHash: 'hash-original' });
  });
});
