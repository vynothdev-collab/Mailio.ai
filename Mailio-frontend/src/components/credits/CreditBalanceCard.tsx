"use client";

import { useCurrentUser } from "@/src/hooks/useCurrentUser";

interface CreditBalanceCardProps {
  /** Optional small footnote — e.g. "Contact admin for more credits". */
  footnote?: string;
  className?: string;
}

function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}

/**
 * Single source of truth for displaying the credit balance in the user app.
 *
 * - Normal users see "My Credits" — their own balance + lifetime used.
 * - Enterprise members (ENTERPRISE_USER, ENTERPRISE_ADMIN) see
 *   "Enterprise Shared Credits" — the enterprise's balance + used, with
 *   the enterprise name as the label sub-line.
 */
export function CreditBalanceCard({ footnote, className }: CreditBalanceCardProps) {
  const { user, isEnterpriseMember } = useCurrentUser();
  if (!user) return null;

  const showEnterprise = isEnterpriseMember && user.enterprise;
  const title = showEnterprise ? "Enterprise Shared Credits" : "My Credits";
  const subline = showEnterprise ? user.enterprise!.name : null;
  const balance = showEnterprise
    ? user.enterprise!.creditBalance
    : user.creditBalance;
  const used = showEnterprise
    ? user.enterprise!.creditsUsed
    : user.creditsUsed;

  return (
    <div
      className={
        "rounded-xl border border-gray-200 bg-white p-5 shadow-sm " +
        (className ?? "")
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
            {title}
          </p>
          {subline ? (
            <p className="mt-0.5 text-xs text-gray-500">{subline}</p>
          ) : null}
        </div>
        {showEnterprise ? (
          <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-blue-700">
            Shared
          </span>
        ) : null}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-gray-500">Balance</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">
            {formatNumber(balance)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Used</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">
            {formatNumber(used)}
          </p>
        </div>
      </div>

      {footnote ? (
        <p className="mt-3 text-xs text-gray-500">{footnote}</p>
      ) : null}
    </div>
  );
}
