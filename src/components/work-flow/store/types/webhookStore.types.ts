interface WorkflowBuilderState {
  workflow: {
    id?: string
    name: string
    status: "draft" | "active"
  }

  nodes: WorkflowNode[]

  mappings: Record<string, FieldMapping[]>

  webhookTestData: any | null
}

interface WorkflowNode {
  id: string
  workflow_id: string
  type: "trigger" | "action"
  integration_key: string
  action_key: string
  config?: Record<string, any>
  position?: {
    x: number
    y: number
  }
}

interface FieldMapping {
  source_field: string
  target_field: string
}

