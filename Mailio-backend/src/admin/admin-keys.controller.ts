import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiKey, ApiKeyStatus } from '../providers/entities/api-key.entity';
import { KeyPoolSync } from '../providers/key-pool.sync';
import { CreateApiKeyDto, UpdateApiKeyDto } from './dto/create-api-key.dto';

@Controller('admin/keys')
export class AdminKeysController {
  constructor(
    @InjectRepository(ApiKey)
    private readonly repo: Repository<ApiKey>,
    private readonly sync: KeyPoolSync,
  ) {}

  @Get()
  async list(@Query('provider') provider?: string) {
    const where = provider ? { provider } : {};
    const rows = await this.repo.find({
      where,
      order: { provider: 'ASC', createdAt: 'ASC' },
    });
    return rows.map((r) => this.redact(r));
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) throw new NotFoundException();
    return this.redact(row);
  }

  @Post()
  async create(@Body() dto: CreateApiKeyDto) {
    const row = this.repo.create({
      provider: dto.provider,
      keyValue: dto.keyValue,
      label: dto.label ?? null,
      status: dto.status ?? ApiKeyStatus.ACTIVE,
      weight: dto.weight ?? 1,
      rlMax: dto.rlMax,
      rlWindowMs: dto.rlWindowMs,
      monthlyQuota:
        dto.monthlyQuota !== undefined ? String(dto.monthlyQuota) : null,
    });
    const saved = await this.repo.save(row);
    await this.sync.reloadAll(dto.provider);
    await this.sync.publish({ type: 'added', keyId: saved.id });
    return this.redact(saved);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateApiKeyDto,
  ) {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) throw new NotFoundException();

    Object.assign(row, {
      ...(dto.label !== undefined && { label: dto.label }),
      ...(dto.status !== undefined && { status: dto.status }),
      ...(dto.weight !== undefined && { weight: dto.weight }),
      ...(dto.rlMax !== undefined && { rlMax: dto.rlMax }),
      ...(dto.rlWindowMs !== undefined && { rlWindowMs: dto.rlWindowMs }),
      ...(dto.monthlyQuota !== undefined && {
        monthlyQuota: String(dto.monthlyQuota),
      }),
    });
    // Clearing a cooldown explicitly: setting status back to ACTIVE wipes
    // the timer so operators can manually un-cooldown a key.
    if (dto.status === ApiKeyStatus.ACTIVE) {
      row.cooldownUntil = null;
      row.failureCount = 0;
    }

    const saved = await this.repo.save(row);
    await this.sync.reloadAll(saved.provider);
    await this.sync.publish({ type: 'updated', keyId: saved.id });
    return this.redact(saved);
  }

  /** Soft-delete: flip to DISABLED so audit history is preserved. */
  @Delete(':id')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) throw new NotFoundException();
    row.status = ApiKeyStatus.DISABLED;
    await this.repo.save(row);
    await this.sync.reloadAll(row.provider);
    await this.sync.publish({ type: 'removed', keyId: row.id });
    return { id: row.id, status: row.status };
  }

  private redact(row: ApiKey) {
    return {
      id: row.id,
      provider: row.provider,
      label: row.label,
      keyPreview: row.keyValue.slice(0, 6) + '…',
      status: row.status,
      weight: row.weight,
      rlMax: row.rlMax,
      rlWindowMs: row.rlWindowMs,
      monthlyQuota: row.monthlyQuota,
      monthlyUsed: row.monthlyUsed,
      cooldownUntil: row.cooldownUntil,
      failureCount: row.failureCount,
      lastError: row.lastError,
      lastUsedAt: row.lastUsedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
