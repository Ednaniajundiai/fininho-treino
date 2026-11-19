# Desfazer a migration `20261118174521_fichas`

O Prisma não gera `down`. Este é o plano para reverter a migration da `002-fichas-treino` (vai
na descrição da PR).

## O que a migration cria

Só objetos novos; nenhuma tabela da `001` é alterada:

- tipos `exercise_unit`, `plan_status`, `plan_item_type`, `cardio_mode`;
- tabelas `exercises`, `plans`, `plan_days`, `plan_items`, com índices, chaves estrangeiras
  (para `users` e entre elas), o índice `exercises_teacher_id_lower_name_key`, o índice parcial
  `plans_uma_ativa_por_aluno` e o CHECK `plan_items_campos_por_tipo`.

Desfazer **apaga todas as fichas e o catálogo de exercícios**. Antes, em qualquer banco que não
seja de desenvolvimento, confirme um backup recente (`pg_dump`) e que nenhuma feature posterior
(ex.: `003-registro-sessao`) já tem migration apontando para estas tabelas: se tiver, desfaça a
dela primeiro.

## Procedimento

1. Parar a API (ou fazer o deploy da versão anterior à `002`), para nada gravar em fichas
   durante a reversão.
2. Rodar o SQL abaixo numa transação (`psql -v ON_ERROR_STOP=1 -1 -f desfazer.sql`).
3. Conferir: `\dt` não lista mais as quatro tabelas, e
   `SELECT migration_name FROM _prisma_migrations ORDER BY started_at` termina em
   `20261117183641_contas_e_sessoes`.
4. Subir a versão da API sem a `002`. Para reaplicar mais tarde, basta
   `pnpm db:migrate` com o código da `002` de volta.

```sql
-- Reverte 20261118174521_fichas. Ordem: filhas antes das mães; os índices, o CHECK e as
-- chaves estrangeiras caem junto com as tabelas.
DROP TABLE IF EXISTS "plan_items";
DROP TABLE IF EXISTS "plan_days";
DROP TABLE IF EXISTS "plans";
DROP TABLE IF EXISTS "exercises";

DROP TYPE IF EXISTS "cardio_mode";
DROP TYPE IF EXISTS "plan_item_type";
DROP TYPE IF EXISTS "plan_status";
DROP TYPE IF EXISTS "exercise_unit";

-- Sem esta linha, o `prisma migrate deploy` acharia que a migration ainda está aplicada.
DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20261118174521_fichas';
```

## Variáveis de ambiente

A `002` não cria variável nova; o `.env.example` não muda.
