// lib/auth.ts
import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";

interface DecodedToken {
  sub: string;
  role: string;
  [key: string]: unknown;
}

export function getUserFromRequest(request: NextRequest): DecodedToken | null {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) return null;

    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error("JWT_SECRET manquant");

    return jwt.verify(token, secret) as DecodedToken;
  } catch {
    return null;
  }
}
