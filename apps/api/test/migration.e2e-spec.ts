import type { NestExpressApplication } from '@nestjs/platform-express';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { limparBanco, subirApp } from './apoio.js';

// lento: usa o banco de teste, com as migrations aplicadas do zero no global-setup.
describe('migration de contas (regra no banco)', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await subirApp();
    prisma = app.get(PrismaService);
  });
  beforeEach(() => limparBanco(app));
  afterAll(() => app.close());

  const paula = { name: 'Paula Prado', email: 'paula@exemplo.test', passwordHash: 'x' };
  const ari = { name: 'Ari Alves', email: 'ari@exemplo.test', passwordHash: 'x' };

  it('recusa aluno sem professor', async () => {
    await expect(prisma.user.create({ data: { ...ari, role: 'ALUNO' } })).rejects.toThrow(
      /users_aluno_tem_professor/,
    );
  });

  it('recusa professor vinculado a outro professor', async () => {
    const professora = await prisma.user.create({ data: { ...paula, role: 'PROFESSOR' } });
    await expect(
      prisma.user.create({ data: { ...ari, role: 'PROFESSOR', teacherId: professora.id } }),
    ).rejects.toThrow(/users_aluno_tem_professor/);
  });

  it('aceita professor sem vínculo e aluno vinculado a ele', async () => {
    const professora = await prisma.user.create({ data: { ...paula, role: 'PROFESSOR' } });
    const aluno = await prisma.user.create({
      data: { ...ari, role: 'ALUNO', teacherId: professora.id },
    });
    expect(aluno.teacherId).toBe(professora.id);
  });
});
