-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('SUPER_ADMIN', 'TEACHER');

-- AlterTable
ALTER TABLE "admin_users" ADD COLUMN     "role" "AdminRole" NOT NULL DEFAULT 'SUPER_ADMIN';

-- CreateTable
CREATE TABLE "website_themes" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "light_colors" JSONB NOT NULL,
    "dark_colors" JSONB NOT NULL,
    "font_sans" TEXT NOT NULL DEFAULT 'Nunito',
    "font_heading" TEXT NOT NULL DEFAULT 'Fredoka',
    "radius" TEXT NOT NULL DEFAULT '1rem',
    "shadow" TEXT NOT NULL DEFAULT 'md',
    "spacing_scale" TEXT NOT NULL DEFAULT 'normal',
    "previous_theme" JSONB,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT,

    CONSTRAINT "website_themes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "theme_audit_logs" (
    "id" TEXT NOT NULL,
    "admin_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "old_theme" JSONB,
    "new_theme" JSONB NOT NULL,
    "ip" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "theme_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "theme_audit_logs_admin_id_idx" ON "theme_audit_logs"("admin_id");

-- AddForeignKey
ALTER TABLE "theme_audit_logs" ADD CONSTRAINT "theme_audit_logs_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admin_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
