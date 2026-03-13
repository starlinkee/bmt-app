type TenantForMatching = {
  id: number;
  firstName: string;
  lastName: string;
  bankAccountsAsText: string;
};

function normalizeAccount(account: string): string {
  // Remove all whitespace, dashes, and leading country code
  return account.replace(/[\s\-]/g, "").replace(/^PL/i, "");
}

function extractAccounts(bankAccountsAsText: string): string[] {
  if (!bankAccountsAsText || bankAccountsAsText.trim() === "") return [];

  return bankAccountsAsText
    .split(/[\n,;]+/)
    .map((a) => normalizeAccount(a.trim()))
    .filter((a) => a.length > 0);
}

export type MatchResult = {
  tenantId: number | null;
  tenantName: string | null;
};

export function matchTransaction(
  bankAccount: string,
  tenants: TenantForMatching[]
): MatchResult {
  if (!bankAccount || bankAccount.trim() === "") {
    return { tenantId: null, tenantName: null };
  }

  const normalizedInput = normalizeAccount(bankAccount);
  if (normalizedInput.length === 0) {
    return { tenantId: null, tenantName: null };
  }

  for (const tenant of tenants) {
    const accounts = extractAccounts(tenant.bankAccountsAsText);
    for (const account of accounts) {
      // Exact match or suffix match (some banks return partial account numbers)
      if (
        account === normalizedInput ||
        normalizedInput.endsWith(account) ||
        account.endsWith(normalizedInput)
      ) {
        return {
          tenantId: tenant.id,
          tenantName: `${tenant.firstName} ${tenant.lastName}`,
        };
      }
    }
  }

  return { tenantId: null, tenantName: null };
}

export function matchAllTransactions(
  transactions: { bankAccount: string }[],
  tenants: TenantForMatching[]
): MatchResult[] {
  return transactions.map((tx) => matchTransaction(tx.bankAccount, tenants));
}
