import { configureStore, Middleware } from "@reduxjs/toolkit"
import rootReducer from "./rootReducer"
import { workflowApi } from "../components/work-flow/apiIntegrations/workflowApi"
import { folderTagApi } from "../components/work-flow/apiIntegrations/folderTagApi"
import { webhookApi } from "../components/work-flow/appEvents/webhook/apiIntegrations/webhookApi"
import { workflowTemplateApi } from "../components/workflow-templates/apiIntegrations/workflowTemplateApi"
import { templateFolderApi } from "../components/workflow-templates/apiIntegrations/templateFolderApi"
import { accessApi } from "../components/admin/access/apiIntegrations/accessApi"

// ── Store ─────────────────────────────────────────────────────────────────────
export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      workflowApi.middleware,
      folderTagApi.middleware,
      webhookApi.middleware,
      workflowTemplateApi.middleware,
      templateFolderApi.middleware,
      accessApi.middleware,
    ),
  devTools: process.env.NODE_ENV !== "production",
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch