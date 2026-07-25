"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";

export type LoginState = { error?: string };

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/admin",
    });
    return {};
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: "Email hoặc mật khẩu không đúng." };
    }
    throw err; // rethrow redirect() signal and unexpected errors
  }
}
