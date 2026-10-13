import { login } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  const configured = !!process.env.SITE_PASSWORD;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 px-6 text-center">
      <span className="text-5xl">🔒</span>
      <div>
        <h1 className="text-lg font-semibold text-ink">Private area</h1>
        <p className="mt-1 text-sm text-ink-soft">Pantry, shopping list and spending are password protected.</p>
      </div>

      {!configured ? (
        <p className="max-w-xs rounded-[12px] bg-terracotta-tint px-4 py-3 text-sm text-terracotta-text">
          SITE_PASSWORD isn&apos;t set, so this can&apos;t be unlocked yet. Set it as an environment variable and
          redeploy.
        </p>
      ) : (
        <form action={login} className="flex w-full max-w-xs flex-col gap-2">
          <input type="hidden" name="next" value={next ?? "/"} />
          <input
            type="password"
            name="password"
            placeholder="Password"
            autoFocus
            required
            className="rounded-[12px] border border-border-soft px-3 py-2.5 text-center text-sm"
          />
          {error && <p className="text-sm text-terracotta-text">Wrong password.</p>}
          <button
            type="submit"
            className="rounded-[12px] bg-green-deep px-4 py-2.5 text-sm font-medium text-white"
          >
            Unlock
          </button>
        </form>
      )}
    </div>
  );
}
