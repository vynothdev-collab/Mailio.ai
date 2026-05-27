import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminActivityLogsController } from './admin-activity-logs.controller';
import { AdminActivityLogsService } from './admin-activity-logs.service';
import { AdminActivityLog } from './entities/admin-activity-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AdminActivityLog])],
  controllers: [AdminActivityLogsController],
  providers: [AdminActivityLogsService],
  exports: [AdminActivityLogsService],
})
export class AdminActivityLogsModule {}
