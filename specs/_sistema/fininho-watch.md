# Contratos: fininho-watch (consumido, só leitura)

**Atualizado em**: 2026-11-17 pela PR do roteiro (descoberta). Fonte: README e
`specs/003-resumo-diario` do repositório `fininho-watch`. Se o fininho-watch mudar, quem muda é
ele; este arquivo registra o que o fininho-treino depende.

## [C-01] Leitura do resumo diário

**Usado por**: `004-integracao-fininho-watch` (consome). Produzido pelo `fininho-watch`.

O fininho-treino lê, para a conta do dono, os treinos medidos pelo relógio num dia ou num
período, para mostrá-los ao lado da sessão registrada.

**Regras**:

- Só leitura; nada é escrito no fininho-watch (princípio III).
- Só a conta do dono usa a integração; o token de leitor fica em variável de ambiente do
  servidor, nunca no front nem no repositório.
- Período de no máximo 90 dias, `de <= ate`, sem data futura; fora disso o fininho-watch recusa.
- Datas em `AAAA-MM-DD`, no fuso de São Paulo (UTC-3).
- Campo sem medição vem `null` (e aparece em `ausentes`), nunca zero.
- Esporte com código fora da tabela vem como "esporte <código>"; o fininho-treino não inventa nome.
- Integração fora do ar, sem token ou dia `sem_dados`: o app avisa e segue sem os dados do relógio.

**Formato** (só o que o fininho-treino usa):

```text
GET /v1/resumos/{AAAA-MM-DD}
GET /v1/resumos?de=AAAA-MM-DD&ate=AAAA-MM-DD
Authorization: Bearer <token de leitor>

por dia:
  situacao      "completo" | "parcial" | "sem_dados"
  treinos[]     lista (pode ser vazia)
    esporte       texto: nome do esporte ou "esporte <código>"
    codigo        número: 1052 força, 1002 esteira, 1008 bike (outros possíveis)
    inicio        horário de início — formato exato: Pendente (confirmar na 004)
    duracao_min   número de minutos
```

**Histórico**: 2026-11-17 roteiro — contrato registrado na descoberta.
