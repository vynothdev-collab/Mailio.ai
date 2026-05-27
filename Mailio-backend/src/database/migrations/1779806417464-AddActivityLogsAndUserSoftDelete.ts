import { MigrationInterface, QueryRunner } from "typeorm";

export class AddActivityLogsAndUserSoftDelete1779806417464 implements MigrationInterface {
    name = 'AddActivityLogsAndUserSoftDelete1779806417464'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."admin_activity_logs_type_enum" AS ENUM('SINGLE_USER', 'SYSTEM')`);
        await queryRunner.query(`CREATE TABLE "admin_activity_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "type" "public"."admin_activity_logs_type_enum" NOT NULL DEFAULT 'SINGLE_USER', "module" character varying(100) NOT NULL, "action" character varying(100) NOT NULL, "target_id" uuid, "target_name" character varying(255), "changed_by_admin_id" uuid NOT NULL, "changed_by_admin_name" character varying(255) NOT NULL, "oldValue" jsonb, "newValue" jsonb, "ip_address" character varying(64), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_5038e337eb909194ee0203d90de" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_aal_admin" ON "admin_activity_logs" ("changed_by_admin_id") `);
        await queryRunner.query(`CREATE INDEX "idx_aal_type_created" ON "admin_activity_logs" ("type", "created_at") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."idx_aal_type_created"`);
        await queryRunner.query(`DROP INDEX "public"."idx_aal_admin"`);
        await queryRunner.query(`DROP TABLE "admin_activity_logs"`);
        await queryRunner.query(`DROP TYPE "public"."admin_activity_logs_type_enum"`);
    }

}
