export interface CreateWorkflowTagDTO {
  name: string;
  color: string | null;
}

export interface UpdateWorkflowTagDTO {
  name?: string;
  color?: string | null;
}

export interface WorkflowTagSettingsDTO {
  enabled: boolean;
}
