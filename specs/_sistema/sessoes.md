# Contratos: Sessões de treino

**Atualizado em**: 2026-11-17 pela PR do roteiro (descoberta). A `003-registro-sessao` implementa
e ajusta aqui o que mudar na entrevista dela.

## [C-01] Registro da sessão

**Usado por**: `003-registro-sessao` (produz), `004-integracao-fininho-watch` (cruza com o
relógio pela data), `006-graphql-historico` (consome).

A sessão é o que o aluno fez num dia da ficha, numa data.

**Regras**:

- Sessão pertence ao aluno (posse: `autenticacao/C-01`). O aluno registra e edita as dele; o
  professor só lê as dos alunos dele.
- Data no formato `AAAA-MM-DD`, no fuso de São Paulo; sem data futura.
- Uma sessão por dia da ficha por data.
- **Cópia da prescrição**: ao registrar, a sessão guarda a cópia do dia como estava na ficha
  (rótulo, título, itens com séries, faixas e unidade). Editar ou arquivar a ficha depois não
  muda o histórico.
- **Força**: por série, o valor feito (repetições ou segundos, na unidade do item) e a carga em
  kg, com passo de 0,5 (carga vazia = peso do corpo).
- **Cardio**: minutos feitos.
- Item pode ficar sem registro (não feito). Sessão com algum item sem registro é **parcial**;
  com todos, **completa**.
- Observação livre por sessão.

**Formato**:

```text
sessao:      id, alunoId, fichaId, data (AAAA-MM-DD), status (completa | parcial),
             observacao?, prescricao (cópia do dia: rotulo, titulo, itens[]), itens[]
item feito:  ordem (a mesma da cópia), feito (sim | não)
  forca:     series[] { valor, cargaKg? }
  cardio:    duracaoMin
```

**Histórico**: 2026-11-17 roteiro — contrato criado na descoberta.

## [C-02] Sugestão de progressão dupla

**Usado por**: `003-registro-sessao` (calcula e mostra), `006` (pode expor).

**Regras**:

- Vale para item de força, por exercício, olhando a última sessão em que ele foi feito.
- Quando **todas** as séries prescritas foram feitas e todas atingiram o máximo da faixa, a
  próxima vez que o exercício aparecer traz a sugestão de subir a carga.
- Faltou série, ou alguma série ficou abaixo do máximo: sem sugestão, mantém a carga.
- A sugestão só informa; não altera a ficha nem a carga registrada. O tamanho do aumento fica a
  critério do aluno ou do professor.

**Histórico**: 2026-11-17 roteiro — contrato criado na descoberta.
