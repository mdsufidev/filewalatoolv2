export const ADMIN_COOKIE_NAME = "admin_access";
export const ADMIN_LOGIN_PATH = "/sufi/login";
export const ADMIN_DEFAULT_USER = "sufi111729@gmail.com";
export const ADMIN_DEFAULT_PASSWORD = "Mdsufi@1729";

export const ADMIN_USER = process.env.ADMIN_BASIC_AUTH_USER?.trim() || ADMIN_DEFAULT_USER;
export const ADMIN_PASSWORD = process.env.ADMIN_BASIC_AUTH_PASSWORD?.trim() || ADMIN_DEFAULT_PASSWORD;

export function isAdminCredentials(user: string, password: string) {
  return user === ADMIN_USER && password === ADMIN_PASSWORD;
}
