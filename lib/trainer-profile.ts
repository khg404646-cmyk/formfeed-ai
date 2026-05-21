export type TrainerProfile = {
  displayName: string;
  centerName: string;
};

const STORAGE_KEY = "formfeed_trainer_profiles";
const RECENT_LINKS_KEY = "formfeed_recent_links";

type ProfileMap = Record<string, TrainerProfile>;

function readMap(): ProfileMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as ProfileMap;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeMap(map: ProfileMap): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export function readTrainerProfileLocal(sessionId: string): TrainerProfile | null {
  if (!sessionId) return null;
  const entry = readMap()[sessionId];
  if (!entry) return null;
  const displayName = entry.displayName?.trim() ?? "";
  const centerName = entry.centerName?.trim() ?? "";
  if (!displayName && !centerName) return null;
  return { displayName, centerName };
}

export function saveTrainerProfileLocal(
  sessionId: string,
  profile: TrainerProfile,
): void {
  if (!sessionId) return;
  const map = readMap();
  map[sessionId] = {
    displayName: profile.displayName.trim(),
    centerName: profile.centerName.trim(),
  };
  writeMap(map);
}

function readRecentLinkTrainer(sessionId: string): TrainerProfile | null {
  if (typeof window === "undefined" || !sessionId) return null;
  try {
    const raw = window.localStorage.getItem(RECENT_LINKS_KEY);
    if (!raw) return null;
    const items = JSON.parse(raw) as Array<{
      sessionId?: string;
      trainerDisplayName?: string;
      trainerCenterName?: string;
    }>;
    if (!Array.isArray(items)) return null;
    const item = items.find((x) => x.sessionId === sessionId);
    if (!item) return null;
    const displayName = item.trainerDisplayName?.trim() ?? "";
    const centerName = item.trainerCenterName?.trim() ?? "";
    if (!displayName && !centerName) return null;
    return { displayName, centerName };
  } catch {
    return null;
  }
}

export function resolveTrainerProfile(
  sessionId: string,
  fromDb?: {
    trainer_display_name?: string | null;
    trainer_center_name?: string | null;
  },
): TrainerProfile {
  const dbName = fromDb?.trainer_display_name?.trim() ?? "";
  const dbCenter = fromDb?.trainer_center_name?.trim() ?? "";
  if (dbName || dbCenter) {
    return { displayName: dbName, centerName: dbCenter };
  }
  const local = readTrainerProfileLocal(sessionId);
  if (local) return local;
  const recent = readRecentLinkTrainer(sessionId);
  if (recent) return recent;
  return { displayName: "", centerName: "" };
}

/** Share page display — empty fields fall back to defaults. */
export function trainerProfileForShare(
  fromDb?: {
    trainer_display_name?: string | null;
    trainer_center_name?: string | null;
  },
  fallbacks?: Partial<TrainerProfile>,
): { trainerName: string; trainerCenter: string } {
  const name = fromDb?.trainer_display_name?.trim() || fallbacks?.displayName?.trim();
  const center = fromDb?.trainer_center_name?.trim() || fallbacks?.centerName?.trim();
  return {
    trainerName: name || "담당 트레이너",
    trainerCenter: center || "FormFeed AI 스포츠 코칭",
  };
}
