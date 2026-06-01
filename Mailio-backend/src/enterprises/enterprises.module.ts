import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Enterprise } from './entities/enterprise.entity';
import { EnterprisesService } from './enterprises.service';

@Module({
  imports: [TypeOrmModule.forFeature([Enterprise])],
  providers: [EnterprisesService],
  exports: [EnterprisesService, TypeOrmModule],
})
export class EnterprisesModule {}
