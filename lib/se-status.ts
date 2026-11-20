import "server-only";

import type { IdentityStage } from "../cursor/identity";
import { sql } from "./db";
import { isSeStatus, type SeStatus } from "./config";

type StatusRow = {
  opportunity_id: string;
  status: string;
};

export async function getStatusMap(
  stage: IdentityStage,
): Promise<Map<string, SeStatus>> {
  const rows = await sql<StatusRow>(
    "select opportunity_id, status from se_opportunity_status where app_stage = $1",
    [stage],
  );
  const map = new Map<string, SeStatus>();
  for (const row of rows) {
    if (isSeStatus(row.status)) {
      map.set(row.opportunity_id, row.status);
    }
  }
  return map;
}

export async function setOpportunityStatus(
  opportunityId: string,
  status: SeStatus,
  updatedBy: string,
  stage: IdentityStage,
): Promise<void> {
  await sql(
    `insert into se_opportunity_status (opportunity_id, app_stage, status, updated_by)
     values ($1, $2, $3, $4)
     on conflict (opportunity_id, app_stage) do update
     set status = excluded.status,
         updated_by = excluded.updated_by,
         updated_at = now()`,
    [opportunityId, stage, status, updatedBy],
  );
}
