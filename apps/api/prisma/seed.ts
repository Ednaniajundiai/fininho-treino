/**
 * Seed de desenvolvimento (D-10): exercícios genéricos fictícios no catálogo de cada professor
 * já cadastrado (crie o professor antes com `pnpm --filter api cli criar-professor`). Em
 * produção o catálogo começa vazio (contrato fichas/C-02): o seed se recusa a rodar lá.
 *
 *   pnpm --filter api exec prisma db seed
 *
 * Pode rodar quantas vezes quiser: exercício que já existe (mesmo nome, sem caixa) fica como
 * está. Usa só o `pg` e TypeScript apagável, para o Node rodar sem compilar.
 */
import pg from 'pg';

const EXERCICIOS: [nome: string, unidade: 'REPS' | 'SECONDS'][] = [
  ['Supino reto', 'REPS'],
  ['Supino inclinado com halteres', 'REPS'],
  ['Crucifixo', 'REPS'],
  ['Puxada frontal', 'REPS'],
  ['Remada curvada', 'REPS'],
  ['Remada baixa', 'REPS'],
  ['Agachamento livre', 'REPS'],
  ['Leg press', 'REPS'],
  ['Cadeira extensora', 'REPS'],
  ['Mesa flexora', 'REPS'],
  ['Desenvolvimento com halteres', 'REPS'],
  ['Elevação lateral', 'REPS'],
  ['Rosca direta', 'REPS'],
  ['Tríceps na polia', 'REPS'],
  ['Panturrilha em pé', 'REPS'],
  ['Prancha', 'SECONDS'],
  ['Prancha lateral', 'SECONDS'],
];

if (process.env['NODE_ENV'] === 'production') {
  throw new Error('O seed é só de desenvolvimento: em produção o catálogo começa vazio.');
}
const url = process.env['DATABASE_URL'];
if (!url) throw new Error('Defina DATABASE_URL (o .env da raiz é lido pelo prisma7.config.ts).');
// Segunda trava: NODE_ENV pode faltar num servidor; o banco precisa estar nesta máquina.
const HOSTS_LOCAIS = ['localhost', '127.0.0.1', '[::1]', '::1'];
const host = URL.canParse(url) ? new URL(url).hostname : '';
if (!HOSTS_LOCAIS.includes(host)) {
  throw new Error(
    `O seed é só de desenvolvimento e roda apenas em banco local (localhost, 127.0.0.1 ou ::1); ` +
      `o DATABASE_URL aponta para "${host || 'host não identificado'}".`,
  );
}

const cliente = new pg.Client({ connectionString: url });
await cliente.connect();
try {
  const resultado = await cliente.query(
    `INSERT INTO exercises (teacher_id, name, default_unit)
     SELECT u.id, e.nome, e.unidade::exercise_unit
       FROM users u
       CROSS JOIN unnest($1::text[], $2::text[]) AS e(nome, unidade)
      WHERE u.role = 'PROFESSOR'
     ON CONFLICT DO NOTHING`,
    [EXERCICIOS.map(([nome]) => nome), EXERCICIOS.map(([, unidade]) => unidade)],
  );
  console.log(`seed: ${resultado.rowCount ?? 0} exercício(s) novo(s) no catálogo dos professores.`);
} finally {
  await cliente.end();
}
