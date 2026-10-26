import { useState } from "react";
import { api } from "../storage/cloud";
export default function AuthPage({ register, onAuthenticated }: { register: boolean; onAuthenticated(): void }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const data = new FormData(event.currentTarget);
    setPending(true); setError("");
    try {
      await api(`/auth/${register ? "register" : "login"}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.get("email"), password: data.get("password") }),
      });
      onAuthenticated();
      window.location.replace("/");
    } catch (e) { setError((e as Error).message); setPending(false); }
  }
  return <main id="main" className="auth-page">
    <a href="/">← Back to gallery</a>
    <h1>{register ? "Create an account" : "Sign in"}</h1>
    <p>Your account images are private and saved to the server. Guest images stay on your device.</p>
    <form onSubmit={event => void submit(event)}>
      <label>Email<input required name="email" type="email" autoComplete="username" maxLength={254} disabled={pending} /></label>
      <label>Password<input required name="password" type="password" autoComplete={register ? "new-password" : "current-password"} minLength={12} maxLength={128} disabled={pending} /></label>
      <p>Use 12–128 characters for your password.</p>
      {error && <p role="alert">{error}</p>}
      <button type="submit" className="button primary" disabled={pending}>{pending ? "Please wait…" : register ? "Create account" : "Sign in to account"}</button>
    </form>
    <p>{register ? <>Already have an account? <a href="/sign-in">Sign in</a></> : <>New here? <a href="/sign-up">Create account</a></>}</p>
  </main>;
}
