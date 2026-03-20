"use client";

import { useCallback, useEffect, useState } from "react";
import { addFavorite, removeFavorite } from "@/lib/api-client";
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
  initialFavorited: boolean;
  onToggle?: (isFavorited: boolean) => void;
};

export function FavoriteButton({ schoolId, initialFavorited, onToggle }: Props) {
  const [isFavorited, setIsFavorited] = useState(initialFavorited);
  const [loading, setLoading] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    setIsFavorited(initialFavorited);
  }, [initialFavorited]);

  const completeAddFavorite = useCallback(async () => {
    const result = await addFavorite(schoolId);
    if (result?.error?.code === "UNAUTHORIZED") {
      rememberPendingAuthAction({
        kind: "favorite",
        intent: "add",
        schoolId,
        next: getCurrentPath(),
        createdAt: Date.now(),
      });
      setLoginOpen(true);
      return;
    }

    if (result?.error) {
      throw new Error(result.error.message ?? "Failed to add favorite");
    }

    setIsFavorited(true);
    showToast("已加入收藏", "success");
    onToggle?.(true);
  }, [onToggle, schoolId]);

  const completeRemoveFavorite = useCallback(async () => {
    const result = await removeFavorite(schoolId);
    if (result?.error?.code === "UNAUTHORIZED") {
      rememberPendingAuthAction({
        kind: "favorite",
        intent: "remove",
        schoolId,
        next: getCurrentPath(),
        createdAt: Date.now(),
      });
      setLoginOpen(true);
      return;
    }
    if (result?.error) {
      throw new Error(result.error.message ?? "Failed to remove favorite");
    }
    setIsFavorited(false);
    showToast("已取消收藏", "info");
    onToggle?.(false);
  }, [onToggle, schoolId]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const pending = consumePendingAuthAction(
      (action) =>
        action.kind === "favorite" &&
        action.schoolId === schoolId &&
        (action.intent === "add" || action.intent === "remove")
    );

    if (!pending) {
      return;
    }

    const run = pending.intent === "add" ? completeAddFavorite : completeRemoveFavorite;
    void run().catch(() => {
      showToast("操作失敗，請稍後再試", "error");
    });
  }, [completeAddFavorite, completeRemoveFavorite, schoolId, user]);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;

    setLoading(true);
    try {
      if (isFavorited) {
        await completeRemoveFavorite();
      } else {
        if (!user) {
          rememberPendingAuthAction({
            kind: "favorite",
            intent: "add",
            schoolId,
            next: getCurrentPath(),
            createdAt: Date.now(),
          });
          setLoginOpen(true);
          return;
        }

        await completeAddFavorite();
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
        className={`btn-icon favorite-btn ${isFavorited ? "is-active" : ""}`}
        onClick={handleClick}
        disabled={loading}
        aria-label={isFavorited ? "取消收藏" : "加入收藏"}
        title={isFavorited ? "取消收藏" : "加入收藏"}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill={isFavorited ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
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
