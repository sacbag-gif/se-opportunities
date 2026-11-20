"use client";

import { useMemo, useState } from "react";
import { dealCountLabel, type SeStatus } from "../../lib/config";
import type { DashboardPayload, Opportunity } from "../../lib/types";

const STATUSES: SeStatus[] = ["not_started", "in_progress", "done"];

function formatAmount(amount: number | null): string {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatCloseDate(iso: string): string {
  if (!iso) return "—";
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function Dashboard({ data }: { data: DashboardPayload }) {
  const [groups, setGroups] = useState(data.groups);
  const [aeFilter, setAeFilter] = useState("all");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const aes = useMemo(
    () => groups.map((group) => ({ id: group.aeId, name: group.aeName })),
    [groups],
  );

  const visibleGroups = useMemo(
    () =>
      aeFilter === "all"
        ? groups
        : groups.filter((group) => group.aeId === aeFilter),
    [aeFilter, groups],
  );

  const total = visibleGroups.reduce(
    (sum, group) => sum + group.opportunities.length,
    0,
  );

  async function setStatus(opportunity: Opportunity, status: SeStatus) {
    if (opportunity.seStatus === status || pendingId) return;
    const previous = opportunity.seStatus;
    setError(null);
    setPendingId(opportunity.id);
    setGroups((current) =>
      current.map((group) => ({
        ...group,
        opportunities: group.opportunities.map((row) =>
          row.id === opportunity.id ? { ...row, seStatus: status } : row,
        ),
      })),
    );
    try {
      const response = await fetch("/api/status", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          opportunityId: opportunity.id,
          status,
        }),
      });
      if (!response.ok) {
        throw new Error("save_failed");
      }
    } catch {
      setGroups((current) =>
        current.map((group) => ({
          ...group,
          opportunities: group.opportunities.map((row) =>
            row.id === opportunity.id ? { ...row, seStatus: previous } : row,
          ),
        })),
      );
      setError("Could not save SE status. Try again.");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">
          <p>Sales engineering</p>
          <h1>{data.productName}</h1>
        </div>
        <div className="viewer">
          <strong>{data.viewerName}</strong>
          <span>{data.simulated ? "Simulated viewer" : "Signed in"}</span>
        </div>
      </header>

      <main className="main">
        <section className="lede">
          <h2>{data.headline}</h2>
          <p>{data.subhead}</p>
          <div className="chips">
            {data.source === "sample" ? (
              <span className="chip">{data.labels.sampleDataLabel}</span>
            ) : null}
            {data.allAeMode ? (
              <span className="chip">{data.labels.allAeModeLabel}</span>
            ) : null}
          </div>
        </section>

        {data.simulated ? (
          <p className="hint">{data.simulatedViewerNote}</p>
        ) : null}

        <div className="banners">
          {data.banners.map((banner) => (
            <p
              key={banner.text}
              className={banner.tone === "alert" ? "banner alert" : "banner"}
            >
              {banner.text}
            </p>
          ))}
        </div>

        <div className="toolbar">
          <label>
            {data.labels.filterLabel}
            <select
              value={aeFilter}
              onChange={(event) => setAeFilter(event.target.value)}
            >
              <option value="all">{data.labels.filterAll}</option>
              {aes.map((ae) => (
                <option key={ae.id} value={ae.id}>
                  {ae.name}
                </option>
              ))}
            </select>
          </label>
          <p className="hint">{data.labels.statusHint}</p>
        </div>

        {error ? <p className="banner alert">{error}</p> : null}

        {visibleGroups.length === 0 ? (
          <div className="empty">
            <h3>{data.labels.emptyTitle}</h3>
            <p>{data.labels.emptyBody}</p>
          </div>
        ) : (
          <div className="groups">
            {visibleGroups.map((group) => (
              <section className="group" key={group.aeId}>
                <h3>
                  {group.aeName}
                  <span>{dealCountLabel(group.opportunities.length)}</span>
                </h3>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>{data.labels.columns.name}</th>
                        <th>{data.labels.columns.ae}</th>
                        <th>{data.labels.columns.stage}</th>
                        <th>{data.labels.columns.amount}</th>
                        <th>{data.labels.columns.closeDate}</th>
                        <th>{data.labels.columns.seStatus}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.opportunities.map((opportunity) => (
                        <tr key={opportunity.id}>
                          <td className="name">{opportunity.name}</td>
                          <td>{opportunity.aeName}</td>
                          <td className="stage">{opportunity.stage}</td>
                          <td className="amount">
                            {formatAmount(opportunity.amount)}
                          </td>
                          <td className="date">
                            {formatCloseDate(opportunity.closeDate)}
                          </td>
                          <td>
                            <div
                              className="status"
                              role="group"
                              aria-label={data.labels.columns.seStatus}
                            >
                              {STATUSES.map((status) => (
                                <button
                                  key={status}
                                  type="button"
                                  aria-pressed={
                                    opportunity.seStatus === status
                                  }
                                  disabled={pendingId === opportunity.id}
                                  onClick={() => setStatus(opportunity, status)}
                                >
                                  {data.labels.statusLabels[status]}
                                </button>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ))}
          </div>
        )}
        <p className="hint">{dealCountLabel(total)} in this view.</p>
      </main>
    </div>
  );
}
