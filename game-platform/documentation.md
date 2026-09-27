# Documentation - Behavioral Games Platform

Documentacao geral do frontend `game-platform`.

## 1) Visao Geral

O projeto e uma aplicacao React + TypeScript para gerenciamento de sessoes de jogos comportamentais. O foco principal atual e:

- autenticacao de docente
- listagem e criacao de sessoes
- configuracao dinamica de jogo por schema vindo do backend
- visualizacao de relatorios (rota protegida)

## 2) Stack Tecnica

- Runtime/UI: React 19
- Linguagem: TypeScript
- Build tool: Vite
- Roteamento: React Router
- Estado remoto/cache: TanStack React Query
- HTTP client: Axios
- Estilizacao: Tailwind CSS
- Icones: lucide-react
- Qualidade: ESLint

## 3) Comandos de Desenvolvimento

No diretorio `game-platform`:

- `npm install`: instala dependencias
- `npm run dev`: sobe ambiente de desenvolvimento
- `npm run build`: compila TypeScript e gera build de producao
- `npm run lint`: valida regras de lint
- `npm run preview`: serve build local para validacao

## 4) Estrutura de Pastas

```text
src/
  app/
    router.tsx
    components/
      ProtectedRoute.tsx
      NotFoundPage.tsx
    providers/
      AuthProvider.tsx
      QueryProvider.tsx

  infrastructure/
    api/
      api-client.ts

  modules/
    auth/
      hooks/
      pages/
      services/
      types.ts

    game-session/
      components/
      hooks/
      pages/
      services/
      utils/
      types.ts

    prisoner/
      components/
      game/
      hooks/
      pages/
      services/
      session.ts
      socket.ts
      types.ts

    reports/
      components/
      hooks/
      pages/
      services/
      utils/
      types.ts

    roulette/
      (separate game module — out of scope for this doc; see its own files)

  shared/
    components/
    constants/
    hooks/
    utils/
```

### Responsabilidades

- `app/`: bootstrap da app, rotas e providers globais.
- `infrastructure/`: infraestrutura comum (cliente HTTP, configs de integracao).
- `modules/`: implementacao por dominio de negocio.
- `shared/`: utilitarios e componentes reutilizaveis entre dominios.

## 5) Bootstrap da Aplicacao

Arquivo `src/main.tsx`:

1. valida existencia do elemento `#root`
2. monta `AuthProvider`
3. monta `QueryProvider`
4. monta `RouterProvider`

Ordem atual:

- `AuthProvider`
- `QueryProvider`
- `RouterProvider`

## 6) Roteamento

Arquivo `src/app/router.tsx`:

- `/` -> `HomePage`
- `/login` -> `LoginPage`
- `/register` -> `RegisterPage`
- `/verify-email` -> `VerifyEmailPage` (codigo de verificacao do e-mail)
- `/sessions` -> `SessionsPage`
- `/create-session` -> `CreateSessionPage` (protegida)
- `/reports` -> `ReportsPage` (protegida)
- `/reports/:sessionId` -> `SessionMatchesPage` (protegida)
- `/reports/:sessionId/matches/:matchId` -> `MatchDetailPage` (protegida)
- `/prisoner/waiting` -> `WaitingPage`
- `/prisoner/game` -> `GamePage`
- `/prisoner/result` -> `ResultPage`
- `/roulette/game` -> `RouletteGamePage`
- `*` -> `NotFoundPage` (qualquer rota nao mapeada)

Protecao de rota em `ProtectedRoute`:

- enquanto auth carrega: mostra loading
- nao autenticado: redireciona para `/`
- autenticado: renderiza conteudo protegido

## 7) Autenticacao

### Arquivos chave

- `src/app/providers/AuthProvider.tsx`
- `src/modules/auth/services/authService.ts`

### Fluxo resumido

1. App inicia e tenta restaurar token do storage.
2. Se token invalido/expirado, remove e encerra sessao.
3. No login, chama `/auth/login`.
4. Salva token e decodifica payload para estado local do usuario.
5. `is_authenticated` controla acesso a rotas protegidas.

### Cadastro e verificacao de e-mail

1. O cadastro so aceita e-mail institucional `@fho.edu.br` (validado no front e no backend).
2. O backend envia um codigo de 6 digitos por e-mail (vale 15 min, max. 5 tentativas).
3. `RegisterPage` leva para `/verify-email`, que chama `POST /users/verify-email`; o reenvio (`POST /users/resend-verification`) e liberado 1x por minuto.
4. Enquanto o e-mail nao e verificado, `/auth/login` responde `403` e a `LoginPage` redireciona para `/verify-email`.

### Observacoes

- Token atual em `localStorage` (`auth_token`).
- Em `401`, interceptor remove token automaticamente.

## 8) Comunicacao com Backend

Arquivo central: `src/infrastructure/api/api-client.ts`.

### Padrao

- base URL via `VITE_API_URL`
- timeout de request
- header JSON padrao
- interceptor de request para `Authorization`
- interceptor de response para tratamento generico

### Endpoints de game-session

Arquivo: `src/modules/game-session/services/sessionService.ts`.

- `GET /games`
- `GET /settings/game-config/fields?game={game}`
- `GET /settings/player-fields/valid`
- `GET /sessions`
- `POST /sessions`
- `POST /sessions/join`
- `DELETE /sessions/{id}`
- `POST /sessions/{id}/finish`
- `GET /settings/game/{game}`
- `POST /settings`
- `DELETE /settings/{id}`

## 9) Modulo Game Session (estado atual)

O modulo `game-session` contem:

- pagina de listagem de sessoes
- pagina de criacao de sessao
- componentes de configuracao e resumo
- hooks de consulta/mutacao

### Fluxo dinamico de configuracao

Na `CreateSessionPage`:

1. Carrega jogos via `useGames` (`/games`).
2. Seleciona jogo atual (id).
3. Carrega configuracoes existentes via `useConfigs(game)`.
4. Carrega schema de campos via `useGameConfigFields(game)`.
5. Monta formulario dinamico com:
   - secao `common`
   - secao especifica do jogo selecionado

### Regra de UX importante

- Se um jogo nao possui configuracoes existentes, o modo muda automaticamente para criar configuracao.

### Escopo atual da tela

- a parte de configuracao dinamica foi implementada
- o fluxo final de criacao efetiva de sessao pode ter evolucoes futuras conforme backlog

## 10) Tipagem e Contratos

Arquivo principal do dominio: `src/modules/game-session/types.ts`.

Tipos relevantes:

- `GameCatalogItem`: jogo retornado por `/games`
- `GameConfigFieldDefinition`: campo de schema dinamico (`name`, `type`)
- `GameConfigFieldsResponse`: estrutura com `common` e secoes por jogo
- `GameConfig` e `CreateConfigPayload`: estruturas dinamicas para campos de configuracao

## 11) Estado Local vs Estado Remoto

### Estado remoto

Usa React Query para dados de API:

- jogos
- configuracoes por jogo
- fields por jogo

### Estado local

Usado para UI/controle da tela:

- selecoes de usuario
- modo de configuracao
- rascunho de formulario
- flags de feedback visual

## 12) Seguranca e Boas Praticas

Praticas ja presentes:

- tratamento defensivo de token
- limpeza de auth em `401`
- mensagens de erro genericas em producao
- utilitarios de validacao/sanitizacao em `shared/utils`
- renderer dinamico com allowlist de tipos suportados
- fallback seguro para tipos nao suportados

Recomendacoes continuas:

- nunca renderizar HTML vindo do backend
- nao logar credenciais/tokens
- validar input antes de enviar para API
- manter contratos de tipo alinhados com backend

## 13) Guia Rapido: Adicionar um Novo Jogo

Passos esperados no modelo atual:

1. Backend passa a retornar o novo jogo em `GET /games`.
2. Backend retorna configuracoes do novo jogo em `GET /settings/game/{id}`.
3. Backend retorna schema do novo jogo em `GET /settings/game-config/fields?game={id}`.
4. Frontend exibe automaticamente no select de jogo.
5. Frontend monta formulario dinamico com base no schema.
6. Validar loading/erro/vazio para o novo jogo.

## 14) Troubleshooting

### Select de jogo vazio

- verificar resposta de `/games`
- verificar `VITE_API_URL`
- verificar erro de rede/CORS

### Campos de configuracao nao aparecem

- verificar resposta de `/settings/game-config/fields?game={id}`
- verificar se `common` e secao especifica retornam arrays
- verificar se `type` esta em formato suportado

### Configuracoes existentes nao carregam

- verificar `/settings/game/{id}`
- conferir se `id` do jogo selecionado esta correto
- conferir estado `enabled` da query

### Erro de autenticacao em rotas protegidas

- verificar validade do token no storage
- verificar se backend retornou `401`
- confirmar decodificacao do payload em `authService.decodeToken`

## 15) Qualidade e Entrega

Checklist minimo antes de merge:

- `npm run lint`
- `npm run build`
- smoke test manual das rotas principais
- revisar estados de loading/erro nas telas alteradas
- revisar tipagem sem `any` indevido

## 16) Referencias Internas

- `README.md`
- `DESIGN_RULES.md`
- `src/app/router.tsx`
- `src/infrastructure/api/api-client.ts`
- `src/modules/game-session/pages/CreateSessionPage.tsx`
