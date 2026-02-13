import jwt from "jsonwebtoken";

const FIVE_DAYS_SECONDS = 120 * 60 * 60; // 120h

export function signUserToken(payload: { sub: string; role: string }) {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error("JWT_SECRET missing");
    return jwt.sign(payload, secret, { expiresIn: FIVE_DAYS_SECONDS }); // seconds or string '120h'
}
