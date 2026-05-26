export interface PagePermissions {
  servicem8: boolean;
  commusoft: boolean;
  simpro: boolean;
  workflow: boolean;
  assets: boolean;
}

export const DEFAULT_PERMISSIONS: PagePermissions = {
  servicem8: true,
  commusoft: true,
  simpro: true,
  workflow: true,
  assets: true,
};
