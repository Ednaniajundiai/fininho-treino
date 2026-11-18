import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service.js';
import {
  cookieDeRenovacao,
  criarProfessor,
  entrar,
  limparBanco,
  novaOrigem,
  PAULA,
  subirApp,
} from './apoio.js';

const ARI = { nome: 'Ari Alves', email: 'ari@exemplo.test' };
const NOVA = 'senha-nova-do-ari';

// lento: usa o banco de teste.
describe('senha provisória e troca de senha', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let provisoria: string; // senha provisória do Ari, criada pela Paula

  const http = () => request(app.getHttpServer());
  const trocar = (token: string | null, corpo: { senhaAtual: string; novaSenha: string }) => {
    // Origem nova a cada chamada, para o limite de tentativas de um teste não pegar o outro.
    const pedido = http().post('/api/auth/trocar-senha').set('X-Forwarded-For', novaOrigem());
    return (token ? pedido.set('Authorization', `Bearer ${token}`) : pedido).send(corpo);
  };
  const entrarComoAri = (senha = provisoria) => entrar(app, { email: ARI.email, senha });

  beforeAll(async () => {
    app = await subirApp();
    prisma = app.get(PrismaService);
  });
  beforeEach(async () => {
    await limparBanco(app);
    await criarProfessor(app, PAULA);
    const paula = await entrar(app, PAULA);
    const criado = await http()
      .post('/api/alunos')
      .set('Authorization', `Bearer ${paula.accessToken}`)
      .send(ARI);
    provisoria = criado.body.senhaProvisoria as string;
  });
  afterAll(() => app.close());

  describe('conta com senha provisória (FR-017)', () => {
    it('o login informa que a senha é provisória, para o front levar à troca', async () => {
      const { resposta } = await entrarComoAri();
      expect(resposta.status).toBe(200);
      expect(resposta.body.usuario.senhaProvisoria).toBe(true);
    });

    it('consegue consultar a própria conta, renovar a sessão e sair', async () => {
      const ari = await entrarComoAri();

      const conta = await http()
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${ari.accessToken}`);
      const renovacao = await http().post('/api/auth/refresh').set('Cookie', ari.cookie);
      const saida = await http()
        .post('/api/auth/logout')
        .set('Cookie', cookieDeRenovacao(renovacao) ?? '');

      expect(conta.status).toBe(200);
      expect(conta.body.senhaProvisoria).toBe(true);
      expect(renovacao.status).toBe(200);
      expect(saida.status).toBe(204);
    });

    it('recebe 403 em qualquer outra rota, mesmo tendo o papel que a rota exige', async () => {
      // Professora com senha provisória: o papel dela abriria /api/alunos. O 403 só pode vir
      // da senha provisória.
      await prisma.user.update({
        where: { email: PAULA.email },
        data: { mustChangePassword: true },
      });
      const paula = await entrar(app, PAULA);
      const comToken = (pedido: request.Test) =>
        pedido.set('Authorization', `Bearer ${paula.accessToken}`);

      const listar = await comToken(http().get('/api/alunos'));
      const criar = await comToken(http().post('/api/alunos')).send({
        nome: 'Bia Barros',
        email: 'bia@exemplo.test',
      });

      expect(listar.status).toBe(403);
      expect(listar.body.message).toBe('Troque a senha provisória para continuar.');
      expect(criar.status).toBe(403);
      expect(await prisma.user.count({ where: { email: 'bia@exemplo.test' } })).toBe(0);
    });
  });

  describe('POST /api/auth/trocar-senha (FR-018)', () => {
    it('sem token responde 401', async () => {
      const resposta = await trocar(null, { senhaAtual: provisoria, novaSenha: NOVA });
      expect(resposta.status).toBe(401);
    });

    it('com a senha atual certa, a senha vira definitiva e ele segue logado', async () => {
      const ari = await entrarComoAri();

      const resposta = await trocar(ari.accessToken, { senhaAtual: provisoria, novaSenha: NOVA });

      expect(resposta.status).toBe(200);
      expect(resposta.body.usuario).toMatchObject({ email: ARI.email, senhaProvisoria: false });
      // A sessão devolvida funciona: token de acesso novo e cookie novo.
      const conta = await http()
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${resposta.body.accessToken}`);
      const renovacao = await http()
        .post('/api/auth/refresh')
        .set('Cookie', cookieDeRenovacao(resposta) ?? '');
      expect(conta.body.senhaProvisoria).toBe(false);
      expect(renovacao.status).toBe(200);
      // Sai e entra com a nova; a provisória não vale mais.
      expect((await entrarComoAri(NOVA)).resposta.status).toBe(200);
      expect((await entrarComoAri(provisoria)).resposta.status).toBe(401);
      const noBanco = await prisma.user.findUniqueOrThrow({ where: { email: ARI.email } });
      expect(noBanco.passwordHash).toMatch(/^\$argon2id\$/);
    });

    it('derruba as outras sessões da conta', async () => {
      const celular = await entrarComoAri();
      const computador = await entrarComoAri();

      await trocar(celular.accessToken, { senhaAtual: provisoria, novaSenha: NOVA });

      const noComputador = await http().post('/api/auth/refresh').set('Cookie', computador.cookie);
      const cookieAntigoDoCelular = await http()
        .post('/api/auth/refresh')
        .set('Cookie', celular.cookie);
      expect(noComputador.status).toBe(401);
      expect(cookieAntigoDoCelular.status).toBe(401);
    });

    it('depois da troca, as rotas do papel deixam de responder 403', async () => {
      await prisma.user.update({
        where: { email: PAULA.email },
        data: { mustChangePassword: true },
      });
      const paula = await entrar(app, PAULA);

      const troca = await trocar(paula.accessToken, {
        senhaAtual: PAULA.senha,
        novaSenha: 'senha-nova-da-paula',
      });
      const listar = await http()
        .get('/api/alunos')
        .set('Authorization', `Bearer ${troca.body.accessToken}`);

      expect(listar.status).toBe(200);
    });

    it('na 6ª tentativa em um minuto da mesma origem responde 429 (FR-006)', async () => {
      const ari = await entrarComoAri();
      const origem = novaOrigem();
      const tentar = () =>
        http()
          .post('/api/auth/trocar-senha')
          .set('X-Forwarded-For', origem)
          .set('Authorization', `Bearer ${ari.accessToken}`)
          .send({ senhaAtual: 'nao-e-a-provisoria', novaSenha: NOVA });

      for (let tentativa = 1; tentativa <= 5; tentativa += 1) {
        expect((await tentar()).status).toBe(400);
      }
      expect((await tentar()).status).toBe(429);
    });

    it.each([
      ['senha atual errada', { senhaAtual: 'nao-e-a-provisoria', novaSenha: NOVA }, /atual/i],
      ['nova senha com menos de 8 caracteres', { novaSenha: 'curta12' }, /pelo menos 8/],
      ['nova senha com mais de 128 caracteres', { novaSenha: 'a'.repeat(129) }, /no máximo 128/],
      ['nova senha igual à atual', { novaSenha: 'IGUAL' }, /diferente/i],
    ])('recusa %s com o motivo, e a senha não muda', async (_caso, parcial, motivo) => {
      const ari = await entrarComoAri();
      const corpo = {
        senhaAtual: provisoria,
        ...parcial,
        ...(parcial.novaSenha === 'IGUAL' ? { novaSenha: provisoria } : {}),
      };

      const resposta = await trocar(ari.accessToken, corpo);

      expect(resposta.status).toBe(400);
      expect(String(resposta.body.message)).toMatch(motivo);
      // Nada mudou: a provisória continua entrando e continua provisória.
      const login = await entrarComoAri();
      expect(login.resposta.status).toBe(200);
      expect(login.resposta.body.usuario.senhaProvisoria).toBe(true);
    });
  });
});
