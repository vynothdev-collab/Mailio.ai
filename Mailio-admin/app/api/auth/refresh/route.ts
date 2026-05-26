import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE_NAMES, AUTH_ENDPOINTS } from "@/constants";
import type { RefreshTokenResponse } from "@/types";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ;
const IS_PROD = process.env.NODE_ENV === "production";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(COOKIE_NAMES.SESSION_TOKEN)?.value;

    if (!sessionToken) {
      return NextResponse.json({ message: "No session" }, { status: 401 });
    }

    const response = await fetch(`${BASE_URL}${AUTH_ENDPOINTS.REFRESH_TOKEN}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionToken }),
    });

    if (!response.ok) {
      cookieStore.delete(COOKIE_NAMES.SESSION_TOKEN);
      cookieStore.delete(COOKIE_NAMES.ACCESS_TOKEN);
      cookieStore.delete(COOKIE_NAMES.USER);
      return NextResponse.json({ message: "Session expired" }, { status: 401 });
    }

    const { accessToken }: RefreshTokenResponse = await response.json();

    cookieStore.set(COOKIE_NAMES.ACCESS_TOKEN, accessToken, {
      httpOnly: false,
      secure: IS_PROD,
      sameSite: "strict",
      maxAge: 60 * 60,
      path: "/",
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ message: "Refresh failed" }, { status: 500 });
  }
}
