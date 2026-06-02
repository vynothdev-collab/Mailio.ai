import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BillingPlan, BillingPlanType } from './entities/billing-plan.entity';
import { CreateBillingPlanDto } from './dto/create-billing-plan.dto';
import { UpdateBillingPlanDto } from './dto/update-billing-plan.dto';

@Injectable()
export class AdminBillingPlansService {
  constructor(
    @InjectRepository(BillingPlan)
    private readonly repo: Repository<BillingPlan>,
  ) {}

  async findAll(): Promise<BillingPlan[]> {
    return this.repo.find({ order: { sortOrder: 'ASC', createdAt: 'DESC' } });
  }

  async create(
    dto: CreateBillingPlanDto,
    adminId: string,
  ): Promise<BillingPlan> {
    if (dto.isPopular) {
      await this.clearPopularForType(dto.planType);
    }
    const plan = this.repo.create({
      ...dto,
      currency: dto.currency ?? 'INR',
      features: dto.features ?? [],
      isActive: dto.isActive ?? true,
      isPopular: dto.isPopular ?? false,
      sortOrder: dto.sortOrder ?? 0,
      createdByAdminId: adminId,
    });
    return this.repo.save(plan);
  }

  async update(id: string, dto: UpdateBillingPlanDto): Promise<BillingPlan> {
    const plan = await this.repo.findOne({ where: { id } });
    if (!plan) throw new NotFoundException('Plan not found');

    if (dto.isPopular && !plan.isPopular) {
      const type = dto.planType ?? plan.planType;
      await this.clearPopularForType(type);
    }

    Object.assign(plan, dto);
    return this.repo.save(plan);
  }

  async setPopular(id: string): Promise<BillingPlan> {
    const plan = await this.repo.findOne({ where: { id } });
    if (!plan) throw new NotFoundException('Plan not found');

    await this.clearPopularForType(plan.planType);
    plan.isPopular = true;
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

  private async clearPopularForType(planType: BillingPlanType): Promise<void> {
    await this.repo.update({ planType, isPopular: true }, { isPopular: false });
  }
}
