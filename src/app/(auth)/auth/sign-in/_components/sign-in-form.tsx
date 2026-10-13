"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SignInFormProps {
  redirectUrl: string;
}

export function SignInForm({ redirectUrl }: SignInFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (res?.error) {
        setError("Invalid email or password. Please check your credentials.");
        setLoading(false);
        return;
      }

      router.push(redirectUrl);
      router.refresh();
    } catch (err) {
      console.error("Sign in failed:", err);
      setError("An unexpected error occurred during sign in. Please try again.");
      setLoading(false);
    }
  };

  const signUpHref = redirectUrl !== "/dashboard"
    ? `/auth/sign-up?next=${encodeURIComponent(redirectUrl)}`
    : "/auth/sign-up";

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-8 shadow-xl dark:border-neutral-800 dark:bg-neutral-900">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
          Welcome back
        </h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Enter your credentials to access your account
        </p>
      </div>

      {error && (
        <div className="mb-5 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Email address
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            disabled={loading}
            className="h-10"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Password
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              disabled={loading}
              className="h-10 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              tabIndex={-1}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full h-10 mt-2 font-medium"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Signing in...
            </>
          ) : (
            "Sign In"
          )}
        </Button>
      </form>

      <div className="mt-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
        Don&apos;t have an account?{" "}
        <Link
          href={signUpHref}
          className="font-medium text-blue-600 hover:underline dark:text-blue-400"
        >
          Sign up
        </Link>
      </div>
    </div>
  );
}
