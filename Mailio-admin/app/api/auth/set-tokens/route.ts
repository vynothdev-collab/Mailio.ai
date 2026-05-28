import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE_NAMES } from "@/constants";
import type { AdminUser } from "@/types";

const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days
const ACCESS_MAX_AGE = 60 * 60; // 1 hour

interface SetTokensBody {
  accessToken: string;
  sessionToken: string;
  user: AdminUser;
}

export async function POST(request: NextRequest) {
  try {
    const body: SetTokensBody = await request.json();
    const { accessToken, sessionToken, user } = body;

    if (!accessToken || !sessionToken || !user) {
      return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
    }

    const cookieStore = await cookies();

    cookieStore.set(COOKIE_NAMES.SESSION_TOKEN, sessionToken, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: SESSION_MAX_AGE,
      path: "/",
    });

    cookieStore.set(COOKIE_NAMES.ACCESS_TOKEN, accessToken, {
      httpOnly: false,
      secure: false,
      sameSite: "strict",
      maxAge: ACCESS_MAX_AGE,
      path: "/",
    });

    cookieStore.set(COOKIE_NAMES.USER, JSON.stringify(user), {
      httpOnly: false,
      secure: false,
      sameSite: "strict",
      maxAge: SESSION_MAX_AGE,
      path: "/",
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ message: "Failed to set tokens" }, { status: 500 });
  }
}
