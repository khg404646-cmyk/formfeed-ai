"use client";

import { useEffect, useState } from "react";
import { InlineError } from "./StatusPanels";

type TrainerProfileEditorProps = {
  displayName: string;
  centerName: string;
  onDisplayNameChange: (value: string) => void;
  onCenterNameChange: (value: string) => void;
  onSave: () => void | Promise<void>;
  saving?: boolean;
  saveError?: string | null;
  disabled?: boolean;
};

export default function TrainerProfileEditor({
  displayName,
  centerName,
  onDisplayNameChange,
  onCenterNameChange,
  onSave,
  saving = false,
  saveError = null,
  disabled = false,
}: TrainerProfileEditorProps) {
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    if (!savedFlash) return;
    const t = setTimeout(() => setSavedFlash(false), 2000);
    return () => clearTimeout(t);
  }, [savedFlash]);

  const handleSave = async () => {
    await onSave();
    setSavedFlash(true);
  };

  return (
    <section className="card border border-[#e5e7eb] bg-white p-4">
      <h2 className="text-sm font-bold text-[#111827]">회원 공유용 트레이너 프로필</h2>
      <p className="mt-1 text-xs leading-relaxed text-[#6b7280]">
        이름·센터명은 공유 링크 하단 리포트에 표시됩니다. 이 기기에 입력한 값은 자동으로
        불러옵니다.
      </p>

      <div className="mt-3 space-y-3">
        <label className="block">
          <span className="text-xs font-semibold text-[#374151]">트레이너 이름</span>
          <input
            type="text"
            value={displayName}
            onChange={(e) => onDisplayNameChange(e.target.value)}
            disabled={disabled}
            placeholder="예: 홍길동 코치"
            maxLength={40}
            className="mt-1 w-full rounded-xl border border-[#e5e7eb] px-3 py-2.5 text-sm disabled:opacity-50"
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-[#374151]">센터 / 지점명</span>
          <input
            type="text"
            value={centerName}
            onChange={(e) => onCenterNameChange(e.target.value)}
            disabled={disabled}
            placeholder="예: OO 피트니스 강남점"
            maxLength={60}
            className="mt-1 w-full rounded-xl border border-[#e5e7eb] px-3 py-2.5 text-sm disabled:opacity-50"
          />
        </label>
      </div>

      {saveError ? (
        <div className="mt-3">
          <InlineError>{saveError}</InlineError>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => void handleSave()}
        disabled={disabled || saving}
        className="mt-3 w-full rounded-xl bg-[#111827] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving ? "저장 중..." : "프로필 저장"}
      </button>

      {savedFlash ? (
        <p className="mt-2 text-center text-xs font-semibold text-[#166534]">
          저장되었습니다. 공유 링크에 반영됩니다.
        </p>
      ) : null}
    </section>
  );
}
