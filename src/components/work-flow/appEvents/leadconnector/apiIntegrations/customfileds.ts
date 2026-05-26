import axiosInstance from "@/src/services/apiClient"
import { getActiveClientKey } from "@/src/store/localStorage"


export const getCustomFileds = async () => {
  const clientKey = getActiveClientKey()

  const response = await axiosInstance.get(
    "/leadshub/customfields/all",
    { headers: { clientkey: clientKey } }
  )

  return {
    contact: response.data.data.contact,
    action: response.data.data.action,
  }
}