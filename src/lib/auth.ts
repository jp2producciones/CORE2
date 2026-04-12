import { cookies } from "next/headers";

const COOKIE_NAME = "core2_session";
const SESSION_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days

export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME);
  return session?.value === "authenticated";
}

export async function login(password: string): Promise<boolean> {
  if (password === process.env.APP_PASSWORD) {
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, "authenticated", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_DURATION / 1000,
      path: "/",
    });
    return true;
  }
  return false;
}

export async function logout(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
