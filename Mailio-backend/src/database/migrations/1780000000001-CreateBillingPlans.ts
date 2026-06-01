import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBillingPlans1780000000001 implements MigrationInterface {
  name = 'CreateBillingPlans1780000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."billing_plan_type_enum" AS ENUM('USER','ENTERPRISE')`,
    );

    await queryRunner.query(`
      CREATE TABLE "billing_plans" (
        "id"                  uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name"                varchar(100) NOT NULL,
        "plan_type"           "public"."billing_plan_type_enum" NOT NULL,
        "price"               integer NOT NULL DEFAULT 0,
        "currency"            varchar(10) NOT NULL DEFAULT 'INR',
        "credits"             integer NOT NULL,
        "validity_days"       integer NOT NULL,
        "features"            text,
        "is_active"           boolean NOT NULL DEFAULT true,
        "created_by_admin_id" uuid,
        "created_at"          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at"          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_billing_plans" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "idx_billing_plans_active_type" ON "billing_plans" ("is_active", "plan_type")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_billing_plans_active_type"`);
    await queryRunner.query(`DROP TABLE "billing_plans"`);
    await queryRunner.query(`DROP TYPE "public"."billing_plan_type_enum"`);
  }
}
