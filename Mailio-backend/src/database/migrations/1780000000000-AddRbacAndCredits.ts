import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds RBAC + Enterprise + Credit ledger.
 *
 * Purely additive — existing users default to role=USER with credit_balance=0
 * and no enterprise affiliation, so the current normal-user flow is unchanged.
 */
export class AddRbacAndCredits1780000000000 implements MigrationInterface {
  name = 'AddRbacAndCredits1780000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ---- enums ----
    await queryRunner.query(
      `CREATE TYPE "public"."users_role_enum" AS ENUM('USER','ENTERPRISE_USER','ENTERPRISE_ADMIN','SUPER_ADMIN')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."credit_account_type_enum" AS ENUM('USER','ENTERPRISE')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."credit_tx_type_enum" AS ENUM('ALLOCATION','RESERVATION','DEDUCTION','REFUND','ADJUSTMENT')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."credit_tx_reason_enum" AS ENUM('ADMIN_ALLOCATION','ADMIN_ADJUSTMENT','SINGLE_VERIFY','BULK_VERIFY_RESERVE','BULK_VERIFY_REFUND','PAYMENT')`,
    );

    // ---- enterprises ----
    await queryRunner.query(`
      CREATE TABLE "enterprises" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" varchar(255) NOT NULL,
        "domain" varchar(255),
        "credit_balance" bigint NOT NULL DEFAULT 0,
        "credits_used" bigint NOT NULL DEFAULT 0,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_by_admin_id" uuid,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_enterprises" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_enterprises_active" ON "enterprises" ("is_active")`,
    );

    // ---- users columns ----
    await queryRunner.query(
      `ALTER TABLE "users" ADD "role" "public"."users_role_enum" NOT NULL DEFAULT 'USER'`,
    );
    await queryRunner.query(`ALTER TABLE "users" ADD "enterprise_id" uuid`);
    await queryRunner.query(
      `ALTER TABLE "users" ADD "created_by_admin_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "created_by_user_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "credit_balance" bigint NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "credits_used" bigint NOT NULL DEFAULT 0`,
    );

    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "fk_users_enterprise" FOREIGN KEY ("enterprise_id") REFERENCES "enterprises"("id") ON DELETE SET NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_users_role" ON "users" ("role")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_users_enterprise" ON "users" ("enterprise_id") WHERE "enterprise_id" IS NOT NULL`,
    );

    // ---- credit_transactions (immutable ledger) ----
    await queryRunner.query(`
      CREATE TABLE "credit_transactions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "account_type" "public"."credit_account_type_enum" NOT NULL,
        "account_id" uuid NOT NULL,
        "user_id" uuid,
        "enterprise_id" uuid,
        "type" "public"."credit_tx_type_enum" NOT NULL,
        "reason" "public"."credit_tx_reason_enum" NOT NULL,
        "delta" bigint NOT NULL,
        "balance_after" bigint NOT NULL,
        "reference_type" varchar(50),
        "reference_id" varchar(255),
        "description" varchar(500),
        "created_by_admin_id" uuid,
        "created_by_user_id" uuid,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_credit_transactions" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_credit_tx_account" ON "credit_transactions" ("account_type","account_id","created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_credit_tx_user" ON "credit_transactions" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_credit_tx_enterprise" ON "credit_transactions" ("enterprise_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_credit_tx_reference" ON "credit_transactions" ("reference_type","reference_id")`,
    );

    // ---- email_lists: track credit reservation against bulk jobs ----
    // Used to reconcile refunds on partial failure / cancellation.
    await queryRunner.query(
      `ALTER TABLE "email_lists" ADD "credits_reserved" bigint NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "email_lists" ADD "credits_consumed" bigint NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "email_lists" ADD "credits_refunded" bigint NOT NULL DEFAULT 0`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "email_lists" DROP COLUMN "credits_refunded"`,
    );
    await queryRunner.query(
      `ALTER TABLE "email_lists" DROP COLUMN "credits_consumed"`,
    );
    await queryRunner.query(
      `ALTER TABLE "email_lists" DROP COLUMN "credits_reserved"`,
    );

    await queryRunner.query(`DROP INDEX "public"."idx_credit_tx_reference"`);
    await queryRunner.query(`DROP INDEX "public"."idx_credit_tx_enterprise"`);
    await queryRunner.query(`DROP INDEX "public"."idx_credit_tx_user"`);
    await queryRunner.query(`DROP INDEX "public"."idx_credit_tx_account"`);
    await queryRunner.query(`DROP TABLE "credit_transactions"`);

    await queryRunner.query(`DROP INDEX "public"."idx_users_enterprise"`);
    await queryRunner.query(`DROP INDEX "public"."idx_users_role"`);
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "fk_users_enterprise"`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "credits_used"`);
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "credit_balance"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "created_by_user_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "created_by_admin_id"`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "enterprise_id"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "role"`);

    await queryRunner.query(`DROP INDEX "public"."idx_enterprises_active"`);
    await queryRunner.query(`DROP TABLE "enterprises"`);

    await queryRunner.query(`DROP TYPE "public"."credit_tx_reason_enum"`);
    await queryRunner.query(`DROP TYPE "public"."credit_tx_type_enum"`);
    await queryRunner.query(`DROP TYPE "public"."credit_account_type_enum"`);
    await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
  }
}
