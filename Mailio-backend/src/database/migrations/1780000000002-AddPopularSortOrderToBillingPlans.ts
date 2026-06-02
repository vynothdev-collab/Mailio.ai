import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPopularSortOrderToBillingPlans1780000000002
  implements MigrationInterface
{
  name = 'AddPopularSortOrderToBillingPlans1780000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "billing_plans" ADD COLUMN IF NOT EXISTS "is_popular" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "billing_plans" ADD COLUMN IF NOT EXISTS "sort_order" integer NOT NULL DEFAULT 0`,
    );
    // Ensure only one popular plan per type at the DB level via a partial unique index
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_billing_plans_one_popular_per_type"
        ON "billing_plans" ("plan_type")
        WHERE "is_popular" = true
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_billing_plans_one_popular_per_type"`,
    );
    await queryRunner.query(
      `ALTER TABLE "billing_plans" DROP COLUMN IF EXISTS "sort_order"`,
    );
    await queryRunner.query(
      `ALTER TABLE "billing_plans" DROP COLUMN IF EXISTS "is_popular"`,
    );
  }
}
