-- ============================================================
-- Fashion Hair - Seed de serviços iniciais do salão
-- ============================================================
-- Tabela `services` (Prisma):
--   name                 VARCHAR(120)  - nome do serviço
--   description          TEXT          - opcional
--   duration_min         INT           - duração em minutos
--   price                DECIMAL(10,2) - preço base
--   salon_fee_rate_percent DECIMAL(5,2) NULL - % retido pelo salão;
--                          NULL = usa a taxa padrão global (SalonSetting).
--   is_active            BOOLEAN       - default true
--
-- Ajuste preços/durações conforme a realidade do salão antes de rodar.
-- Idempotente: a coluna `name` NÃO é UNIQUE, então usamos um anti-join
-- (NOT EXISTS) para não inserir serviços que já existam pelo nome.
-- ============================================================

INSERT INTO services (id, name, description, duration_min, price, salon_fee_rate_percent, is_active, created_at, updated_at)
SELECT gen_random_uuid(), v.name, v.description, v.duration_min, v.price, NULL, true, now(), now()
FROM (
  VALUES
    -- ── Cabelo (masculino) ───────────────────────────────
    ('Corte Masculino',       'Corte de cabelo masculino com máquina e tesoura',     30,  45.00),
    ('Corte e Barba',         'Corte masculino + barba feita e modelada',            60,  75.00),
    ('Barba',                 'Barba feita na navalha com toalha quente',            30,  35.00),
    ('Acabamento (Pezinho)',  'Acabamento de contorno entre cortes',                 15,  20.00),

    -- ── Cabelo (feminino) ────────────────────────────────
    ('Corte Feminino',        'Corte feminino com lavagem e finalização',            60,  80.00),
    ('Escova',                'Escova modeladora',                                   45,  50.00),
    ('Escova Progressiva',    'Alisamento / progressiva (valor a partir de)',       150, 200.00),
    ('Hidratação Capilar',    'Tratamento de hidratação profunda',                   45,  70.00),
    ('Coloração',             'Coloração / tintura (valor a partir de)',            120, 150.00),
    ('Luzes / Mechas',        'Mechas com touca ou papel alumínio (a partir de)',   180, 250.00),
    ('Penteado',              'Penteado para eventos',                               60, 120.00),

    -- ── Unhas ─────────────────────────────────────────────
    ('Manicure',              'Cuidados e esmaltação das unhas das mãos',            45,  35.00),
    ('Pedicure',              'Cuidados e esmaltação das unhas dos pés',             50,  40.00),
    ('Manicure e Pedicure',   'Combo manicure + pedicure',                           90,  70.00),
    ('Esmaltação em Gel',     'Esmaltação em gel de longa duração',                  60,  60.00),

    -- ── Sobrancelha / Estética ────────────────────────────
    ('Design de Sobrancelha', 'Design e modelagem das sobrancelhas',                 30,  35.00),
    ('Maquiagem',             'Maquiagem social / para eventos',                     60, 130.00),
    ('Limpeza de Pele',       'Limpeza de pele facial',                              60, 110.00)
) AS v(name, description, duration_min, price)
WHERE NOT EXISTS (
  SELECT 1 FROM services s WHERE s.name = v.name
);

-- Conferência:
SELECT name, duration_min, price, is_active
FROM services
ORDER BY name;
