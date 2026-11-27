"use client";
import { useActionState, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { verifyVault } from "@/modules/photos/verify-vault";

export function ClientRecovery({ userId, locale }: { userId: string; locale: string }) {
  const t = useTranslations("accountRecovery"), verification = useTranslations("vaultVerification");
  const [verifiedUntil, verify, verifying] = useActionState(verifyVault, 0);
  const [expiredAt, setExpiredAt] = useState(0), [busy, setBusy] = useState(false), [error, setError] = useState(false);
  const [result, setResult] = useState<{ code: string; expiresAt: string } | null>(null);
  const verified = !!verifiedUntil && verifiedUntil > expiredAt;
  useEffect(() => {
    if (!verifiedUntil) return;
    const timer = setTimeout(() => setExpiredAt(verifiedUntil), Math.max(0, verifiedUntil - Date.now()));
    return () => clearTimeout(timer);
  }, [verifiedUntil]);
  useEffect(() => {
    if (!result) return;
    const timer = setTimeout(() => setResult(null), Math.max(0, Date.parse(result.expiresAt) - Date.now()));
    return () => clearTimeout(timer);
  }, [result]);
  async function generate() {
    if (busy) return;
    setBusy(true); setError(false); setResult(null);
    try {
      const response = await fetch(`/api/clients/${encodeURIComponent(userId)}/password-recovery`, { method: "POST" });
      if (!response.ok) { setError(true); if (response.status === 403 && verifiedUntil) setExpiredAt(verifiedUntil); return; }
      setResult(await response.json());
    } catch { setError(true); } finally { setBusy(false); }
  }
  return <details className="client-recovery"><summary>{t("adminTitle")}</summary><p>{t("adminHelp")}</p>
    {!verified ? <form action={verify}>
      <label><span>{verification("password")}</span><input className="input-field" name="password" type="password" autoComplete="current-password" required maxLength={72} disabled={verifying} /></label>
      <button type="submit" className="btn-ghost" disabled={verifying}>{verification("unlock")}</button>
      {verifiedUntil === null && <p role="alert">{verification("invalid")}</p>}
    </form> : <button type="button" className="btn-ghost" onClick={() => void generate()} disabled={busy}>{busy ? t("generating") : t("generate")}</button>}
    {error && <p role="alert">{t("adminError")}</p>}
    {result && <div className="recovery-result"><label><span>{t("code")}</span><input className="input-field" readOnly autoComplete="off" value={result.code} onFocus={e => e.currentTarget.select()} /></label>
      <p>{t("share", { url: `${typeof window !== "undefined" ? window.location.origin : ""}/${locale}/reset-password` })}</p>
    </div>}
  </details>;
}
