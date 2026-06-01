# PRD — Preço de Serviço por Colaborador (Preço Variável por Cliente)

> **Status:** Proposto · **Autor:** Jouberth Andrade · **Data:** 2026-05-29
> **Área:** fashion-hair-backend · **Tipo:** Feature

---

## 1. Contexto

Hoje os serviços têm preço **fixo** (`Service.price`) e somente o **ADMIN** pode alterar valores
e a taxa do salão (endpoints de `cash-closing`). Mas o dia a dia do salão funciona diferente:
o **preço cobrado varia por cliente** — um corte pode sair R$60 para o Cliente A e R$50 para o
Cliente B (mais fidelizado). Quem negocia esse preço é o **colaborador** que atende.

O que **não** muda: a **taxa do salão** (`salonFeeRatePercent`, ex.: 15%) continua sendo
prerrogativa **exclusiva do ADMIN**. A taxa é um percentual; ela incide sobre o preço
efetivamente cobrado — então mesmo com preço variável, o salão sempre recebe sua fatia.

**Base arquitetural existente:** o modelo já separa *preço* de *taxa* e já tira *snapshots* no
agendamento — `Appointment.priceAtBooking` e `Appointment.salonFeeRateAtBooking`. O fechamento
de caixa (`cash-closing.service.ts`) já calcula o bruto a partir de `priceAtBooking` e divide a
receita pela taxa snapshot. Hoje o `priceAtBooking` é preenchido automaticamente com
`service.price` (`buildBookingSnapshots`) e **não há como o colaborador definir um preço próprio**.
A feature consiste em **expor o preço no agendamento/checkout para o colaborador**, mantendo a
taxa resolvida no servidor.

### Arquivos de referência
| Item | Caminho |
|------|---------|
| Schema do banco | `prisma/schema.prisma` (`Service`, `Appointment`, `SalonSetting`) |
| Snapshot de preço/taxa | `src/modules/cash-closing/cash-closing.service.ts` (`buildBookingSnapshots`) |
| Resolução da taxa | `src/shared/utils/salonFee.ts` (`resolveSalonFeeRate`, `splitRevenue`) |
| Criação/edição de agendamento | `src/modules/appointments/appointments.service.ts` |
| Schemas Zod de agendamento | `src/modules/appointments/appointments.schema.ts` |
| Endpoints de taxa (ADMIN) | `src/modules/cash-closing/` (`updateSettingsService`, `updateServiceFeeService`) |

---

## 2. Objetivos

1. Colaborador define o preço cobrado por atendimento (na criação, durante e no checkout ao concluir).
2. O preço é **lembrado por cliente + serviço** (price book) e **sugerido automaticamente** em novos
   agendamentos, permanecendo editável.
3. A **taxa do salão permanece somente-ADMIN**; nenhum endpoint de colaborador aceita campo de taxa.
4. Rastreabilidade: registrar **quem definiu** o preço e o **preço padrão** no momento, para comparar
   cobrado × padrão.
5. Fechamento de caixa e relatórios refletem automaticamente o preço variável (já leem os snapshots).

## 3. Fora de escopo (Non-Goals)

- Não alterar quem controla a taxa do salão (segue ADMIN, via `cash-closing`).
- Sem trava de preço mínimo / desconto máximo — **preço livre > 0** (decisão de produto).
- Sem tabela de histórico completo de alterações de preço (auditoria leve apenas).
- Sem comissionamento por colaborador além do split salão/colaborador já existente.

## 4. Decisões aprovadas

| Tema | Decisão |
|------|---------|
| **Escopo** | Tabela de preço por **cliente + serviço** (sugestão padrão, editável por agendamento). |
| **Momento** | Definir/ajustar na **criação**, **enquanto não concluído**, e **no checkout (ao marcar DONE)**. |
| **Guardrail** | **Preço livre > 0**. A taxa (%) incide sobre o preço definido → salão sempre recebe sua fatia. |
| **Auditoria** | Registrar `priceSetById` + `standardPriceAtBooking` no agendamento. |

---

## 5. Regras de negócio

### 5.1 Resolução do preço cobrado (ordem de precedência)
Ao criar/atualizar/concluir um agendamento, o preço efetivo (`priceAtBooking`) é resolvido assim:
1. **Preço explícito** enviado na requisição (se houver) → vence.
2. Senão, **price book** `ClientServicePrice` para `(clientId, serviceId)`, se existir.
3. Senão, **`service.price`** (preço padrão).

Sempre, independente da origem:
- `standardPriceAtBooking` = `service.price` (referência de auditoria).
- `salonFeeRateAtBooking` = `resolveSalonFeeRate(...)` **resolvido no servidor**; o colaborador nunca
  envia esse valor.
- `priceSetById` = id do usuário que definiu, quando o preço cobrado ≠ padrão; senão `null`.

### 5.2 Persistência no price book ("lembrar")
- Quando o colaborador define um preço explícito no agendamento/checkout, faz-se **upsert** em
  `ClientServicePrice (clientId, serviceId)` → próximos agendamentos do cliente já sugerem o valor.
- O price book também pode ser gerenciado diretamente (listar/editar/remover). Remover → volta a
  sugerir `service.price`.
- Preço explícito **igual** ao padrão → não faz upsert (não polui o price book).

### 5.3 Validação
- `price`: número **positivo** (`> 0`), 2 casas decimais. Rejeita ≤ 0 com 422.
- Snapshot só é recalculado em update quando `serviceId` muda **ou** quando `price` é enviado
  (preserva o comportamento atual de não recalcular à toa).
- Em agendamentos já `DONE/CANCELLED/NO_SHOW`, preço é **imutável** (regra existente).

### 5.4 Permissões
- Colaborador edita preço **apenas dos próprios agendamentos** (checagem de posse já existe). ADMIN
  edita qualquer um.
- Price book: qualquer usuário autenticado (ADMIN ou COLLABORATOR) pode gerenciar.
- **Taxa do salão:** inalterada — somente ADMIN, via endpoints existentes de `cash-closing`.

---

## 6. Modelo de dados (Prisma)

**Novo modelo** em `prisma/schema.prisma`:
```prisma
model ClientServicePrice {
  id          String   @id @default(uuid())
  clientId    String   @map("client_id")
  serviceId   String   @map("service_id")
  price       Decimal  @db.Decimal(10, 2)
  updatedById String?  @map("updated_by_id")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  client  Client  @relation(fields: [clientId], references: [id])
  service Service @relation(fields: [serviceId], references: [id])

  @@unique([clientId, serviceId])
  @@index([clientId])
  @@map("client_service_prices")
}
```

**Alterações em `Appointment`** (campos novos, *nullable* p/ compatibilidade):
```prisma
standardPriceAtBooking Decimal? @map("standard_price_at_booking") @db.Decimal(10, 2)
priceSetById           String?  @map("price_set_by_id")
priceSetBy             User?    @relation("AppointmentPriceSetBy", fields: [priceSetById], references: [id])
```
Adicionar relações inversas em `Client`, `Service` e `User`. `priceAtBooking` e
`salonFeeRateAtBooking` já existem — reutilizar.

**Migração:** `npx prisma migrate dev --name client_service_prices` (cria tabela + colunas novas).

---

## 7. API

### 7.1 Agendamentos (estender módulo existente)
Arquivos: `appointments.schema.ts`, `appointments.service.ts`, `appointments.controller.ts`.

| Método | Rota | Mudança |
|--------|------|---------|
| `POST` | `/appointments` | adicionar `price?: number > 0` ao `createAppointmentSchema` |
| `PATCH` | `/appointments/:id` | adicionar `price?: number > 0` ao `updateAppointmentSchema` |
| `PATCH` | `/appointments/:id/status` | adicionar `price?: number > 0` ao `updateStatusSchema` (checkout: ao mudar para `DONE`, grava o preço final antes de congelar) |

Respostas passam a incluir `priceAtBooking`, `standardPriceAtBooking`, `salonFeeRatePercent`
(snapshot) e flag `isCustomPrice`.

### 7.2 Price book (novo submódulo sob `clients`)
Arquivos novos: `client-prices.{schema,service,controller,routes}.ts` em `src/modules/clients/`,
ou rotas aninhadas em `clients.routes.ts`. Todos com `preHandler: [requireAuth]`
(sem `requireRole('ADMIN')`).

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/clients/:clientId/prices` | lista price book do cliente (join com serviço) |
| `GET` | `/clients/:clientId/prices/:serviceId/resolve` | preço sugerido `{ price, source: 'book'\|'standard' }` |
| `PUT` | `/clients/:clientId/prices/:serviceId` | body `{ price }`, upsert |
| `DELETE` | `/clients/:clientId/prices/:serviceId` | remove (volta ao padrão) |

### 7.3 Lógica compartilhada
- Criar `resolveAppointmentPrice(prisma, clientId, serviceId, explicitPrice?)` em `salonFee.ts` e
  reusar nos três pontos (create/update/status-DONE).
- Estender `buildBookingSnapshots` para receber `clientId` + `explicitPrice?` e retornar também
  `standardPriceAtBooking` e `isCustomPrice`.

### 7.4 Inalterado (reafirmar)
- `cash-closing.service.ts` já lê `priceAtBooking`/`salonFeeRateAtBooking` → relatórios/fechamento
  refletem preço variável **sem mudança**.
- Endpoints de taxa (`updateSettingsService`, `updateServiceFeeService`) permanecem **ADMIN-only**.

---

## 8. Edge cases
- **Cliente novo** (`newClient`) criado no mesmo POST: resolver price book após obter `clientId`;
  sem entrada → usa explícito ou padrão.
- **Troca de `serviceId`** no PATCH sem enviar `price`: re-resolve pelo price book do novo serviço
  (ou padrão), não mantém preço antigo.
- **`price` igual ao padrão**: `priceSetById = null`, `isCustomPrice = false`, sem upsert no book.
- **Agendamento finalizado**: bloquear alteração de preço.
- **Decimais**: usar `decimalToNumber` / `Decimal(10,2)` consistente com o restante.

---

## 9. Plano de implementação (ordem sugerida)
1. **Schema + migração**: novo `ClientServicePrice`, colunas em `Appointment`, relações inversas;
   `prisma migrate dev`.
2. **Helper de preço**: `resolveAppointmentPrice` em `salonFee.ts`; estender `buildBookingSnapshots`.
3. **Agendamentos**: adicionar `price` aos 3 schemas; aplicar resolução + auditoria + upsert no
   price book em create/update/status-DONE.
4. **Price book**: schema Zod + service + controller + rotas aninhadas em `clients`.
5. **Seed** (opcional): exemplo de `ClientServicePrice` em `prisma/seed.ts`.
6. **Swagger**: conferir descrições derivadas das rotas Fastify.

---

## 10. Critérios de aceite / Verificação (end-to-end)
1. `npx prisma migrate dev` aplica sem erro; `npx prisma studio` mostra `client_service_prices` e
   as colunas novas em `appointments`.
2. Autenticado como **COLLABORATOR** (`npm run dev`):
   - `POST /appointments` com `price: 50` para Cliente B → `priceAtBooking=50`,
     `standardPriceAtBooking=60`, `priceSetById` preenchido, `salonFeeRateAtBooking` = taxa do
     serviço/padrão (não enviada).
   - `GET /clients/:id/prices` → mostra entrada (50) lembrada para o serviço.
   - Novo `POST /appointments` do Cliente B no mesmo serviço **sem** `price` → sugere/aplica 50
     automaticamente (`source: book`).
   - `PATCH /appointments/:id/status {status:"DONE", price:55}` → preço final 55 congelado.
   - `PATCH /cash-closing/.../fee` como COLLABORATOR → **403** (taxa segue ADMIN-only).
3. `GET /cash-closing/report?...` → bruto e split refletem 55 e a taxa do salão corretamente.
4. `price: 0` ou negativo → **422**.
5. COLLABORATOR alterando preço de agendamento de outro → **403**.
