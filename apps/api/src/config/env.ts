/**
 * Variáveis de ambiente da API, validadas uma vez na subida.
 * Os nomes estão documentados no .env.example da raiz.
 */
export type Env = {
  DATABASE_URL: string;
  JWT_ACCESS_SECRET: string;
  API_PORT: number;
};

export function validarEnv(bruto: Record<string, unknown>): Env {
  const erros: string[] = [];

  const databaseUrl = bruto['DATABASE_URL'];
  if (typeof databaseUrl !== 'string' || !databaseUrl.startsWith('postgres')) {
    erros.push('DATABASE_URL precisa ser uma URL do PostgreSQL');
  }

  const segredo = bruto['JWT_ACCESS_SECRET'];
  if (typeof segredo !== 'string' || segredo.length < 32) {
    erros.push('JWT_ACCESS_SECRET precisa ter pelo menos 32 caracteres');
  }

  const porta = Number(bruto['API_PORT'] ?? 3001);
  if (!Number.isInteger(porta) || porta <= 0) {
    erros.push('API_PORT precisa ser um número de porta');
  }

  if (erros.length > 0) {
    throw new Error(`Configuração inválida: ${erros.join('; ')}. Veja o .env.example.`);
  }

  return {
    ...bruto,
    DATABASE_URL: databaseUrl as string,
    JWT_ACCESS_SECRET: segredo as string,
    API_PORT: porta,
  };
}
