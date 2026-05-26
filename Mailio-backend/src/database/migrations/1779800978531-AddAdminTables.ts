import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAdminTables1779800978531 implements MigrationInterface {
    name = 'AddAdminTables1779800978531'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."idx_email_lists_user_active"`);
        await queryRunner.query(`DROP INDEX "public"."idx_emails_user_active"`);
        await queryRunner.query(`DROP INDEX "public"."idx_emails_address_completed"`);
        await queryRunner.query(`CREATE TYPE "public"."admins_role_enum" AS ENUM('SUPER_ADMIN', 'ADMIN')`);
        await queryRunner.query(`CREATE TABLE "admins" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(255) NOT NULL, "email" character varying(255) NOT NULL, "password_hash" character varying(255) NOT NULL, "role" "public"."admins_role_enum" NOT NULL DEFAULT 'ADMIN', "is_active" boolean NOT NULL DEFAULT true, "last_login_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_051db7d37d478a69a7432df1479" UNIQUE ("email"), CONSTRAINT "PK_e3b38270c97a854c48d2e80874e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "admin_otps" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "admin_id" uuid NOT NULL, "email" character varying(255) NOT NULL, "otp_hash" character varying(255) NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "consumed_at" TIMESTAMP WITH TIME ZONE, "attempt_count" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_c652e103032409ac08bf4d8a40e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_admin_otps_email" ON "admin_otps" ("email") `);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "reset_password_token"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "reset_password_expires_at"`);
        await queryRunner.query(`DROP INDEX "public"."uq_users_provider_provider_id"`);
        await queryRunner.query(`ALTER TYPE "public"."auth_provider" RENAME TO "auth_provider_old"`);
        await queryRunner.query(`CREATE TYPE "public"."users_provider_enum" AS ENUM('LOCAL', 'GOOGLE', 'LINKEDIN')`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "provider" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "provider" TYPE "public"."users_provider_enum" USING "provider"::"text"::"public"."users_provider_enum"`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "provider" SET DEFAULT 'LOCAL'`);
        await queryRunner.query(`DROP TYPE "public"."auth_provider_old"`);
        await queryRunner.query(`DROP INDEX "public"."idx_email_otps_email_purpose"`);
        await queryRunner.query(`ALTER TYPE "public"."otp_purpose" RENAME TO "otp_purpose_old"`);
        await queryRunner.query(`CREATE TYPE "public"."email_otps_purpose_enum" AS ENUM('SIGNUP_VERIFY', 'PASSWORD_RESET')`);
        await queryRunner.query(`ALTER TABLE "email_otps" ALTER COLUMN "purpose" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "email_otps" ALTER COLUMN "purpose" TYPE "public"."email_otps_purpose_enum" USING "purpose"::"text"::"public"."email_otps_purpose_enum"`);
        await queryRunner.query(`ALTER TABLE "email_otps" ALTER COLUMN "purpose" SET DEFAULT 'SIGNUP_VERIFY'`);
        await queryRunner.query(`DROP TYPE "public"."otp_purpose_old"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "uq_users_provider_provider_id" ON "users" ("provider", "provider_id") WHERE "provider_id" IS NOT NULL`);
        await queryRunner.query(`CREATE INDEX "idx_email_otps_email_purpose" ON "email_otps" ("email", "purpose") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."idx_email_otps_email_purpose"`);
        await queryRunner.query(`DROP INDEX "public"."uq_users_provider_provider_id"`);
        await queryRunner.query(`CREATE TYPE "public"."otp_purpose_old" AS ENUM('SIGNUP_VERIFY', 'PASSWORD_RESET')`);
        await queryRunner.query(`ALTER TABLE "email_otps" ALTER COLUMN "purpose" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "email_otps" ALTER COLUMN "purpose" TYPE "public"."otp_purpose_old" USING "purpose"::"text"::"public"."otp_purpose_old"`);
        await queryRunner.query(`ALTER TABLE "email_otps" ALTER COLUMN "purpose" SET DEFAULT 'SIGNUP_VERIFY'`);
        await queryRunner.query(`DROP TYPE "public"."email_otps_purpose_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."otp_purpose_old" RENAME TO "otp_purpose"`);
        await queryRunner.query(`CREATE INDEX "idx_email_otps_email_purpose" ON "email_otps" ("email", "purpose") `);
        await queryRunner.query(`CREATE TYPE "public"."auth_provider_old" AS ENUM('LOCAL', 'GOOGLE', 'LINKEDIN')`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "provider" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "provider" TYPE "public"."auth_provider_old" USING "provider"::"text"::"public"."auth_provider_old"`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "provider" SET DEFAULT 'LOCAL'`);
        await queryRunner.query(`DROP TYPE "public"."users_provider_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."auth_provider_old" RENAME TO "auth_provider"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "uq_users_provider_provider_id" ON "users" ("provider", "provider_id") WHERE (provider_id IS NOT NULL)`);
        await queryRunner.query(`ALTER TABLE "users" ADD "reset_password_expires_at" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "users" ADD "reset_password_token" character varying(255)`);
        await queryRunner.query(`DROP INDEX "public"."idx_admin_otps_email"`);
        await queryRunner.query(`DROP TABLE "admin_otps"`);
        await queryRunner.query(`DROP TABLE "admins"`);
        await queryRunner.query(`DROP TYPE "public"."admins_role_enum"`);
        await queryRunner.query(`CREATE INDEX "idx_emails_address_completed" ON "emails" ("address", "processed_at") WHERE ((status = 'COMPLETED'::emails_status_enum) AND (is_deleted = false))`);
        await queryRunner.query(`CREATE INDEX "idx_emails_user_active" ON "emails" ("user_id") WHERE (is_deleted = false)`);
        await queryRunner.query(`CREATE INDEX "idx_email_lists_user_active" ON "email_lists" ("user_id") WHERE (is_deleted = false)`);
    }

}
