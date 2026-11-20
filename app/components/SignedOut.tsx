import { config } from "../../lib/config";

export function SignedOut({ reason }: { reason: string }) {
  return (
    <main className="signed-out">
      <h1>{config.productName}</h1>
      <p>
        This dashboard is for signed-in teammates. Open it from Cursor after
        publishing with team visibility.
      </p>
      <p className="hint">Sign-in check: {reason}</p>
    </main>
  );
}
