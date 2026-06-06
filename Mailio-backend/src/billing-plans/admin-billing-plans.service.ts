import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import {
  BillingPlan,
  BillingPlanType,
  PlanCategory,
} from './entities/billing-plan.entity';
import { CreateBillingPlanDto } from './dto/create-billing-plan.dto';
import { UpdateBillingPlanDto } from './dto/update-billing-plan.dto';

@Injectable()
export class AdminBillingPlansService {
  constructor(
    @InjectRepository(BillingPlan)
    private readonly repo: Repository<BillingPlan>,
  ) {}

  async findAll(): Promise<BillingPlan[]> {
    return this.repo.find({
      withDeleted: true,
      order: { sortOrder: 'ASC', createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<BillingPlan> {
    const plan = await this.repo.findOne({ where: { id }, withDeleted: true });
    if (!plan) throw new NotFoundException('Plan not found');
    return plan;
  }

  async create(
    dto: CreateBillingPlanDto,
    adminId: string,
  ): Promise<BillingPlan> {
    const category = dto.planCategory ?? PlanCategory.VALIDITY_BASED;

    if (category === PlanCategory.VALIDITY_BASED) {
      if (!dto.validityDays || dto.validityDays <= 0) {
        throw new BadRequestException(
          'Validity-based plans require validityDays > 0.',
        );
      }
    }
    if ((dto.credits ?? 0) <= 0) {
      throw new BadRequestException('Plan credits must be > 0.');
    }

    if (dto.isPopular) {
      await this.clearPopularForType(dto.planType);
    }
    const plan = this.repo.create({
      ...dto,
      planCategory: category,
      validityDays:
        category === PlanCategory.TOPUP ? null : (dto.validityDays ?? null),
      description: dto.description ?? null,
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
    const plan = await this.repo.findOne({ where: { id }, withDeleted: true });
    if (!plan) throw new NotFoundException('Plan not found');

    const nextCategory = dto.planCategory ?? plan.planCategory;
    if (nextCategory === PlanCategory.VALIDITY_BASED) {
      const days = dto.validityDays ?? plan.validityDays;
      if (!days || days <= 0) {
        throw new BadRequestException(
          'Validity-based plans require validityDays > 0.',
        );
      }
    }

    if (dto.isPopular && !plan.isPopular) {
      const type = dto.planType ?? plan.planType;
      await this.clearPopularForType(type);
    }

    Object.assign(plan, dto);
    if (nextCategory === PlanCategory.TOPUP) plan.validityDays = null;
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
    if (!plan) throw new NotFoundException('Plan not found or already deleted');
    await this.repo.softRemove(plan);
    return { success: true };
  }

  async restore(id: string): Promise<BillingPlan> {
    const plan = await this.repo.findOne({ where: { id }, withDeleted: true });
    if (!plan) throw new NotFoundException('Plan not found');
    if (!plan.deletedAt) return plan;
    await this.repo.restore(id);
    return this.findOne(id);
  }

  async toggleActive(id: string): Promise<BillingPlan> {
    const plan = await this.repo.findOne({ where: { id } });
    if (!plan) throw new NotFoundException('Plan not found');
    plan.isActive = !plan.isActive;
    return this.repo.save(plan);
  }

  private async clearPopularForType(planType: BillingPlanType): Promise<void> {
    await this.repo.update(
      { planType, isPopular: true, deletedAt: IsNull() },
      { isPopular: false },
    );
  }
}
