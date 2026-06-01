import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BillingPlan } from './entities/billing-plan.entity';
import { CreateBillingPlanDto } from './dto/create-billing-plan.dto';

@Injectable()
export class AdminBillingPlansService {
  constructor(
    @InjectRepository(BillingPlan)
    private readonly repo: Repository<BillingPlan>,
  ) {}

  async findAll(): Promise<BillingPlan[]> {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  async create(dto: CreateBillingPlanDto, adminId: string): Promise<BillingPlan> {
    const plan = this.repo.create({
      ...dto,
      currency: dto.currency ?? 'INR',
      features: dto.features ?? [],
      isActive: dto.isActive ?? true,
      createdByAdminId: adminId,
    });
    return this.repo.save(plan);
  }

  async delete(id: string): Promise<{ success: boolean }> {
    const plan = await this.repo.findOne({ where: { id } });
    if (!plan) throw new NotFoundException('Plan not found');
    await this.repo.remove(plan);
    return { success: true };
  }

  async toggleActive(id: string): Promise<BillingPlan> {
    const plan = await this.repo.findOne({ where: { id } });
    if (!plan) throw new NotFoundException('Plan not found');
    plan.isActive = !plan.isActive;
    return this.repo.save(plan);
  }
}
