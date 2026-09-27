# BehaviorLab - Plataforma de Jogos Comportamentais

Plataforma web para aplicação de jogos comportamentais, desenvolvida em parceria com o curso de Psicologia da **Fundação Hermínio Ometto (FHO)**.

---

## Tecnologias

| Camada | Tecnologia |
|--------|------------|
| Backend | NestJS + TypeScript |
| Banco de Dados | PostgreSQL |
| ORM | TypeORM |
| Autenticação | JWT + Passport |

---

## Estrutura do Projeto

```
src/
├── auth/           # Autenticação (login)
├── users/          # Usuários (professores)
├── game/           # Catálogo de jogos
├── settings/       # Configurações dos jogos
├── session/        # Sessões de jogo
├── player/         # Jogadores (alunos)
├── match/          # Partidas
└── app.module.ts   # Módulo principal
```

---

## Endpoints

### Auth
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/auth/login` | Login do professor (403 enquanto o e-mail não for verificado) |

### Users
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/users` | Criar usuário (e-mail `@fho.edu.br` obrigatório; envia código de verificação) |
| POST | `/users/verify-email` | Confirmar o código de 6 dígitos (vale 15 min, máx. 5 tentativas) |
| POST | `/users/resend-verification` | Reenviar o código (no máximo 1 por minuto) |
| GET | `/users` | Listar usuários |
| GET | `/users/:id` | Buscar usuário |
| PATCH | `/users/:id` | Atualizar usuário |
| DELETE | `/users/:id` | Remover usuário |

### Games
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/games` | Criar jogo |
| GET | `/games` | Listar jogos |
| GET | `/games/:id` | Buscar jogo |
| PATCH | `/games/:id` | Atualizar jogo |
| DELETE | `/games/:id` | Remover jogo |

### Sessions
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/sessions` | Criar sessão |
| GET | `/sessions` | Listar sessões |
| GET | `/sessions/results` | Listar sessões finalizadas para a tela de resultados |
| GET | `/sessions/:id` | Buscar sessão |
| GET | `/sessions/codigo/:codigo` | Buscar por código de convite |
| GET | `/sessions/:id/results` | Listar partidas de uma sessão finalizada |
| GET | `/sessions/:id/results/:matchId` | Listar jogadas de uma partida |
| PATCH | `/sessions/:id` | Atualizar sessão |
| DELETE | `/sessions/:id` | Remover sessão |
| GET | `/sessions/:id/export` | Exportar dados em CSV (download automático) |

### Players
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/players` | Criar jogador |
| GET | `/players` | Listar jogadores |
| GET | `/players/:id` | Buscar jogador |
| PATCH | `/players/:id` | Atualizar jogador |
| DELETE | `/players/:id` | Remover jogador |

### Matches
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/matches` | Criar partida |
| GET | `/matches` | Listar partidas |
| GET | `/matches?session_id=xxx` | Filtrar por sessão |
| GET | `/matches/:id` | Buscar partida |
| PATCH | `/matches/:id` | Atualizar partida |
| DELETE | `/matches/:id` | Remover partida |

---

## Fluxo Principal

```
1. Professor faz login
   POST /auth/login

2. Professor cria sessão (escolhe jogo + configurações)
   POST /sessions → retorna código de convite (ex: "ABC123")

3. Aluno acessa pelo código
   GET /sessions/codigo/ABC123

4. Aluno se registra
   POST /players

5. Sistema cria partida quando 2 jogadores estão prontos
   POST /matches { session_id, player1_id, player2_id }

6. Jogo acontece (front envia jogadas)
   PATCH /matches/:id { moves: { round1: { p1, p2 }, ... }, status }

7. Professor vê resultados
   GET /sessions/:id/results

8. Professor exporta dados (CSV com uma linha por round)
   GET /sessions/:id/export
```

---

## Como Iniciar

### Pré-requisitos

- Node.js (v18+)
- PostgreSQL rodando na porta 5433
- Banco de dados criado: `nest_db`

### Instalação

```bash
# Clonar repositório
git clone https://github.com/joaoVitorVallim/Behavioral-games-TCC.git
cd Behavioral-games-TCC

# Mudar para branch backend
git checkout backend

# Instalar dependências
npm install
```

### Configuração do Banco

O projeto espera PostgreSQL com estas configurações (em `app.module.ts`):

```
host: localhost
port: 5433
username: nest
password: nest
database: nest_db
```

### Executar

```bash
# Desenvolvimento (com hot reload)
npm run start:dev

# Produção
npm run build
npm run start:prod
```

### Testar

Acesse: `http://localhost:3000`

---

## Divisão da Equipe

| Membro | Responsabilidade |
|--------|------------------|
| Vallim | Auth, Users |
| Pedro/Butrico | Sessions, Players, Matches |
| Marco | Results, Export |
| Breno/Matheus | Frontend |

---

## TODO

- [x] Implementar `GET /sessions/:id/results`
- [x] Implementar `GET /sessions/:id/export`
- [ ] Endpoint `POST /sessions/:id/join` (entrar na sessão)
- [ ] Endpoint `GET /sessions/:id/status` (verificar pareamento)
