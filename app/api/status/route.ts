import { jsonHeaders, requireViewer } from "../../../lib/authorize";
import { isSeStatus } from "../../../lib/config";
import { listOpenOpportunities } from "../../../lib/salesforce";
import { setOpportunityStatus } from "../../../lib/se-status";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const OPPORTUNITY_ID = /^[A-Za-z0-9_-]{1,64}$/;

export async function POST(request: Request) {
  const viewer = await requireViewer(request);
  if (viewer instanceof Response) return viewer;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "invalid_json" },
      { status: 400, headers: jsonHeaders },
    );
  }

  if (typeof body !== "object" || body === null) {
    return Response.json(
      { error: "invalid_body" },
      { status: 400, headers: jsonHeaders },
    );
  }

  const opportunityId = (body as { opportunityId?: unknown }).opportunityId;
  const status = (body as { status?: unknown }).status;
  if (typeof opportunityId !== "string" || !OPPORTUNITY_ID.test(opportunityId)) {
    return Response.json(
      { error: "invalid_opportunity" },
      { status: 400, headers: jsonHeaders },
    );
  }
  if (!isSeStatus(status)) {
    return Response.json(
      { error: "invalid_status" },
      { status: 400, headers: jsonHeaders },
    );
  }

  const listed = await listOpenOpportunities();
  const known = listed.opportunities.some((row) => row.id === opportunityId);
  if (!known) {
    return Response.json(
      { error: "unknown_opportunity" },
      { status: 404, headers: jsonHeaders },
    );
  }

  await setOpportunityStatus(opportunityId, status, viewer.sub, viewer.stage);
  return Response.json({ ok: true, status }, { headers: jsonHeaders });
}
