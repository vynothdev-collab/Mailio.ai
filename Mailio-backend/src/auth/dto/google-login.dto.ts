import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class GoogleLoginDto {
  @ApiProperty({
    description: 'Google ID token returned by Google Identity Services',
  })
  @IsString()
  @IsNotEmpty()
  idToken!: string;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  remember?: boolean;
}
