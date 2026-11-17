import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AuditoWordmarkLight } from "@/components/brand/AuditoLogo";
import { ThemeToggle } from "@/components/ThemeToggle";

export const Route = createFileRoute("/auth")({
  component: AuthLayout,
});

const PILLS = ["Chat with PDF", "Summarize", "Cited answers", "Page-level sources", "Key insights"];

function AuthLayout() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) navigate({ to: "/", replace: true });
  }, [isAuthenticated, navigate]);

  return (
    <div className="grid min-h-screen w-full bg-background text-foreground lg:grid-cols-[minmax(0,45fr)_minmax(0,55fr)]">
      {/* Left: brand panel (always dark) */}
      <aside className="auth-hero hidden flex-col justify-between px-12 py-12 text-white lg:flex xl:px-16">
        <AuditoWordmarkLight />

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[oklch(0.78_0.12_175)]">
            Document intelligence platform
          </p>
          <h2 className="font-display mt-8 text-4xl font-normal leading-[1.15] xl:text-5xl">
            Your document <span className="text-[oklch(0.78_0.15_62)]">workspace</span>, powered by{" "}
            <span className="text-[oklch(0.78_0.15_62)]">AUDITO.</span>
          </h2>
          <div className="mt-10 flex max-w-xl flex-wrap gap-3">
            {PILLS.map((p) => (
              <span
                key={p}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-sm text-white/90"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-[oklch(0.72_0.16_45)]" />
                {p}
              </span>
            ))}
            <span className="inline-flex items-center rounded-full bg-[oklch(0.5_0.1_178)] px-4 py-2 text-sm font-medium text-white">
              And more…
            </span>
          </div>
        </div>

        <p className="text-sm text-white/45">
          © {new Date().getFullYear()} AUDITO AI. Grounded answers from your documents.
        </p>
      </aside>

      {/* Right: form */}
      <main className="auth-form-bg relative flex items-center justify-center px-6 py-12">
        <div className="absolute right-5 top-5">
          <ThemeToggle compact />
        </div>
        <div className="w-full max-w-[440px]">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
