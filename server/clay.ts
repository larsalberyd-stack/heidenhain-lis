import { ENV } from "./_core/env";

export interface BatchCompany {
  id: number;
  name: string;
  domain: string;
  category?: string;
  city?: string;
  country?: string;
  focus?: string;
}

export interface BatchResult {
  companyId: number;
  companyName: string;
  success: boolean;
  error?: string;
}

export interface SyncProgress {
  status: "idle" | "pushing" | "done" | "error";
  totalCompanies: number;
  processedCompanies: number;
  currentBatch: number;
  totalBatches: number;
  results: BatchResult[];
  errorMessage?: string;
}

// In-memory sync state (single-instance server)
let currentSync: SyncProgress = {
  status: "idle",
  totalCompanies: 0,
  processedCompanies: 0,
  currentBatch: 0,
  totalBatches: 0,
  results: [],
};

export function getSyncProgress(): SyncProgress {
  return { ...currentSync };
}

export function resetSyncProgress(): void {
  currentSync = {
    status: "idle",
    totalCompanies: 0,
    processedCompanies: 0,
    currentBatch: 0,
    totalBatches: 0,
    results: [],
  };
}

/**
 * Test Clay webhook connection by sending a test payload
 */
export async function testClayConnection(): Promise<boolean> {
  try {
    const response = await fetch(ENV.clayWebhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${ENV.clayApiKey}`,
      },
      body: JSON.stringify({ _test: true, _source: "heidenhain-lis" }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Push a single company to Clay via webhook
 */
async function pushCompanyToClay(company: BatchCompany): Promise<void> {
  const response = await fetch(ENV.clayWebhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${ENV.clayApiKey}`,
    },
    body: JSON.stringify({
      company_name: company.name,
      company_domain: company.domain,
      category: company.category || "",
      city: company.city || "",
      country: company.country || "",
      focus: company.focus || "",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Clay webhook error: ${response.status} - ${error}`);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Push companies to Clay via webhook in batches of 24 with 30s pause.
 * 24 companies × 3 contacts = 72 contact rows per batch (Clay limit).
 * Clay auto-enriches (Find People) when rows are added via webhook.
 */
export async function pushCompaniesToClayBatch(
  companies: BatchCompany[],
): Promise<BatchResult[]> {
  const BATCH_SIZE = 24;
  const BATCH_DELAY_MS = 30_000;

  const batches: BatchCompany[][] = [];
  for (let i = 0; i < companies.length; i += BATCH_SIZE) {
    batches.push(companies.slice(i, i + BATCH_SIZE));
  }

  currentSync = {
    status: "pushing",
    totalCompanies: companies.length,
    processedCompanies: 0,
    currentBatch: 0,
    totalBatches: batches.length,
    results: [],
  };

  const allResults: BatchResult[] = [];

  for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
    currentSync.currentBatch = batchIdx + 1;

    const batch = batches[batchIdx];
    for (const company of batch) {
      try {
        await pushCompanyToClay(company);

        const result: BatchResult = { companyId: company.id, companyName: company.name, success: true };
        allResults.push(result);
        currentSync.results.push(result);
      } catch (err: any) {
        const result: BatchResult = { companyId: company.id, companyName: company.name, success: false, error: err.message };
        allResults.push(result);
        currentSync.results.push(result);
      }

      currentSync.processedCompanies++;
    }

    // Wait 30s between batches (skip after last batch)
    if (batchIdx < batches.length - 1) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  currentSync.status = "done";
  return allResults;
}
