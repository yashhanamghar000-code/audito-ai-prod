import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { AuthField, PasswordField } from "@/components/auth/AuthField";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export const Route = createFileRoute("/auth/login")({
  component: LoginPage,
});

function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    try {
      await login(email, password);
      navigate({ to: "/", replace: true });
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">Welcome back</p>
      <h1 className="font-display mt-5 text-4xl font-normal leading-tight tracking-tight">
        Sign in to <span className="text-highlight">audit</span> workspace
      </h1>
      <p className="mt-5 text-[15px] leading-relaxed text-muted-foreground">
        Chat with your PDFs and get structured summaries, with answers grounded in the source and cited to the page.
      </p>

      <form onSubmit={onSubmit} className="mt-10 space-y-6">
        <AuthField
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <PasswordField
          id="password"
          label="Password"
          autoComplete="current-password"
          required
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          right={
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => toast.info("Password reset is not available yet. Please contact your administrator.")}
                className="text-sm font-medium text-brand hover:underline"
              >
                Forgot password?
              </button>
            </div>
          }
        />

        <button
          type="submit"
          disabled={loading}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-brand text-[15px] font-medium text-brand-foreground shadow-sm transition-[filter,transform] hover:brightness-110 active:scale-[0.99] disabled:opacity-70"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Sign in <span aria-hidden>→</span>
        </button>
      </form>

      <p className="mt-10 text-center text-[15px] text-muted-foreground">
        New to AUDITO?{" "}
        <Link to="/auth/register" className="font-medium text-brand underline underline-offset-4">
          Create an account
        </Link>
      </p>
    </motion.div>
  );
}
