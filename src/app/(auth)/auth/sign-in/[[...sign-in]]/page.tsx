import { SignInForm } from "../_components/sign-in-form";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    url?: string;
    next?: string;
    callbackUrl?: string;
    redirect_url?: string;
  }>;
}) {
  const params = await searchParams;

  // Resolve safe destination
  const target =
    params.callbackUrl ??
    params.next ??
    params.redirect_url ??
    (params.url ? `/dashboard/link/new?url=${encodeURIComponent(params.url)}` : "/dashboard");

  const safeTarget =
    target.startsWith("/") && !target.startsWith("//") ? target : "/dashboard";

  return <SignInForm redirectUrl={safeTarget} />;
}
