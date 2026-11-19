-- CreateEnum
CREATE TYPE "exercise_unit" AS ENUM ('REPS', 'SECONDS');

-- CreateEnum
CREATE TYPE "plan_status" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "plan_item_type" AS ENUM ('STRENGTH', 'CARDIO');

-- CreateEnum
CREATE TYPE "cardio_mode" AS ENUM ('TREADMILL', 'BIKE', 'STAIRS', 'FREE');

-- CreateTable
CREATE TABLE "exercises" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "teacher_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "default_unit" "exercise_unit" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exercises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plans" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "student_id" UUID NOT NULL,
    "teacher_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "status" "plan_status" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_days" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "plan_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "title" TEXT NOT NULL,

    CONSTRAINT "plan_days_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "day_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "type" "plan_item_type" NOT NULL,
    "notes" TEXT,
    "exercise_id" UUID,
    "sets" INTEGER,
    "range_min" INTEGER,
    "range_max" INTEGER,
    "unit" "exercise_unit",
    "cardio_mode" "cardio_mode",
    "minutes_min" INTEGER,
    "minutes_max" INTEGER,

    CONSTRAINT "plan_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "exercises_teacher_id_idx" ON "exercises"("teacher_id");

-- CreateIndex
CREATE INDEX "plans_student_id_idx" ON "plans"("student_id");

-- CreateIndex
CREATE INDEX "plans_teacher_id_idx" ON "plans"("teacher_id");

-- CreateIndex
CREATE UNIQUE INDEX "plan_days_plan_id_position_key" ON "plan_days"("plan_id", "position");

-- CreateIndex
CREATE INDEX "plan_items_exercise_id_idx" ON "plan_items"("exercise_id");

-- CreateIndex
CREATE UNIQUE INDEX "plan_items_day_id_position_key" ON "plan_items"("day_id", "position");

-- AddForeignKey
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plans" ADD CONSTRAINT "plans_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plans" ADD CONSTRAINT "plans_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_days" ADD CONSTRAINT "plan_days_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_items" ADD CONSTRAINT "plan_items_day_id_fkey" FOREIGN KEY ("day_id") REFERENCES "plan_days"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_items" ADD CONSTRAINT "plan_items_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercises"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Escrito à mão (o Prisma não gera índice com expressão, índice parcial nem CHECK).
-- Contratos fichas/C-01 e fichas/C-02.

-- Nome do exercício único no catálogo do professor, sem diferença de maiúsculas (FR-002).
CREATE UNIQUE INDEX "exercises_teacher_id_lower_name_key" ON "exercises"("teacher_id", lower("name"));

-- No máximo uma ficha ativa por aluno, garantido pelo banco (FR-006, D-03).
CREATE UNIQUE INDEX "plans_uma_ativa_por_aluno" ON "plans"("student_id") WHERE "status" = 'ACTIVE';

-- Cada tipo de item tem os seus campos, e só eles (FR-004).
ALTER TABLE "plan_items" ADD CONSTRAINT "plan_items_campos_por_tipo" CHECK (
  (
    "type" = 'STRENGTH'
    AND "exercise_id" IS NOT NULL AND "unit" IS NOT NULL
    AND "sets" IS NOT NULL AND "sets" >= 1
    AND "range_min" IS NOT NULL AND "range_max" IS NOT NULL AND "range_min" <= "range_max"
    AND "cardio_mode" IS NULL AND "minutes_min" IS NULL AND "minutes_max" IS NULL
  ) OR (
    "type" = 'CARDIO'
    AND "cardio_mode" IS NOT NULL
    AND "minutes_min" IS NOT NULL AND "minutes_max" IS NOT NULL AND "minutes_min" <= "minutes_max"
    AND "exercise_id" IS NULL AND "unit" IS NULL
    AND "sets" IS NULL AND "range_min" IS NULL AND "range_max" IS NULL
  )
);
