import { combineReducers } from "@reduxjs/toolkit"
import workflowBuilderReducer from "@/src/components/work-flow/store/workflowBuilderSlice"
import accessReducer from "./accessSlice"
import appStatusReducer from "./appStatusSlice"
import { baseApi } from "./baseApi"
import { aiHarnessApi } from "@/src/components/ai-workflow/aiHarnessApi"

const rootReducer = combineReducers({
  workflowBuilder: workflowBuilderReducer,
  access: accessReducer,
  appStatus: appStatusReducer,
  [baseApi.reducerPath]: baseApi.reducer,
  [aiHarnessApi.reducerPath]: aiHarnessApi.reducer,
})

export default rootReducer
