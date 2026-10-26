import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import App from "../App";
import AuthPage from "./AuthPage";
import { api, cloudStorage, type User } from "../storage/cloud";
import { CollectionContext } from "../storage/collection";
import * as local from "../storage/images";

function Collection({ user }: { user: User | null }) {
  const storage = useMemo(() => user ? cloudStorage(user) : null, [user]);
  useLayoutEffect(() => {
    storage?.activate();
    return () => storage?.dispose();
  }, [storage]);
  return <CollectionContext.Provider value={storage || local}><App cloud={!!user} /></CollectionContext.Provider>;
}
export default function Account() {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [connectionError, setConnectionError] = useState("");
  const generation = useRef(0);
  const channel = useRef<BroadcastChannel | null>(null);
  const currentUser = useRef(user);
  currentUser.current = user;
  const recheck = useCallback(async () => {
    const epoch = ++generation.current;
    setChecking(true);
    try {
      const response = await api("/auth/session");
      const data = await response.json();
      if (generation.current === epoch) {
        setUser(previous => previous?.id === data.user?.id && previous?.email === data.user?.email ? previous : data.user);
        setConnectionError("");
      }
    } catch (e) {
      if (generation.current === epoch) setConnectionError((e as Error).message);
    } finally {
      if (generation.current === epoch) { setChecking(false); setPending(false); }
    }
  }, []);
  useEffect(() => {
    void recheck();
    const authChanged = () => void recheck();
    const returned = () => { if (currentUser.current && document.visibilityState === "visible") void recheck(); };
    // Storage events provide a fallback for browsers without BroadcastChannel.
    const storageEvent = (event: StorageEvent) => { if (event.key === "gallery-auth-changed") authChanged(); };
    if (typeof BroadcastChannel !== "undefined") {
      channel.current = new BroadcastChannel("gallery-auth");
      channel.current.onmessage = authChanged;
    }
    window.addEventListener("storage", storageEvent);
    window.addEventListener("focus", returned);
    document.addEventListener("visibilitychange", returned);
    return () => {
      generation.current++;
      channel.current?.close(); channel.current = null;
      window.removeEventListener("storage", storageEvent);
      window.removeEventListener("focus", returned);
      document.removeEventListener("visibilitychange", returned);
    };
  }, [recheck]);
  function notify() {
    if (channel.current) channel.current.postMessage("auth-changed");
    else { try { localStorage.setItem("gallery-auth-changed", crypto.randomUUID()); } catch { /* Recheck on tab return remains available. */ } }
  }
  useEffect(() => {
    function expired(event: Event) {
      if ((event as CustomEvent).detail !== currentUser.current?.id) return;
      generation.current++;
      setUser(null); setChecking(false); setPending(false);
      setError("Your session has ended. Sign in again. Your local collection is shown.");
      notify();
    }
    window.addEventListener("gallery-session-expired", expired);
    return () => window.removeEventListener("gallery-session-expired", expired);
  }, []);
  async function logout() {
    const epoch = ++generation.current;
    setPending(true); setError("");
    try {
      await api("/auth/logout", { method: "POST" });
      if (generation.current === epoch) { setUser(null); notify(); }
    } catch (e) { if (generation.current === epoch) setError((e as Error).message); }
    finally { if (generation.current === epoch) setPending(false); }
  }
  const authPage = window.location.pathname === "/sign-in" || window.location.pathname === "/sign-up";
  useEffect(() => {
    if (!checking && user && authPage) window.location.replace("/");
  }, [checking, user, authPage]);
  if (checking && (!user || authPage)) return <p role="status">Checking your session…</p>;
  if (authPage) return user ? <p role="status">Returning to your gallery…</p> : <AuthPage register={window.location.pathname === "/sign-up"} onAuthenticated={notify} />;
  return <>
    <a className="skip-link" href="#main">Skip to content</a>
    <section className="account-bar" aria-label="Account">
      <span>{checking ? "Checking your session…" : user ? `Signed in as ${user.email}` : "Guest · images stay on this device"}</span>
      {user ? <button disabled={pending || checking} onClick={() => void logout()}>Sign out</button> : <><a href="/sign-in">Sign in</a><a href="/sign-up">Create account</a></>}
      {connectionError && <p role="status">Account connection: {connectionError} {user ? "Uploads are paused until your account connection is restored." : "Your guest collection is available."} <button onClick={() => void recheck()}>Retry account connection</button></p>}
      {error && <p role="alert">{error}</p>}
    </section>
    <div hidden={!!user && (checking || !!connectionError)}>
      <Collection key={user?.id || "guest"} user={user} />
    </div>
  </>;
}
