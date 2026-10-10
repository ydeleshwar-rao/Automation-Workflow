export type TemplateStatus = "active" | "archived";

export type RequiredCredential = {
  type: string;
  field: string;
};

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  tag: string | null;
  source_workflow_id: string | null;
  created_by: string;
  is_public: boolean;
  usage_count: number;
  status: TemplateStatus;
  template_folder_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TemplateFolderRecord {
  id: string;
  name: string;
  description?: string | null;
  parent_id?: string | null;
  created_by: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateTemplateFolderBody {
  name: string;
  created_by: string;
  description?: string;
  parent_id?: string | null;
  is_public?: boolean;
}

export interface UpdateTemplateFolderBody {
  name?: string;
  description?: string | null;
  parent_id?: string | null;
  is_public?: boolean;
}

export interface BulkApplyFolderBody {
  user_id: string;
  name_prefix?: string;
  folder_id?: string | null;
}

export interface BulkApplyFolderResultItem {
  template_id: string;
  template_name: string;
  workflow_id: string;
  workflow_name: string;
  status: "draft" | "active" | "disabled";
  error?: string;
}

export interface TemplateNode {
  id: string;
  template_id: string;
  type: "trigger" | "action" | "condition";
  node_category: string | null;
  integration_key: string;
  action_key: string | null;
  config_schema: Record<string, any>;
  required_credentials: RequiredCredential[];
  output_schema: Record<string, any>;
  position: number;
}

export type TemplateMappingEntry = {
  mapping_type: "dynamic" | "static";
  destination_field: string;
  source_template_node_id: string | null;
  source_field: string | null;
  static_value: string | null;
  transformation: any | null;
};

export interface TemplateMapping {
  id: string;
  template_id: string;
  template_node_id: string;
  mappings: TemplateMappingEntry[];
}

export interface TemplateDetail extends WorkflowTemplate {
  nodes: TemplateNode[];
  mappings: TemplateMapping[];
}

export interface CreateTemplateBody {
  source_workflow_id: string;
  name: string;
  created_by: string;
  description?: string;
  category?: string;
  tag?: string;
  is_public?: boolean;
}

export interface UpdateTemplateBody {
  name?: string;
  description?: string | null;
  category?: string | null;
  tag?: string | null;
  is_public?: boolean;
  status?: TemplateStatus;
  template_folder_id?: string | null;
}

export interface ListTemplatesParams {
  created_by?: string;
  is_public?: boolean;
  category?: string;
  status?: TemplateStatus;
  template_folder_id?: string;
}

export type CredentialOverrides = Record<
  string, // template_node_id
  Record<string, string> // field -> value (e.g. { smtp_id: "uuid" })
>;

export interface ApplyTemplateBody {
  name: string;
  user_id: string;
  tag?: string;
  credential_overrides?: CredentialOverrides;
}

export interface ApplyTemplateResult {
  workflow: {
    id: string;
    name: string;
    status: "draft" | "active" | "disabled";
    user_id: string;
    tag?: string;
  };
  nodes_created: number;
}
