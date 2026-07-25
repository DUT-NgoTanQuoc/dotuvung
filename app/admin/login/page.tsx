import { ShieldCheck } from "lucide-react";
import { LoginForm } from "@/app/admin/login/LoginForm";

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 dark:bg-black">
      <div className="w-full max-w-sm animate-in fade-in zoom-in-95 duration-500">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-900 text-white shadow-lg shadow-zinc-900/20 dark:bg-zinc-50 dark:text-zinc-900">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Admin Login</h1>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
