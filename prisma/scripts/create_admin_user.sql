-- ============================================================
-- Fashion Hair - Criação de usuário ADMIN via editor SQL
-- ============================================================
-- O backend usa bcrypt (BCRYPT_ROUNDS=12) para a coluna `password`.
-- Aqui geramos o hash bcrypt diretamente no Postgres com a extensão
-- pgcrypto: crypt(senha, gen_salt('bf', 12)) -> hash $2a$ compatível
-- com a verificação do bcrypt no Node (bcrypt.compare aceita $2a/$2b).
--
-- >>> ALTERE os valores abaixo antes de executar <<<
--   - email : e-mail de login do admin
--   - name  : nome exibido
--   - senha : a senha em texto puro (será hasheada, NÃO fica salva)
-- ============================================================

-- Necessário para gen_salt() / crypt() (idempotente).
CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO users (id, name, email, password, role, "isActive", created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Administrador',                                  -- name
  'admin@fashionhair.com',                          -- email (login)
  crypt('Admin_fr!', gen_salt('bf', 12)), -- senha em texto puro
  'ADMIN',                                          -- role (enum UserRole)
  true,                                             -- isActive
  now(),
  now()
)
-- Se o e-mail já existir, promove a ADMIN, reativa e atualiza a senha.
ON CONFLICT (email) DO UPDATE SET
  password   = EXCLUDED.password,
  role       = 'ADMIN',
  "isActive" = true,
  deleted_at = NULL,
  updated_at = now();

-- Conferência (não exibe o hash):
SELECT id, name, email, role, "isActive", created_at
FROM users
WHERE email = 'admin@fashionhair.com';
