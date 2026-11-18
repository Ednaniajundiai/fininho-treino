/**
 * Comando administrativo: cria uma conta de professor, ou redefine a senha de uma que já existe.
 * É o único caminho para o primeiro professor (contrato autenticacao/C-01): não há rota de API
 * que faça isso.
 *
 *   pnpm --filter api build
 *   pnpm --filter api cli criar-professor               # pergunta nome, e-mail e senha
 *   pnpm --filter api cli criar-professor --redefinir   # troca a senha de professor existente
 *
 * A senha é lida do terminal sem eco. Nunca passe a senha como argumento: ela ficaria no
 * histórico do shell.
 */
import { stdin, stdout } from 'node:process';
import { createInterface } from 'node:readline/promises';
import { HttpException } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module.js';
import { UsuariosService } from '../usuarios/usuarios.service.js';

const USO = 'Uso: pnpm --filter api cli criar-professor [--redefinir]';

// Sem terminal interativo (entrada por pipe ou arquivo), as respostas são as linhas da
// entrada, lidas todas de uma vez: um leitor por pergunta perderia as linhas seguintes.
let linhasDaEntrada: string[] | undefined;

async function proximaLinhaDaEntrada(): Promise<string> {
  if (!linhasDaEntrada) {
    let tudo = '';
    for await (const trecho of stdin.setEncoding('utf8')) tudo += String(trecho);
    linhasDaEntrada = tudo.split(/\r?\n/);
  }
  return (linhasDaEntrada.shift() ?? '').trim();
}

async function perguntar(pergunta: string): Promise<string> {
  if (!stdin.isTTY) return proximaLinhaDaEntrada();

  const leitor = createInterface({ input: stdin, output: stdout });
  try {
    return (await leitor.question(pergunta)).trim();
  } finally {
    leitor.close();
  }
}

/** Lê uma linha sem mostrar o que é digitado. */
async function perguntarSenha(pergunta: string): Promise<string> {
  if (!stdin.isTTY) return proximaLinhaDaEntrada();

  stdout.write(pergunta);
  stdin.setRawMode(true);
  stdin.resume();
  stdin.setEncoding('utf8');
  try {
    return await new Promise<string>((resolver, rejeitar) => {
      let senha = '';
      const aoDigitar = (trecho: string) => {
        for (const tecla of trecho) {
          if (tecla === '\r' || tecla === '\n') {
            stdin.off('data', aoDigitar);
            resolver(senha);
            return;
          }
          if (tecla === '\u0003') {
            stdin.off('data', aoDigitar);
            rejeitar(new Error('Cancelado.'));
            return;
          }
          if (tecla === '\u007f' || tecla === '\b') senha = senha.slice(0, -1);
          else senha += tecla;
        }
      };
      stdin.on('data', aoDigitar);
    });
  } finally {
    stdin.setRawMode(false);
    stdin.pause();
    stdout.write('\n');
  }
}

async function criarProfessor(redefinir: boolean): Promise<void> {
  const nome = await perguntar('Nome: ');
  const email = await perguntar('E-mail: ');
  const senha = await perguntarSenha('Senha (não aparece ao digitar): ');
  const confirmacao = await perguntarSenha('Repita a senha: ');
  if (senha !== confirmacao) throw new Error('As senhas não conferem.');

  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error'] });
  try {
    const { acao, usuario } = await app
      .get(UsuariosService)
      .criarProfessor({ nome, email, senha, redefinir });
    stdout.write(
      acao === 'criado'
        ? `Professor criado: ${usuario.email}\n`
        : `Senha redefinida para ${usuario.email}. As sessões abertas dessa conta foram encerradas.\n`,
    );
  } finally {
    await app.close();
  }
}

const [comando, ...opcoes] = process.argv.slice(2);
const opcoesDesconhecidas = opcoes.filter((opcao) => opcao !== '--redefinir');

if (comando !== 'criar-professor' || opcoesDesconhecidas.length > 0) {
  console.error(USO);
  process.exitCode = 1;
} else {
  try {
    await criarProfessor(opcoes.includes('--redefinir'));
  } catch (erro) {
    // Mostra só a mensagem (regra recusada, senhas diferentes), nunca a senha digitada.
    const mensagem = erro instanceof HttpException || erro instanceof Error ? erro.message : erro;
    console.error(`Não foi possível concluir: ${String(mensagem)}`);
    process.exitCode = 1;
  }
}
