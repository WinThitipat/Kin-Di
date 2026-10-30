"use client";

import React, { useEffect, useRef, useState } from "react";
import { LockKeyhole, X } from "lucide-react";

interface Props {
  recipe: { id: string; name: string } | null;
  onClose: () => void;
  onDelete: (recipeId: string) => void;
}

export function AdminDeleteRecipeDialog({ recipe, onClose, onDelete }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pinRef = useRef<HTMLInputElement>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const pendingRef = useRef(false);
  const requestRef = useRef<AbortController | null>(null);

  const cancelRequest = () => {
    requestRef.current?.abort();
    requestRef.current = null;
    pendingRef.current = false;
    setBusy(false);
  };

  useEffect(() => {
    cancelRequest();
    setPin("");
    setError("");
    if (recipe && !dialogRef.current?.open) dialogRef.current?.showModal();
    else if (!recipe) dialogRef.current?.close();
    return () => {
      requestRef.current?.abort();
      requestRef.current = null;
    };
  }, [recipe]);

  const close = () => {
    cancelRequest();
    dialogRef.current?.close();
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!recipe || pendingRef.current) return;
    if (!/^\d{6,12}$/.test(pin)) {
      setError("กรอก PIN ผู้ดูแล 6–12 หลัก");
      pinRef.current?.focus();
      return;
    }
    pendingRef.current = true;
    setBusy(true);
    setError("");
    const controller = new AbortController();
    requestRef.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 25_000);
    try {
      const response = await fetch("/api/admin/authorize-recipe-deletion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ pin, recipeId: recipe.id }),
        signal: controller.signal,
      });
      const result = await response.json();
      if (requestRef.current !== controller || !dialogRef.current?.open) return;
      if (!response.ok || result.authorizedRecipeId !== recipe.id) {
        setError(result.error || "ตรวจสอบ PIN ไม่สำเร็จ กรุณาลองใหม่");
        setPin("");
        pinRef.current?.focus();
        return;
      }
      onDelete(recipe.id);
      setPin("");
      dialogRef.current?.close();
    } catch {
      if (requestRef.current !== controller) return;
      setError(controller.signal.aborted
        ? "รอนานเกินไป ยังยืนยันผลการลบไม่ได้ กรุณาตรวจสอบรายการก่อนลองใหม่"
        : "ยังยืนยันผลการลบไม่ได้ กรุณาตรวจสอบรายการก่อนลองใหม่");
      setPin("");
    } finally {
      window.clearTimeout(timeout);
      if (requestRef.current === controller) {
        requestRef.current = null;
        pendingRef.current = false;
        setBusy(false);
      }
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className="kindi-modal admin-delete-dialog"
      aria-labelledby="admin-delete-title"
      aria-describedby="admin-delete-description"
      onClose={() => {
        cancelRequest();
        setPin("");
        setError("");
        onClose();
      }}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
    >
      <form onSubmit={submit}>
        <div className="admin-delete-heading">
          <LockKeyhole size={23} aria-hidden="true" />
          <h2 id="admin-delete-title">ลบเมนูสำหรับผู้ดูแล</h2>
          <button
            type="button"
            onClick={close}
            aria-label="ปิดหน้าต่างยืนยันการลบ"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <p id="admin-delete-description">
          ต้องใส่ PIN ผู้ดูแลให้ถูกต้องเพื่อลบเมนูนี้
        </p>
        <p className="admin-delete-recipe">{recipe?.name}</p>
        <label htmlFor="admin-delete-pin">PIN ผู้ดูแล</label>
        <input
          ref={pinRef}
          id="admin-delete-pin"
          type="password"
          inputMode="numeric"
          autoComplete="off"
          autoFocus
          minLength={6}
          maxLength={12}
          required
          pattern="[0-9]{6,12}"
          value={pin}
          disabled={busy}
          onChange={(event) => setPin(event.target.value.replace(/\D/g, ""))}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "admin-delete-error" : undefined}
          className="kindi-input-field"
        />
        {error && (
          <p
            role="alert"
            id="admin-delete-error"
            className="admin-delete-error"
          >
            {error}
          </p>
        )}
        <p className="admin-delete-note">
          เมนูนี้จะถูกซ่อนจากฐานข้อมูลส่วนกลางและนำออกจากรายการบนเว็บ
          {busy && <span role="status" className="block mt-2">ปิดหน้าต่างได้ระหว่างรอ แต่เซิร์ฟเวอร์อาจลบไปแล้ว กรุณาตรวจสอบรายการก่อนลองใหม่</span>}
        </p>
        <div className="admin-delete-actions">
          <button
            type="button"
            className="kindi-btn-secondary"
            onClick={close}
          >
            ยกเลิก
          </button>
          <button type="submit" className="kindi-btn-primary" disabled={busy}>
            {busy ? "กำลังตรวจสอบ…" : "ยืนยัน PIN และลบเมนู"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
