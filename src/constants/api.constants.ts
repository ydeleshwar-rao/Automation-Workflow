const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || '';

export const API_ROUTES = {
  AUTH: {
    LOGIN: `${BACKEND_URL}/auth/login`,
    PROFILE: `${BACKEND_URL}/auth/profile`,
    REFRESH: `${BACKEND_URL}/auth/session/refresh`,
  },
  SERVICEM8: {
    CONNECT: "/servicem8/connect",
    DISCONNECT: "/servicem8/disconnect",
    STATUS: "/servicem8/status",
    JOBS: "/servicem8/getjobs",
    GET_ALL_JOBS: "/servicem8/getalljobs",
    SYNC: "/servicem8/sync",
    QUEUES: "/servicem8/listqueues",
    CATEGORIES: "/servicem8/listcategories",
  },
  GHL: {
    CONNECT: "/leadshub/auth/connect",
    DISCONNECT: "/leadshub/auth/disconnect",
    SYNC: "/api/integration/ghls/sync",
    STATUS: "/leadshub/auth/status",
    ACTION_EVENT_TYPES: "/automation/action-event-types/leadshub",
    ACTION_EVENT_TRIGGERS: "/automation/action-event-types/leadshub/triggers",
    ACTION_EVENT_ACTIONS: "/automation/action-event-types/leadshub/actions",
    TEST_ADD_UPDATE_OPPORTUNITY: "/leadshub/opportunities/test/add-update",
  },
  SIMPRO: {
    CONNECT: "/api/integration/simpro/connect",
    DISCONNECT: "/api/integration/simpro/disconnect",
    CALLBACK: "/api/integration/simpro/callback",
    JOBS: "/api/integration/simpro/jobs",
    GET_ALL_JOBS: "/api/integration/simpro/jobs",
    CUSTOMERS: "/api/integration/simpro/customers",
    STATUS: "/simpro/status",
    SYNC: "/api/integration/simpro/sync",
  },
  COMMUSOFT: {
    CONNECT: "/commusoft/connect",
    DISCONNECT: "/commusoft/disconnect",
    STATUS: "/commusoft/status",
    GET_ALL_JOBS: "/commusoft/getalljobs",
    SYNC: "/commusoft/sync",
    CUSTOMER_TYPES: "/commusoft/customertypes",
    CREATE_CUSTOMER: "/commusoft/customers/create",
  },
  ADMIN: {
    USERS: "/api/admin/users",
  },
  ACCESS: {
    ME: `${BACKEND_URL}/access/me`,
    CLIENTS: `${BACKEND_URL}/access/clients`,
    USERS: `${BACKEND_URL}/access/users`,
    PERMISSIONS: (userId: string) => `${BACKEND_URL}/access/permissions/${userId}`,
    PERMISSIONS_MANAGE: `${BACKEND_URL}/access/permissions`,
    ASSIGNMENTS: `${BACKEND_URL}/access/assignments`,
    DEVELOPER_PERMISSIONS: (devId: string, clientId: string) =>
      `${BACKEND_URL}/access/developer-permissions/${devId}/${clientId}`,
    DEVELOPER_PERMISSIONS_MANAGE: `${BACKEND_URL}/access/developer-permissions`,
  },
  MAIL: {
    GET_CONNECTIONS: (locationId: string) =>
      `${BACKEND_URL}/mail/getconnections/${locationId}`,
    CREATE_CONNECTION: `${BACKEND_URL}/mail/smtpcreate`,
  },
} as const;
