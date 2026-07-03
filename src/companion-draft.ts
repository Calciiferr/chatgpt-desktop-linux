export type CompanionChatMode = "new" | "resume";
export type CompanionProjectMode = "existing" | "create";

export interface CompanionDraftState {
  version: number;
  prompt: string;
  securityAudit: boolean;
  qualityAudit: boolean;
  chatMode: CompanionChatMode;
  projectEnabled: boolean;
  projectMode: CompanionProjectMode;
  selectedProjectId?: string;
  newProjectName: string;
}

export interface CompanionDraftUpdateResult {
  draft: CompanionDraftState;
  invalidProject: boolean;
}

export function emptyCompanionDraft(version = 0): CompanionDraftState {
  return {
    version,
    prompt: "",
    securityAudit: false,
    qualityAudit: false,
    chatMode: "new",
    projectEnabled: false,
    projectMode: "existing",
    newProjectName: "",
  };
}

export function initialCompanionDraft(version: number, selectedProjectId?: string): CompanionDraftState {
  return {
    ...emptyCompanionDraft(version),
    projectEnabled: Boolean(selectedProjectId),
    ...(selectedProjectId ? { selectedProjectId } : {}),
  };
}

export function updateCompanionDraftState(
  current: CompanionDraftState,
  input: unknown,
  isKnownProject: (id: string) => boolean,
): CompanionDraftUpdateResult | null {
  if (typeof input !== "object" || input === null) return null;
  const record = input as Record<string, unknown>;
  const requestedProjectId =
    typeof record.selectedProjectId === "string" ? record.selectedProjectId : undefined;
  const selectedProjectId = requestedProjectId && isKnownProject(requestedProjectId)
    ? requestedProjectId
    : undefined;
  const projectMode: CompanionProjectMode = record.projectMode === "create" ? "create" : "existing";
  const invalidProject = Boolean(requestedProjectId && !selectedProjectId && projectMode === "existing");
  const projectEnabled = record.projectEnabled === true &&
    (projectMode === "create" || !requestedProjectId || Boolean(selectedProjectId));
  return {
    invalidProject,
    draft: {
      version: current.version + 1,
      prompt: typeof record.prompt === "string" ? record.prompt.slice(0, 12_000) : "",
      securityAudit: record.securityAudit === true,
      qualityAudit: record.qualityAudit === true,
      chatMode: record.chatMode === "resume" ? "resume" : "new",
      projectEnabled,
      projectMode,
      ...(selectedProjectId ? { selectedProjectId } : {}),
      newProjectName:
        typeof record.newProjectName === "string" ? record.newProjectName.slice(0, 120) : "",
    },
  };
}

export function touchCompanionDraftState(current: CompanionDraftState): CompanionDraftState {
  return { ...current, version: current.version + 1 };
}

export function retargetCompanionDraftState(
  current: CompanionDraftState,
  projectId: string,
): CompanionDraftState {
  return {
    ...current,
    version: current.version + 1,
    projectEnabled: true,
    projectMode: "existing",
    selectedProjectId: projectId,
    newProjectName: "",
    chatMode: "new",
  };
}

export function reconcileCompanionDraftProjectState(
  current: CompanionDraftState,
  isKnownProject: (id: string) => boolean,
): { draft: CompanionDraftState; disabledMissingProject: boolean } {
  if (!current.selectedProjectId || isKnownProject(current.selectedProjectId)) {
    return { draft: current, disabledMissingProject: false };
  }
  const disabledMissingProject = current.projectEnabled && current.projectMode === "existing";
  return {
    disabledMissingProject,
    draft: {
      ...current,
      version: current.version + 1,
      projectEnabled: disabledMissingProject ? false : current.projectEnabled,
      selectedProjectId: undefined,
    },
  };
}
