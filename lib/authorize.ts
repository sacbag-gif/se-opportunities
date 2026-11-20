import "server-only";

import {
  getIdentity,
  requireIdentity,
  requireTeamRole,
  type IdentityStage,
  type VerifiedIdentity,
} from "../cursor/identity";

const TEAM_ROLES = ["admin", "member", "service"] as const;

export type Viewer = {
  sub: string;
  email: string;
  name: string;
  kind: "person" | "key";
  simulated: boolean;
  stage: IdentityStage;
};

function toViewer(identity: VerifiedIdentity): Viewer {
  return {
    sub: identity.sub,
    email: identity.email,
    name: identity.name,
    kind: identity.kind,
    simulated: identity.simulated,
    stage: identity.stage,
  };
}

export async function requireViewer(
  request: Request,
): Promise<Viewer | Response> {
  const identity = await requireIdentity(request);
  if (identity instanceof Response) return identity;
  if (identity.appVisibility === "team") {
    const team = requireTeamRole(identity, TEAM_ROLES);
    if (team instanceof Response) return team;
    return toViewer(team);
  }
  return toViewer(identity);
}

export async function viewerFromHeaders(
  headersList: Headers,
): Promise<Viewer | { verified: false; reason: string }> {
  const identity = await getIdentity(headersList);
  if (!identity.verified) {
    return { verified: false, reason: identity.reason };
  }
  if (identity.appVisibility === "team") {
    const team = requireTeamRole(identity, TEAM_ROLES);
    if (team instanceof Response) {
      return { verified: false, reason: "forbidden" };
    }
    return toViewer(team);
  }
  return toViewer(identity);
}

export const jsonHeaders = {
  "cache-control": "private, no-store",
  "content-type": "application/json",
} as const;
