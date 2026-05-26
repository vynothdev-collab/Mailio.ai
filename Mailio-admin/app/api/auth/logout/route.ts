import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE_NAMES, AUTH_ENDPOINTS } from "@/constants";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export async function POST() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(COOKIE_NAMES.ACCESS_TOKEN)?.value;

  if (accessToken) {
    await fetch(`${BASE_URL}${AUTH_ENDPOINTS.LOGOUT}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    }).catch(() => {});
  }

  cookieStore.delete(COOKIE_NAMES.ACCESS_TOKEN);
  cookieStore.delete(COOKIE_NAMES.SESSION_TOKEN);
  cookieStore.delete(COOKIE_NAMES.USER);

  return NextResponse.json({ success: true });
}
