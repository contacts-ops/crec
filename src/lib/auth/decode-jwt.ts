import jwt from "jsonwebtoken";

export const decodeJwt = (token: string) => {
    return jwt.verify(token, process.env.JWT_SECRET!) as { sub: string; [key: string]: unknown };
}

