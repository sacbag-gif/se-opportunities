import type { SeStatus } from "./config";

export type Opportunity = {
  id: string;
  name: string;
  aeId: string;
  aeName: string;
  stage: string;
  amount: number | null;
  closeDate: string;
  seStatus: SeStatus;
};

export type AeGroup = {
  aeId: string;
  aeName: string;
  opportunities: Opportunity[];
};

export type Banner = {
  text: string;
  tone: "info" | "alert";
};

export type DashboardPayload = {
  productName: string;
  headline: string;
  subhead: string;
  viewerName: string;
  simulated: boolean;
  simulatedViewerNote: string;
  source: "salesforce" | "sample";
  salesforceOk: boolean;
  allAeMode: boolean;
  unmappedViewer: boolean;
  banners: Banner[];
  labels: {
    sampleDataLabel: string;
    allAeModeLabel: string;
    emptyTitle: string;
    emptyBody: string;
    filterLabel: string;
    filterAll: string;
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
  };
  groups: AeGroup[];
};
