/**
 * Setup Wizard Types
 *
 * Defines the multi-step onboarding flow:
 * Company Info → Connections → Documents → Generating → Review
 */

// ---------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------

export type SetupStep =
  | "company"
  | "connections"
  | "documents"
  | "generating"
  | "review";

export const SETUP_STEPS: SetupStep[] = [
  "company",
  "connections",
  "documents",
  "generating",
  "review",
];

export const SETUP_STEP_META: Record<
  SetupStep,
  { label: string; description: string }
> = {
  company: {
    label: "Company",
    description: "Tell us about your company",
  },
  connections: {
    label: "Connections",
    description: "Connect your data sources",
  },
  documents: {
    label: "Documents",
    description: "Add extra context for the AI",
  },
  generating: {
    label: "Generating",
    description: "Building your business ontology",
  },
  review: {
    label: "Review",
    description: "Review and refine your ontology",
  },
};

// ---------------------------------------------------------------------------
// Connections
// ---------------------------------------------------------------------------

export type ConnectionId =
  | "hubspot"
  | "stripe"
  | "salesforce"
  | "mollie"
  | "notion"
  | "slack"
  | "google-drive";

export interface SetupConnectionStatus {
  isConnected: boolean;
  isSyncing: boolean;
  dataSummary?: string;
}

/** Which connections are actually buildable (mock OAuth) vs stubs */
export const ACTIVE_CONNECTIONS: ConnectionId[] = ["hubspot", "stripe"];

export const COMING_SOON_CONNECTIONS: ConnectionId[] = [
  "salesforce",
  "mollie",
  "notion",
  "slack",
  "google-drive",
];

export const CONNECTION_META: Record<
  ConnectionId,
  { name: string; description: string; mockSummary: string }
> = {
  hubspot: {
    name: "HubSpot",
    description: "Import contacts, companies, and deals from your CRM",
    mockSummary: "1,203 contacts, 312 companies synced",
  },
  stripe: {
    name: "Stripe",
    description: "Import customers, subscriptions, and invoices",
    mockSummary: "847 customers, $2.4M ARR synced",
  },
  salesforce: {
    name: "Salesforce",
    description: "Import accounts, opportunities, and contacts",
    mockSummary: "",
  },
  mollie: {
    name: "Mollie",
    description: "Import payment data and customer transactions",
    mockSummary: "",
  },
  notion: {
    name: "Notion",
    description: "Import documents and knowledge base content",
    mockSummary: "",
  },
  slack: {
    name: "Slack",
    description: "Connect team conversations for context",
    mockSummary: "",
  },
  "google-drive": {
    name: "Google Drive",
    description: "Import documents, spreadsheets, and presentations",
    mockSummary: "",
  },
};

// ---------------------------------------------------------------------------
// Uploaded files
// ---------------------------------------------------------------------------

export interface UploadedFile {
  name: string;
  size: number;
  type: string;
}

// ---------------------------------------------------------------------------
// Full wizard state
// ---------------------------------------------------------------------------

export interface SetupState {
  currentStep: SetupStep;
  completedSteps: SetupStep[];

  // Step 1: Company Info
  companyName: string;
  companyUrl: string;
  companyDescription: string;
  selectedPreset: string | null;
  organizationId: string | null;

  // Step 2: Connections
  connections: Record<ConnectionId, SetupConnectionStatus>;

  // Step 3: Documents
  uploadedFiles: UploadedFile[];
  additionalContext: string;

  // Step 4: Generating
  generationStatus: "idle" | "running" | "complete" | "error";
  generationError: string | null;
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export interface SetupActions {
  setCompanyInfo: (info: {
    companyName?: string;
    companyUrl?: string;
    companyDescription?: string;
    selectedPreset?: string | null;
    organizationId?: string | null;
  }) => void;
  setStep: (step: SetupStep) => void;
  completeStep: (step: SetupStep) => void;
  connectSource: (id: ConnectionId) => void;
  disconnectSource: (id: ConnectionId) => void;
  startSyncing: (id: ConnectionId) => void;
  addFile: (file: UploadedFile) => void;
  removeFile: (name: string) => void;
  setAdditionalContext: (text: string) => void;
  setGenerationStatus: (
    status: SetupState["generationStatus"],
    error?: string | null
  ) => void;
  reset: () => void;
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

export function createInitialSetupState(): SetupState {
  const connections = {} as Record<ConnectionId, SetupConnectionStatus>;
  const allIds: ConnectionId[] = [
    ...ACTIVE_CONNECTIONS,
    ...COMING_SOON_CONNECTIONS,
  ];
  for (const id of allIds) {
    connections[id] = { isConnected: false, isSyncing: false };
  }

  return {
    currentStep: "company",
    completedSteps: [],
    companyName: "",
    companyUrl: "",
    companyDescription: "",
    selectedPreset: null,
    organizationId: null,
    connections,
    uploadedFiles: [],
    additionalContext: "",
    generationStatus: "idle",
    generationError: null,
  };
}
