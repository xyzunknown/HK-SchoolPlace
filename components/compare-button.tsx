"use client";

import { useCallback, useEffect, useState } from "react";
import { addComparison, removeComparison } from "@/lib/api-client";
import { LoginModal } from "@/components/login-modal";
import { showToast } from "@/components/toast";
import {
  consumePendingAuthAction,
  getCurrentPath,
  rememberPendingAuthAction,
  useAuth,
} from "@/lib/demo-auth";

type Props = {
  schoolId: string;
  initialInComparison: boolean;
  onToggle?: (isInComparison: boolean) => void;
};

export function CompareButton({ schoolId, initialInComparison, onToggle }: Props) {
  const [isInComparison, setIsInComparison] = useState(initialInComparison);
  const [loading, setLoading] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    setIsInComparison(initialInComparison);
  }, [initialInComparison]);

  const completeAddComparison = useCallback(async () => {
    const result = await addComparison(schoolId);
    if (result?.error?.code === "UNAUTHORIZED") {
      rememberPendingAuthAction({
        kind: "comparison",
        intent: "add",
        schoolId,
        next: getCurrentPath(),
        createdAt: Date.now(),
      });
      setLoginOpen(true);
      return;
    }
    if (result?.error?.code === "COMPARISON_LIMIT_REACHED") {
      showToast("對比列表已滿（最多 5 間）", "error");
      return;
    }
    if (result?.error) {
      throw new Error(result.error.message ?? "Failed to add comparison");
    }

    setIsInComparison(true);
    showToast("已加入對比", "success");
    onToggle?.(true);
  }, [onToggle, schoolId]);

  const completeRemoveComparison = useCallback(async () => {
    const result = await removeComparison(schoolId);
    if (result?.error?.code === "UNAUTHORIZED") {
      rememberPendingAuthAction({
        kind: "comparison",
        intent: "remove",
        schoolId,
        next: getCurrentPath(),
        createdAt: Date.now(),
      });
      setLoginOpen(true);
      return;
    }
    if (result?.error) {
      throw new Error(result.error.message ?? "Failed to remove comparison");
    }
    setIsInComparison(false);
    showToast("已移除對比", "info");
    onToggle?.(false);
  }, [onToggle, schoolId]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const pending = consumePendingAuthAction(
      (action) =>
        action.kind === "comparison" &&
        action.schoolId === schoolId &&
        (action.intent === "add" || action.intent === "remove")
    );

    if (!pending) {
      return;
    }

    const run = pending.intent === "add" ? completeAddComparison : completeRemoveComparison;
    void run().catch(() => {
      showToast("操作失敗，請稍後再試", "error");
    });
  }, [completeAddComparison, completeRemoveComparison, schoolId, user]);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;

    setLoading(true);
    try {
      if (isInComparison) {
        await completeRemoveComparison();
      } else {
        if (!user) {
          rememberPendingAuthAction({
            kind: "comparison",
            intent: "add",
            schoolId,
            next: getCurrentPath(),
            createdAt: Date.now(),
          });
          setLoginOpen(true);
          return;
        }

        await completeAddComparison();
      }
    } catch {
      showToast("操作失敗，請稍後再試", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className={`btn-icon compare-btn ${isInComparison ? "is-active" : ""}`}
        onClick={handleClick}
        disabled={loading}
        aria-label={isInComparison ? "移除對比" : "加入對比"}
        title={isInComparison ? "移除對比" : "加入對比"}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      </button>
      <LoginModal
        open={loginOpen}
        onClose={() => {
          setLoginOpen(false);
        }}
      />
    </>
  );
}
