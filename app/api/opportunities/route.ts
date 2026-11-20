import { jsonHeaders, requireViewer } from "../../../lib/authorize";
import { loadDashboard } from "../../../lib/dashboard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const viewer = await requireViewer(request);
  if (viewer instanceof Response) return viewer;

  const data = await loadDashboard(viewer);
  return Response.json(data, { headers: jsonHeaders });
}
