// Roda antes de cada arquivo e2e. Os testes usam SEMPRE o banco de teste, nunca o de
// desenvolvimento nem o de produção: a URL vem de DATABASE_URL_TEST (CI) ou do Postgres do
// docker-compose.yml, com as credenciais de desenvolvimento do .env.example.
export const URL_DO_BANCO_DE_TESTE =
  process.env['DATABASE_URL_TEST'] ??
  'postgresql://fininho_treino:dev-apenas-local@127.0.0.1:5450/fininho_treino_test';

if (!new URL(URL_DO_BANCO_DE_TESTE).pathname.endsWith('_test')) {
  throw new Error('O banco dos testes e2e precisa ter o nome terminado em "_test".');
}

process.env['DATABASE_URL'] = URL_DO_BANCO_DE_TESTE;
process.env['JWT_ACCESS_SECRET'] = 'segredo-apenas-de-teste-com-mais-de-32-caracteres';
