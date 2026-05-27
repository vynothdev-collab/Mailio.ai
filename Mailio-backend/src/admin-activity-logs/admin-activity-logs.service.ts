import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, ILike, Repository } from 'typeorm';
import {
  AdminActivityLog,
  LogType,
} from './entities/admin-activity-log.entity';

export interface LogPayload {
  type?: LogType;
  module: string;
  action: string;
  targetId?: string;
  targetName?: string;
  changedByAdminId: string;
  changedByAdminName: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  ipAddress?: string;
}

export interface QueryLogsOptions {
  type?: LogType;
  module?: string;
  search?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class AdminActivityLogsService {
  constructor(
    @InjectRepository(AdminActivityLog)
    private readonly logRepo: Repository<AdminActivityLog>,
  ) {}

  async log(payload: LogPayload): Promise<void> {
    const entry = this.logRepo.create({
      type: payload.type ?? LogType.SINGLE_USER,
      module: payload.module,
      action: payload.action,
      targetId: payload.targetId ?? null,
      targetName: payload.targetName ?? null,
      changedByAdminId: payload.changedByAdminId,
      changedByAdminName: payload.changedByAdminName,
      oldValue: payload.oldValue ?? null,
      newValue: payload.newValue ?? null,
      ipAddress: payload.ipAddress ?? null,
    });
    await this.logRepo.save(entry);
  }

  async findAll(opts: QueryLogsOptions) {
    const page = Math.max(opts.page ?? 1, 1);
    const limit = Math.min(opts.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (opts.type) where.type = opts.type;
    if (opts.module) where.module = opts.module;
    if (opts.from && opts.to) {
      where.createdAt = Between(new Date(opts.from), new Date(opts.to));
    }
    if (opts.search) {
      where.targetName = ILike(`%${opts.search}%`);
    }

    const [data, total] = await this.logRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return { data, total, page, limit };
  }

  async getModules(): Promise<string[]> {
    const rows = await this.logRepo
      .createQueryBuilder('l')
      .select('DISTINCT l.module', 'module')
      .getRawMany<{ module: string }>();
    return rows.map((r) => r.module);
  }
}
