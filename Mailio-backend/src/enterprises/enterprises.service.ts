import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Enterprise } from './entities/enterprise.entity';

@Injectable()
export class EnterprisesService {
  constructor(
    @InjectRepository(Enterprise)
    private readonly enterprisesRepo: Repository<Enterprise>,
  ) {}

  async findById(id: string): Promise<Enterprise | null> {
    return this.enterprisesRepo.findOne({
      where: { id, deletedAt: IsNull() },
    });
  }

  async getByIdOrFail(id: string): Promise<Enterprise> {
    const e = await this.findById(id);
    if (!e) throw new NotFoundException('Enterprise not found');
    return e;
  }
}
