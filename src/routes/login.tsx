import { useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Pane } from "@/components/shell";
import { buttonClass } from "@/components/ui/button";
import { Field, controlClass } from "@/components/ui/field";
import { GROK_PROVIDERS, authClient, authEnabled, signIn } from "@/lib/auth/client";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in · Lineage" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Enter a valid email.");
      return;
    }
    if (password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    if (mode === "up" && name.trim().length < 2) {
      setError("Enter your name.");
      return;
    }
    setBusy(true);
    const result =
      mode === "up"
        ? await authClient.signUp.email({ name: name.trim(), email: email.trim(), password })
        : await authClient.signIn.email({ email: email.trim(), password });
    setBusy(false);
    if (result.error) {
      setError(result.error.message || (mode === "up" ? "Could not create the account." : "That email or password was not accepted."));
      return;
    }
    await navigate({ to: "/" });
  }

  return (
    <Pane>
      <div className="mx-auto grid w-full max-w-md gap-4">
        <div>
          <h1 className="font-display text-3xl tracking-tight">{mode === "up" ? "Create an account" : "Sign in"}</h1>
          <p className="mt-2 text-sm text-pretty text-muted">
            Each person keeps their own reminder time. An admin sets up the shared mailbox.
          </p>
        </div>
        {authEnabled ? (
          <div className="silk-card grid gap-3 rounded-xl border border-line bg-surface p-4">
            {GROK_PROVIDERS.map((provider) => (
              <button
                key={provider.providerId}
                type="button"
                className={buttonClass("secondary")}
                onClick={() => signIn(provider.providerId, { callbackURL: "/" })}
              >
                Continue with {provider.label}
              </button>
            ))}
            <p className="text-center text-xs text-muted">or with email</p>
            <form
              className="grid gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                void submit();
              }}
            >
              {mode === "up" ? (
                <Field label="Name">
                  <input className={controlClass} value={name} onChange={(event) => setName(event.target.value)} />
                </Field>
              ) : null}
              <Field label="Email">
                <input className={controlClass} type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />
              </Field>
              <Field label="Password" hint={mode === "up" ? "At least 8 characters." : undefined}>
                <input
                  className={controlClass}
                  type="password"
                  autoComplete={mode === "up" ? "new-password" : "current-password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </Field>
              {error ? <p className="text-sm text-accent-strong">{error}</p> : null}
              <button type="submit" className={buttonClass()} disabled={busy}>
                {mode === "up" ? "Create account" : "Sign in"}
              </button>
            </form>
            <button
              type="button"
              className="text-sm text-accent-strong"
              onClick={() => {
                setMode((current) => (current === "in" ? "up" : "in"));
                setError("");
              }}
            >
              {mode === "up" ? "Already have an account? Sign in" : "New here? Create an account"}
            </button>
          </div>
        ) : (
          <p className="text-sm text-muted">Sign-in is disabled.</p>
        )}
        <Link to="/" className="text-sm text-muted">
          Back to the tree
        </Link>
      </div>
    </Pane>
  );
}
