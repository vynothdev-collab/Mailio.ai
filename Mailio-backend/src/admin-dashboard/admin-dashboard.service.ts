import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Email } from '../emails/entities/email.entity';
import { User } from '../users/entities/user.entity';
import { MoreThanOrEqual, Repository } from 'typeorm';

type DateRange = { from: Date; to: Date };

function buildRange(period: string, from?: string, to?: string): DateRange {
  const now = new Date();
  if (period === 'today') {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return { from: start, to: now };
  }
  if (period === '30d') {
    const start = new Date(now);
    start.setDate(start.getDate() - 30);
    return { from: start, to: now };
  }
  if (period === 'custom' && from && to) {
    return { from: new Date(from), to: new Date(to) };
  }
  // default: last 7 days
  const start = new Date(now);
  start.setDate(start.getDate() - 7);
  return { from: start, to: now };
}

@Injectable()
export class AdminDashboardService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Email)
    private readonly emailRepo: Repository<Email>,
  ) {}

  async getOverview(period = '7d', from?: string, to?: string) {
    const range = buildRange(period, from, to);

    const [
      totalUsers,
      activeUsers,
      todaySignups,
      proUsers,
      ultimateUsers,
      verificationStats,
      dailyTrend,
      recentUsers,
    ] = await Promise.all([
      this.userRepo.count(),
      this.userRepo.count({ where: { isActive: true } }),
      this.getTodaySignups(),
      this.userRepo.count({ where: { plan: 'PRO' as any } }),
      this.userRepo.count({ where: { plan: 'ULTIMATE' as any } }),
      this.getVerificationStats(range),
      this.getDailyTrend(range),
      this.getRecentUsers(),
    ]);

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        todaySignups,
        byPlan: { PRO: proUsers, ULTIMATE: ultimateUsers },
      },
      verifications: verificationStats,
      dailyTrend,
      recentUsers,
    };
  }

  private async getTodaySignups(): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.userRepo.count({
      where: { createdAt: MoreThanOrEqual(today) },
    });
  }

  private async getVerificationStats(range: DateRange) {
    const rows = await this.emailRepo.manager.query<
      Array<{
        total: string;
        valid: string;
        invalid: string;
        risky: string;
      }>
    >(
      `SELECT
        COUNT(*)                                                    AS total,
        COUNT(*) FILTER (WHERE verification_result = 'VALID')      AS valid,
        COUNT(*) FILTER (WHERE verification_result = 'INVALID')    AS invalid,
        COUNT(*) FILTER (WHERE verification_result = 'RISKY')      AS risky
      FROM emails
      WHERE is_deleted = FALSE
        AND created_at BETWEEN $1 AND $2`,
      [range.from, range.to],
    );

    const r = rows[0] ?? { total: '0', valid: '0', invalid: '0', risky: '0' };
    const total = parseInt(r.total, 10);
    const valid = parseInt(r.valid, 10);
    const invalid = parseInt(r.invalid, 10);
    const risky = parseInt(r.risky, 10);

    return {
      total,
      valid,
      invalid,
      risky,
      validRate: total > 0 ? +((valid / total) * 100).toFixed(1) : 0,
      invalidRate: total > 0 ? +((invalid / total) * 100).toFixed(1) : 0,
      riskyRate: total > 0 ? +((risky / total) * 100).toFixed(1) : 0,
    };
  }

  private async getDailyTrend(range: DateRange) {
    const rows = await this.emailRepo.manager.query<
      Array<{
        day: Date | string;
        total: string;
        valid: string;
        invalid: string;
        risky: string;
      }>
    >(
      `SELECT
        DATE_TRUNC('day', created_at)                              AS day,
        COUNT(*)                                                   AS total,
        COUNT(*) FILTER (WHERE verification_result = 'VALID')     AS valid,
        COUNT(*) FILTER (WHERE verification_result = 'INVALID')   AS invalid,
        COUNT(*) FILTER (WHERE verification_result = 'RISKY')     AS risky
      FROM emails
      WHERE is_deleted = FALSE
        AND created_at BETWEEN $1 AND $2
      GROUP BY DATE_TRUNC('day', created_at)
      ORDER BY DATE_TRUNC('day', created_at) ASC`,
      [range.from, range.to],
    );

    return rows.map((r) => ({
      date:
        r.day instanceof Date
          ? r.day.toISOString().split('T')[0]
          : String(r.day).split('T')[0],
      total: parseInt(r.total as string, 10),
      valid: parseInt(r.valid as string, 10),
      invalid: parseInt(r.invalid as string, 10),
      risky: parseInt(r.risky as string, 10),
    }));
  }

  private async getRecentUsers() {
    return this.userRepo.find({
      select: ['id', 'name', 'email', 'plan', 'isActive', 'createdAt'],
      order: { createdAt: 'DESC' },
      take: 10,
    });
  }
}
