# 💇 Fashion Hair — Backend

API RESTful para sistema de agendamentos de salão de beleza.

## 🛠 Tech Stack

- **Runtime**: Node.js + TypeScript
- **Framework**: Fastify v5
- **ORM**: Prisma v7 (PostgreSQL)
- **Cache**: Redis (ioredis)
- **Auth**: JWT (access + refresh token rotation)
- **Validação**: Zod
- **Segurança**: Helmet, CORS, Rate Limiting

---

## 🏗 Estrutura do Projeto

```
src/
├── config/           # Variáveis de ambiente e constantes
├── plugins/          # Plugins Fastify (Prisma, Redis, JWT)
├── modules/
│   ├── auth/         # Login, refresh token, logout
│   ├── users/        # Gerenciamento de usuários (admin)
│   ├── collaborators/ # Perfis e horários de colaboradores
│   ├── clients/      # Cadastro de clientes
│   ├── services/     # Serviços do salão
│   ├── appointments/ # Agendamentos (core)
│   └── dashboard/    # Painel diário (com cache Redis)
├── shared/
│   ├── errors/       # Classes de erro customizadas
│   ├── middlewares/  # requireAuth, requireRole
│   └── utils/        # password, timeSlots, pagination
└── hooks/            # Error handler global
```

---

## 🚀 Configuração

### 1. Pré-requisitos
- Node.js >= 20
- PostgreSQL >= 14
- Redis >= 7

### 2. Variáveis de ambiente

```bash
cp .env.example .env
# Preencha os valores no .env
```

### 3. Instalar dependências

```bash
npm install
```

### 4. Banco de dados

```bash
# Criar e aplicar migrations
npm run prisma:migrate

# Gerar cliente Prisma
npm run prisma:generate

# Popular com dados iniciais
npm run seed
```

### 5. Iniciar em desenvolvimento

```bash
npm run dev
```

---

## 📡 API — Endpoints

Base URL: `http://localhost:3333/api/v1`

### Auth
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/auth/login` | Login (retorna access + refresh token) |
| POST | `/auth/refresh` | Renovar tokens |
| POST | `/auth/logout` | Logout (revoga refresh token) |
| GET | `/auth/me` | Usuário autenticado |

### Usuários (Admin)
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/users` | Criar colaborador |
| GET | `/users` | Listar usuários |
| GET | `/users/:id` | Buscar usuário |
| PATCH | `/users/:id` | Atualizar usuário |
| PATCH | `/users/:id/password` | Alterar senha |
| DELETE | `/users/:id` | Desativar usuário |

### Colaboradores
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/collaborators` | Listar colaboradores ativos |
| GET | `/collaborators/:id` | Buscar colaborador |
| PUT | `/collaborators/:id/profile` | Atualizar perfil/especialidade |
| GET | `/collaborators/:id/working-hours` | Horários de trabalho |
| PUT | `/collaborators/:id/working-hours` | Definir horários de trabalho |

### Clientes
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/clients?search=&phone=` | Listar/buscar clientes |
| POST | `/clients` | Cadastrar cliente |
| GET | `/clients/:id` | Buscar cliente + histórico |
| PATCH | `/clients/:id` | Atualizar cliente |
| DELETE | `/clients/:id` | Remover cliente (admin) |

### Serviços
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/services` | Listar serviços ativos |
| POST | `/services` | Criar serviço (admin) |
| PATCH | `/services/:id` | Atualizar serviço (admin) |
| DELETE | `/services/:id` | Desativar serviço (admin) |

### Agendamentos
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/appointments` | Criar agendamento |
| GET | `/appointments/my?date=YYYY-MM-DD` | Minha agenda do dia |
| GET | `/appointments/:id` | Buscar agendamento |
| PATCH | `/appointments/:id` | Reagendar |
| PATCH | `/appointments/:id/status` | Atualizar status |
| DELETE | `/appointments/:id` | Cancelar |

### Dashboard (Tela do Salão)
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/dashboard/daily?date=YYYY-MM-DD` | Todos os agendamentos do dia por colaborador |

> 💡 O dashboard é **cacheado no Redis por 2 minutos** e invalidado automaticamente a cada novo agendamento.

---

## 🔐 Segurança

- **JWT**: Access token (15min) + Refresh token com rotação (7 dias)
- **Bcrypt**: Hashing de senhas com salt rounds configurável
- **Rate Limiting**: 100 req/min geral, 5 req/min no login
- **Helmet**: Headers HTTP de segurança
- **CORS**: Origens configuráveis via variável de ambiente
- **Soft Delete**: Registros nunca deletados fisicamente

## 👤 Credenciais de Teste (seed)

```
Admin:       admin@fashionhair.com  / admin@123
Colaborador: ana@fashionhair.com    / senha@123
```

## 📊 Status dos Agendamentos

```
SCHEDULED → IN_PROGRESS → DONE
SCHEDULED → CANCELLED
SCHEDULED → NO_SHOW
IN_PROGRESS → CANCELLED
```
