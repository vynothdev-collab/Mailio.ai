import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../users/entities/user.entity';
import { DataScopeService } from './data-scope.service';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [DataScopeService],
  exports: [DataScopeService],
})
export class DataScopeModule {}
