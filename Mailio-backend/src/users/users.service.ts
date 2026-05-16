import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

export interface UserStats {
  totalEmails: number;
  validCount: number;
  invalidCount: number;
  riskyCount: number;
  unknownCount: number;
  listsCount: number;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepo.findOne({ where: { email } });
  }

  async findById(id: string): Promise<User | null> {
    return this.usersRepo.findOne({ where: { id } });
  }

  async create(data: {
    email: string;
    passwordHash: string;
    name: string;
  }): Promise<User> {
    const existing = await this.findByEmail(data.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }
    const user = this.usersRepo.create(data);
    return this.usersRepo.save(user);
  }

  async getStats(userId: string): Promise<UserStats> {
    const result = await this.usersRepo.manager.query(
      `SELECT
         COUNT(e.id)::int                                              AS "totalEmails",
         COUNT(e.id) FILTER (WHERE e.verification_result = 'VALID')::int    AS "validCount",
         COUNT(e.id) FILTER (WHERE e.verification_result = 'INVALID')::int  AS "invalidCount",
         COUNT(e.id) FILTER (WHERE e.verification_result = 'RISKY')::int    AS "riskyCount",
         COUNT(e.id) FILTER (WHERE e.verification_result = 'UNKNOWN')::int  AS "unknownCount",
         COUNT(DISTINCT el.id)::int                                   AS "listsCount"
       FROM users u
       LEFT JOIN emails e  ON e.user_id = u.id
       LEFT JOIN email_lists el ON el.user_id = u.id
       WHERE u.id = $1`,
      [userId],
    );
    return result[0] as UserStats;
  }
}
