import {NextRequest} from "next/server";

export function getAuthToken(req: NextRequest): string | null {
    return req.cookies.get("token")?.value ?? null;
}