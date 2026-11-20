import "server-only";

import { config } from "./config";
import { listOpenOpportunities } from "./salesforce";
import { getStatusMap } from "./se-status";
import type { Viewer } from "./authorize";
import type { AeGroup, DashboardPayload, Opportunity } from "./types";

function mappingKeysForViewer(viewer: Viewer): Set<string> | null {
  const mapping = config.aeSeMapping;
  if (!mapping.length) return null;
  if (viewer.kind !== "person" || viewer.email === "") {
    return null;
  }
  const email = viewer.email.toLowerCase();
  const keys = new Set<string>();
  for (const entry of mapping) {
    const emails = entry.seEmails.map((value) => value.toLowerCase());
    if (!emails.includes(email)) continue;
    if (entry.aeOwnerId) keys.add(`id:${entry.aeOwnerId}`);
    if (entry.aeName) keys.add(`name:${entry.aeName.toLowerCase()}`);
  }
  return keys;
}

function matchesMapping(
  opportunity: { aeId: string; aeName: string },
  keys: Set<string>,
): boolean {
  return (
    keys.has(`id:${opportunity.aeId}`) ||
    keys.has(`name:${opportunity.aeName.toLowerCase()}`)
  );
}

function groupByAe(opportunities: Opportunity[]): AeGroup[] {
  const groups = new Map<string, AeGroup>();
  for (const opportunity of opportunities) {
    const existing = groups.get(opportunity.aeId);
    if (existing) {
      existing.opportunities.push(opportunity);
      continue;
    }
    groups.set(opportunity.aeId, {
      aeId: opportunity.aeId,
      aeName: opportunity.aeName,
      opportunities: [opportunity],
    });
  }
  return [...groups.values()].sort((a, b) =>
    a.aeName.localeCompare(b.aeName, undefined, { sensitivity: "base" }),
  );
}

export async function loadDashboard(viewer: Viewer): Promise<DashboardPayload> {
  const [listed, statusMap] = await Promise.all([
    listOpenOpportunities(),
    getStatusMap(viewer.stage),
  ]);

  const mappingKeys = mappingKeysForViewer(viewer);
  const allAeMode = mappingKeys === null;
  const visible = allAeMode
    ? listed.opportunities
    : listed.opportunities.filter((row) => matchesMapping(row, mappingKeys));
  const unmappedViewer =
    !allAeMode && mappingKeys.size === 0 && listed.opportunities.length > 0;

  const opportunities: Opportunity[] = visible.map((row) => ({
    ...row,
    seStatus: statusMap.get(row.id) ?? "not_started",
  }));

  const banners: DashboardPayload["banners"] = [];
  if (listed.source === "sample") {
    banners.push({ text: config.sampleDataBanner, tone: "info" });
  }
  if (!listed.ok) {
    banners.push({ text: config.salesforceErrorBanner, tone: "alert" });
  }
  if (allAeMode) {
    banners.push({ text: config.allAeBanner, tone: "info" });
  }
  if (unmappedViewer) {
    banners.push({ text: config.unmappedViewerBanner, tone: "info" });
  }

  return {
    productName: config.productName,
    headline: config.headline,
    subhead: config.subhead,
    viewerName: viewer.name || config.viewerFallback,
    simulated: viewer.simulated,
    simulatedViewerNote: config.simulatedViewerNote,
    source: listed.source,
    salesforceOk: listed.ok,
    allAeMode,
    unmappedViewer,
    banners,
    labels: {
      sampleDataLabel: config.sampleDataLabel,
      allAeModeLabel: config.allAeModeLabel,
      emptyTitle: config.emptyTitle,
      emptyBody: config.emptyBody,
      filterLabel: config.filterLabel,
      filterAll: config.filterAll,
      columns: config.columns,
      statusLabels: config.statusLabels,
      statusHint: config.statusHint,
    },
    groups: groupByAe(opportunities),
  };
}
