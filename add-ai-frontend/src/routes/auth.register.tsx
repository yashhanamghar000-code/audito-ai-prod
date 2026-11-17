import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { AuthField, PasswordField } from "@/components/auth/AuthField";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export const Route = createFileRoute("/auth/register")({
  component: RegisterPage,
});

function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      await register(name, email, password);
      navigate({ to: "/", replace: true });
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? "Registration failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">Get started</p>
      <h1 className="font-display mt-5 text-4xl font-normal leading-tight tracking-tight">
        Create your <span className="text-highlight">audit</span> workspace
      </h1>
      <p className="mt-5 text-[15px] leading-relaxed text-muted-foreground">
        Set up your account to start asking questions about your documents.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-5">
        <AuthField id="name" label="Full name" required placeholder="Jane Doe" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
        <AuthField id="email" label="Email" type="email" required placeholder="you@company.com" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <PasswordField id="password" label="Password" required placeholder="Create a password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <PasswordField id="confirm" label="Confirm password" required placeholder="Re-enter your password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />

        <button
          type="submit"
          disabled={loading}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-brand text-[15px] font-medium text-brand-foreground shadow-sm transition-[filter,transform] hover:brightness-110 active:scale-[0.99] disabled:opacity-70"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Create account <span aria-hidden>→</span>
        </button>
      </form>

      <p className="mt-8 text-center text-[15px] text-muted-foreground">
        Already have an account?{" "}
        <Link to="/auth/login" className="font-medium text-brand underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </motion.div>
  );
}
