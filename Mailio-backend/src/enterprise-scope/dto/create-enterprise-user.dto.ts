import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length } from 'class-validator';

/**
 * DTO for Enterprise Admin creating a user inside their own enterprise.
 *
 * Notes:
 * - `role` is implicit (always ENTERPRISE_USER). Enterprise Admins cannot
 *   create other Enterprise Admins or Super Admins.
 * - `enterpriseId` is derived from the authenticated admin's own
 *   `enterpriseId` — it is never accepted from the request body.
 * - No `initialCredits` field — enterprise members share the enterprise
 *   balance; only Super Admins can top up the enterprise.
 */
export class CreateEnterpriseUserDto {
  @ApiProperty({ example: 'Carol Member' })
  @IsString()
  @Length(2, 255)
  name!: string;

  @ApiProperty({ example: 'carol@acme.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ description: 'Initial password (>= 8 chars)' })
  @IsString()
  @Length(8, 128)
  password!: string;
}
