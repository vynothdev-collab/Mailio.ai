import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VerificationResult } from '../common/types/verification-result.enum';
import {
  EmailList,
  EmailListStatus,
} from '../email-lists/entities/email-list.entity';
import { Email, EmailStatus } from '../emails/entities/email.entity';

export type ResultStatus = 'all' | 'valid' | 'invalid' | 'risky';
export type ResultType   = 'all' | 'single' | 'bulk';
export type RowStatus    = 'valid' | 'invalid' | 'risky';
export type RiskLevel    = 'low' | 'medium' | 'high' | null;

export interface BulkJobSummary {
  jobId:       string;
  fileName:    string;
  status:      'pending' | 'processing' | 'completed' | 'failed';
  totalEmails: number;
  valid:       number;
  invalid:     number;
  risky:       number;
  unknown:     number;
  disposable:  number;
  createdAt:   string;
  completedAt: string | null;
}

export interface ResultRow {
  id:         string;
  type:       'single' | 'bulk';
  label:      string;
  status:     RowStatus;
  risk:       RiskLevel;
  verifiedAt: string;
  bulkJob?:   BulkJobSummary;
}

@Injectable()
export class ResultsService {
  constructor(
    @InjectRepository(Email)
    private readonly emailsRepo: Repository<Email>,
    @InjectRepository(EmailList)
    private readonly listsRepo: Repository<EmailList>,
  ) {}

  /**
   * Single endpoint that powers the Results page:
   *   - aggregate stats (Total / Valid / Invalid / Risky) — full dataset,
   *     unaffected by filters so the user always sees an overview at the top
   *   - paginated rows after applying type / status / search filters
   *
   * Single verifications and bulk jobs are merged into one stream and sorted
   * by verifiedAt DESC, so a single page can mix both row kinds.
   */
  async getResults(
    userId: string,
    page: number,
    limit: number,
    type: ResultType,
    status: ResultStatus,
    query?: string,
  ) {
    const wantSingles = type !== 'bulk';
    const wantBulks   = type !== 'single';

    const [singleEmails, bulkLists] = await Promise.all([
      wantSingles
        ? this.emailsRepo.find({
            where: { userId, isSingleVerify: true, status: EmailStatus.COMPLETED },
            order: { processedAt: 'DESC' },
            take: 500,
          })
        : Promise.resolve([]),
      wantBulks
        ? this.listsRepo.find({
            where: { userId },
            order: { createdAt: 'DESC' },
            take: 500,
          })
        : Promise.resolve([]),
    ]);

    const singleRows: ResultRow[] = singleEmails.map((e) => ({
      id:         `single-${e.id}`,
      type:       'single',
      label:      e.address,
      status:     this.mapEmailStatus(e.verificationResult),
      risk:       this.toRisk(e.verificationResult),
      verifiedAt: (e.processedAt ?? e.createdAt).toISOString(),
    }));

    const bulkRows: ResultRow[] = bulkLists.map((l) => ({
      id:         `bulk-${l.id}`,
      type:       'bulk',
      label:      l.originalFilename ?? l.name,
      status:     this.mapBulkStatus(l.status),
      risk:       null,
      verifiedAt: (l.updatedAt ?? l.createdAt).toISOString(),
      bulkJob: {
        jobId:       l.id,
        fileName:    l.originalFilename ?? l.name,
        status:      l.status.toLowerCase() as BulkJobSummary['status'],
        totalEmails: l.totalCount,
        valid:       l.validCount,
        invalid:     l.invalidCount,
        risky:       l.riskyCount,
        unknown:     l.unknownCount,
        disposable:  l.disposableCount,
        createdAt:   l.createdAt.toISOString(),
        completedAt: l.status === EmailListStatus.COMPLETED
          ? l.updatedAt.toISOString()
          : null,
      },
    }));

    const merged = [...singleRows, ...bulkRows].sort(
      (a, b) =>
        new Date(b.verifiedAt).getTime() - new Date(a.verifiedAt).getTime(),
    );

    // Stats sum actual email counts across BOTH sources:
    //   - each single verification = 1 email
    //   - each bulk list contributes its valid/invalid/risky/unknown counts
    // This way "Total Verified" reflects every address    the user has
    // verified, not just the number of rows shown in the table.
    let valid   = singleEmails.filter((e) => e.verificationResult === VerificationResult.VALID).length;
    let invalid = singleEmails.filter((e) => e.verificationResult === VerificationResult.INVALID).length;
    let risky   = singleEmails.filter(
      (e) =>
        e.verificationResult === VerificationResult.RISKY ||
        e.verificationResult === VerificationResult.UNKNOWN,
    ).length;

    for (const l of bulkLists) {
      valid   += l.validCount;
      invalid += l.invalidCount;
      // Risky tile rolls up RISKY + UNKNOWN buckets from bulk lists for
      // consistency with how singles are bucketed above.
      risky   += l.riskyCount + l.unknownCount;
    }

    const stats = {
      total:   valid + invalid + risky,
      valid,
      invalid,
      risky,
    };

    // Apply filters server-side. For bulk rows, status filter matches when
    // the JOB CONTAINS at least one email of that status (not just when the
    // job's overall row status equals the filter) — so a completed bulk
    // with risky emails inside still appears under the "Risky" filter.
    const q = (query ?? '').trim().toLowerCase();
    const filtered = merged.filter((r) => {
      if (status !== 'all') {
        if (r.type === 'single') {
          if (r.status !== status) return false;
        } else {
          const job = r.bulkJob!;
          const matches =
            (status === 'valid'   && job.valid   > 0) ||
            (status === 'invalid' && job.invalid > 0) ||
            (status === 'risky'   && (job.risky + job.unknown > 0
                                       || job.status === 'pending'
                                       || job.status === 'processing'));
          if (!matches) return false;
        }
      }
      if (q && !r.label.toLowerCase().includes(q)) return false;
      return true;
    });

    const total = filtered.length;
    const start = (page - 1) * limit;
    const data  = filtered.slice(start, start + limit);

    return { data, total, page, limit, stats };
  }

  // ── Helpers ────────────────────────────────────────────────────────────

  private mapEmailStatus(r: VerificationResult | null): RowStatus {
    if (r === VerificationResult.VALID)   return 'valid';
    if (r === VerificationResult.INVALID) return 'invalid';
    return 'risky'; // RISKY + UNKNOWN both surface as risky
  }

  private toRisk(r: VerificationResult | null): RiskLevel {
    if (r === VerificationResult.VALID)   return 'low';
    if (r === VerificationResult.RISKY)   return 'medium';
    if (r === VerificationResult.INVALID) return 'high';
    return null;
  }

  private mapBulkStatus(s: EmailListStatus): RowStatus {
    if (s === EmailListStatus.COMPLETED) return 'valid';
    if (s === EmailListStatus.FAILED)    return 'invalid';
    return 'risky'; // PENDING + PROCESSING
  }
}
