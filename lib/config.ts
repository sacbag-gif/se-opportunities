import raw from "../data/config.json";

export const SE_STATUSES = ["not_started", "in_progress", "done"] as const;
export type SeStatus = (typeof SE_STATUSES)[number];

export type AeSeMapping = {
  aeOwnerId?: string;
  aeName?: string;
  seEmails: string[];
};

export type AppConfig = {
  productName: string;
  headline: string;
  subhead: string;
  viewerFallback: string;
  simulatedViewerNote: string;
  sampleDataLabel: string;
  sampleDataBanner: string;
  salesforceErrorBanner: string;
  allAeModeLabel: string;
  allAeBanner: string;
  unmappedViewerBanner: string;
  emptyTitle: string;
  emptyBody: string;
  filterLabel: string;
  filterAll: string;
  countOne: string;
  countMany: string;
  columns: {
    name: string;
    ae: string;
    stage: string;
    amount: string;
    closeDate: string;
    seStatus: string;
  };
  statusLabels: Record<SeStatus, string>;
  statusHint: string;
  aeSeMapping: AeSeMapping[];
};

export const config = raw as AppConfig;

export function isSeStatus(value: unknown): value is SeStatus {
  return (
    typeof value === "string" &&
    (SE_STATUSES as readonly string[]).includes(value)
  );
}

export function dealCountLabel(count: number): string {
  if (count === 1) return config.countOne;
  return config.countMany.replace("{n}", String(count));
}
