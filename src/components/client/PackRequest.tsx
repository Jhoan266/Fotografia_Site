"use client";
import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/Icon";
export function PackRequest({
  action,
}: {
  action: () => Promise<{ ok: boolean; error?: string }>;
}) {
  const t = useTranslations("client.portal");
  const lock = useRef(false);
  const [state, setState] = useState<"idle" | "pending" | "success" | "error">(
    "idle",
  );
  async function request() {
    if (lock.current || state === "success") return;
    lock.current = true;
    setState("pending");
    try {
      const result = await action();
      setState(result.ok ? "success" : "error");
    } catch {
      setState("error");
    } finally {
      lock.current = false;
    }
  }
  return (
    <div>
      <button
        type="button"
        className="portal-button portal-album-button"
        onClick={request}
        disabled={state === "pending" || state === "success"}
      >
        {state === "pending"
          ? t("requestPending")
          : state === "success"
            ? t("requestSent")
            : t("requestPack")}
        <Icon name={state === "success" ? "check" : "arrow"} width="16" />
      </button>
      <p role="status" aria-live="polite" className="portal-request-status">
        {state === "error"
          ? t("requestError")
          : state === "success"
            ? t("requestSuccess")
            : t("noCharge")}
      </p>
    </div>
  );
}
