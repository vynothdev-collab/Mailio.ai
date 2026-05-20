import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';

export class LinkedinLoginDto {
  @ApiProperty({ description: 'Authorization code returned by LinkedIn' })
  @IsString()
  @IsNotEmpty()
  code!: string;

  @ApiProperty({
    description:
      'The exact redirect_uri used to obtain the authorization code (must match LinkedIn app config)',
    example: 'https://app.example.com/auth/linkedin/callback',
  })
  @IsString()
  @IsNotEmpty()
  @IsUrl({ require_tld: false, require_protocol: true })
  redirectUri!: string;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  remember?: boolean;
}
