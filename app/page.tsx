import { headers } from "next/headers";
import { viewerFromHeaders } from "../lib/authorize";
import { loadDashboard } from "../lib/dashboard";
import { Dashboard } from "./components/Dashboard";
import { SignedOut } from "./components/SignedOut";

export const dynamic = "force-dynamic";

export default async function Page() {
  const viewer = await viewerFromHeaders(await headers());
  if (!("sub" in viewer)) {
    return <SignedOut reason={viewer.reason} />;
  }

  const data = await loadDashboard(viewer);
  return <Dashboard data={data} />;
}
