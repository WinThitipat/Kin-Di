"use client";
import { useState } from "react";
import { Share2 } from "lucide-react";

export function ShareRecipeButton({ id, name }: { id: string; name: string }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [fallbackUrl, setFallbackUrl] = useState("");
  const share = async () => {
    if (busy) return;
    setBusy(true);
    setMessage("");
    const url = new URL(
      `/recipes/${encodeURIComponent(id)}`,
      window.location.origin,
    ).href;
    try {
      if (navigator.share)
        await navigator.share({
          title: `${name} · KIN DI`,
          text: `ลองทำ ${name} ด้วยกัน`,
          url,
        });
      else {
        await navigator.clipboard.writeText(url);
        setMessage("คัดลอกลิงก์แล้ว");
      }
    } catch (error) {
      if (!(error instanceof Error && error.name === "AbortError")) {
        setFallbackUrl(url);
        setMessage("คัดลอกลิงก์ด้านล่างเพื่อแชร์");
      }
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="min-w-0">
      <button
        type="button"
        className="kindi-btn-secondary inline-flex min-h-11 items-center justify-center gap-2 px-3"
        onClick={share}
        disabled={busy}
        aria-label={`แชร์เมนู ${name}`}
      >
        <Share2 size={16} aria-hidden="true" />
        แชร์
      </button>
      <span role="status" className="block text-xs">
        {message}
      </span>
      {fallbackUrl && (
        <input
          aria-label="ลิงก์สำหรับแชร์"
          className="kindi-input-field w-full"
          readOnly
          value={fallbackUrl}
          onFocus={(e) => e.target.select()}
        />
      )}
    </div>
  );
}
