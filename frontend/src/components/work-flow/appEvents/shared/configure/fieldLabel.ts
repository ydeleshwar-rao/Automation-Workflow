/** "customer_type" → "Customer Type" */
export function formatSnakeCaseLabel(fieldName: string): string {
  return fieldName.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

/** "pipelineStageId" → "Pipeline Stage Id" */
export function formatCamelCaseLabel(fieldName: string): string {
  return fieldName.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase());
}
