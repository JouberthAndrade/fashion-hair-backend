-- AlterTable: specialty on services for public booking filter
ALTER TABLE "services" ADD COLUMN "specialty" "Specialty";

UPDATE "services" SET "specialty" = 'HAIRDRESSER' WHERE "name" IN (
  'Corte Feminino', 'Corte Masculino', 'Coloração', 'Escova', 'Hidratação'
);
UPDATE "services" SET "specialty" = 'MANICURE' WHERE "name" = 'Manicure';
UPDATE "services" SET "specialty" = 'PEDICURE' WHERE "name" = 'Pedicure';
UPDATE "services" SET "specialty" = 'MAKEUP_ARTIST' WHERE "name" = 'Maquiagem Festa';
UPDATE "services" SET "specialty" = 'EYEBROW' WHERE "name" = 'Design de Sobrancelha';
