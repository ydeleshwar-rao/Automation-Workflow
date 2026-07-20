import { combineReducers } from "@reduxjs/toolkit"
import workflowBuilderReducer from "@/src/components/work-flow/store/workflowBuilderSlice"
import accessReducer from "./accessSlice"
import appStatusReducer from "./appStatusSlice"
import { workflowApi } from "@/src/components/work-flow/apiIntegrations/workflowApi"
import { folderTagApi } from "@/src/components/work-flow/apiIntegrations/folderTagApi"
import { webhookApi } from "@/src/components/work-flow/appEvents/webhook/apiIntegrations/webhookApi"
import { workflowTemplateApi } from "@/src/components/workflow-templates/apiIntegrations/workflowTemplateApi"
import { templateFolderApi } from "@/src/components/workflow-templates/apiIntegrations/templateFolderApi"
import { accessApi } from "@/src/components/admin/access/apiIntegrations/accessApi"
import { aiWorkflowApi } from "@/src/components/ai-workflow/aiWorkflowApi"
import { aiHarnessApi } from "@/src/components/ai-workflow/aiHarnessApi"

const rootReducer = combineReducers({
  workflowBuilder: workflowBuilderReducer,
  access: accessReducer,
  appStatus: appStatusReducer,
  [workflowApi.reducerPath]: workflowApi.reducer,
  [folderTagApi.reducerPath]: folderTagApi.reducer,
  [webhookApi.reducerPath]: webhookApi.reducer,
  [workflowTemplateApi.reducerPath]: workflowTemplateApi.reducer,
  [templateFolderApi.reducerPath]: templateFolderApi.reducer,
  [accessApi.reducerPath]: accessApi.reducer,
  [aiWorkflowApi.reducerPath]: aiWorkflowApi.reducer,
  [aiHarnessApi.reducerPath]: aiHarnessApi.reducer,
})

export default rootReducer
