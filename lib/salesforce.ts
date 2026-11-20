import "server-only";

import sampleOpportunities from "../data/sample-opportunities.json";

const API_VERSION = "v62.0";
const TOKEN_TTL_MS = 90 * 60 * 1000;

export type SalesforceOpportunity = {
  id: string;
  name: string;
  aeId: string;
  aeName: string;
  stage: string;
  amount: number | null;
  closeDate: string;
};

export type OpportunityList =
  | { ok: true; source: "salesforce"; opportunities: SalesforceOpportunity[] }
  | { ok: true; source: "sample"; opportunities: SalesforceOpportunity[] }
  | { ok: false; source: "salesforce"; opportunities: SalesforceOpportunity[] };

type SalesforceCredentials = {
  clientId: string;
  clientSecret: string;
  loginUrl: string;
  refreshToken: string;
};

type TokenCache = {
  accessToken: string;
  instanceUrl: string;
  expiresAt: number;
};

let tokenCache: TokenCache | undefined;

function readCredentials(): SalesforceCredentials | null {
  const clientId = process.env.SALESFORCE_CLIENT_ID?.trim() ?? "";
  const clientSecret = process.env.SALESFORCE_CLIENT_SECRET?.trim() ?? "";
  const loginUrl = process.env.SALESFORCE_LOGIN_URL?.trim() ?? "";
  const refreshToken = process.env.SALESFORCE_REFRESH_TOKEN?.trim() ?? "";
  if (!clientId || !clientSecret || !loginUrl || !refreshToken) {
    return null;
  }
  return { clientId, clientSecret, loginUrl, refreshToken };
}

function sampleList(): SalesforceOpportunity[] {
  return sampleOpportunities.map((row) => ({
    id: row.id,
    name: row.name,
    aeId: row.aeId,
    aeName: row.aeName,
    stage: row.stage,
    amount: row.amount,
    closeDate: row.closeDate,
  }));
}

async function refreshAccessToken(
  credentials: SalesforceCredentials,
): Promise<TokenCache> {
  const now = Date.now();
  if (tokenCache && tokenCache.expiresAt > now + 60_000) {
    return tokenCache;
  }

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: credentials.clientId,
    client_secret: credentials.clientSecret,
    refresh_token: credentials.refreshToken,
  });

  const response = await fetch(
    new URL("/services/oauth2/token", credentials.loginUrl),
    {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
    },
  );

  if (!response.ok) {
    tokenCache = undefined;
    throw new Error(`salesforce_token_${response.status}`);
  }

  const payload = (await response.json()) as {
    access_token?: unknown;
    instance_url?: unknown;
  };
  if (
    typeof payload.access_token !== "string" ||
    payload.access_token === "" ||
    typeof payload.instance_url !== "string" ||
    payload.instance_url === ""
  ) {
    tokenCache = undefined;
    throw new Error("salesforce_token_malformed");
  }

  tokenCache = {
    accessToken: payload.access_token,
    instanceUrl: payload.instance_url,
    expiresAt: now + TOKEN_TTL_MS,
  };
  return tokenCache;
}

type SalesforceQueryRecord = {
  Id?: unknown;
  Name?: unknown;
  StageName?: unknown;
  Amount?: unknown;
  CloseDate?: unknown;
  OwnerId?: unknown;
  Owner?: { Name?: unknown } | null;
};

function mapRecord(record: SalesforceQueryRecord): SalesforceOpportunity | null {
  if (typeof record.Id !== "string" || record.Id === "") return null;
  const ownerName =
    record.Owner && typeof record.Owner.Name === "string"
      ? record.Owner.Name
      : "Unknown AE";
  const amount =
    typeof record.Amount === "number" && Number.isFinite(record.Amount)
      ? record.Amount
      : null;
  return {
    id: record.Id,
    name: typeof record.Name === "string" ? record.Name : record.Id,
    aeId: typeof record.OwnerId === "string" ? record.OwnerId : "unknown",
    aeName: ownerName,
    stage: typeof record.StageName === "string" ? record.StageName : "",
    amount,
    closeDate: typeof record.CloseDate === "string" ? record.CloseDate : "",
  };
}

async function queryOpenOpportunities(
  credentials: SalesforceCredentials,
): Promise<SalesforceOpportunity[]> {
  const token = await refreshAccessToken(credentials);
  const soql = [
    "SELECT Id, Name, StageName, Amount, CloseDate, OwnerId, Owner.Name",
    "FROM Opportunity",
    "WHERE IsClosed = false",
    "ORDER BY Owner.Name, CloseDate",
    "LIMIT 500",
  ].join(" ");
  const url = new URL(
    `/services/data/${API_VERSION}/query`,
    token.instanceUrl,
  );
  url.searchParams.set("q", soql);

  const response = await fetch(url, {
    headers: { authorization: `Bearer ${token.accessToken}` },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`salesforce_query_${response.status}`);
  }

  const payload = (await response.json()) as {
    records?: SalesforceQueryRecord[];
  };
  const records = Array.isArray(payload.records) ? payload.records : [];
  return records
    .map(mapRecord)
    .filter((row): row is SalesforceOpportunity => row !== null);
}

export async function listOpenOpportunities(): Promise<OpportunityList> {
  const credentials = readCredentials();
  if (!credentials) {
    return { ok: true, source: "sample", opportunities: sampleList() };
  }

  try {
    const opportunities = await queryOpenOpportunities(credentials);
    return { ok: true, source: "salesforce", opportunities };
  } catch {
    return { ok: false, source: "salesforce", opportunities: [] };
  }
}
