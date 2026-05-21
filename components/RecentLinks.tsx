"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { getExerciseLabel } from "../lib/exercise-labels";
import type { RecentLinkItem } from "../types/formfeed";

const RECENT_LINKS_KEY = "formfeed_recent_links";
const RECENT_LINKS_EVENT = "formfeed_recent_links_change";

/** Must be stable reference for useSyncExternalStore server snapshot. */
const SERVER_SNAPSHOT: RecentLinkItem[] = [];

let cachedRaw: string | null | undefined;
let cachedItems: RecentLinkItem[] = SERVER_SNAPSHOT;

function formatKoreanDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function parseRecentLinkItems(raw: string | null): RecentLinkItem[] {
  if (!raw) return SERVER_SNAPSHOT;
  try {
    const parsed = JSON.parse(raw) as RecentLinkItem[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : SERVER_SNAPSHOT;
  } catch {
    return SERVER_SNAPSHOT;
  }
}

function getServerSnapshot(): RecentLinkItem[] {
  return SERVER_SNAPSHOT;
}

function getClientSnapshot(): RecentLinkItem[] {
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(RECENT_LINKS_KEY);
  } catch {
    return SERVER_SNAPSHOT;
  }

  if (raw === cachedRaw) {
    return cachedItems;
  }

  cachedRaw = raw;
  cachedItems = parseRecentLinkItems(raw);
  return cachedItems;
}

function subscribeRecentLinks(onStoreChange: () => void) {
  const handler = () => {
    cachedRaw = undefined;
    onStoreChange();
  };
  window.addEventListener(RECENT_LINKS_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(RECENT_LINKS_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

/** localStorage 갱신 후 목록 UI를 다시 읽게 합니다 (홈 업로드 완료 등). */
export function notifyRecentLinksUpdated() {
  window.dispatchEvent(new Event(RECENT_LINKS_EVENT));
}

export default function RecentLinks() {
  const items = useSyncExternalStore(
    subscribeRecentLinks,
    getClientSnapshot,
    getServerSnapshot,
  );

  const handleRemove = (sessionId: string) => {
    const next = items.filter((item) => item.sessionId !== sessionId);
    try {
      window.localStorage.setItem(RECENT_LINKS_KEY, JSON.stringify(next));
      notifyRecentLinksUpdated();
    } catch {
      // ignore localStorage write errors
    }
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <section className="mt-6">
      <h2 className="mb-3 text-sm font-semibold text-[#374151]">최근 편집 링크</h2>
      <ul className="space-y-2">
        {items.map((item) => (
          <li
            key={item.sessionId}
            className="flex items-center justify-between gap-2 rounded-xl border border-[#e5e7eb] bg-white px-3 py-3"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[#111827]">
                {getExerciseLabel(item.exerciseType)}
              </p>
              <p className="text-xs text-[#6b7280]">{formatKoreanDate(item.createdAt)}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Link
                href={`/editor/${item.sessionId}?edit_token=${encodeURIComponent(item.editToken)}`}
                className="rounded-lg bg-[#111827] px-3 py-2 text-xs font-semibold text-white"
              >
                열기
              </Link>
              <button
                type="button"
                onClick={() => handleRemove(item.sessionId)}
                className="rounded-lg border border-[#e5e7eb] px-3 py-2 text-xs font-semibold text-[#374151]"
              >
                삭제
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
