export const AUTH_COOKIE_NAME = "token";
export const AUTH_COOKIE_MAXAGE = 120 * 60 * 60; // 120h in seconds

export const authCookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: AUTH_COOKIE_MAXAGE,
};
