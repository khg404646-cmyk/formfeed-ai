import type { ArrowDirection, ArrowPosition } from "../types/formfeed";

/** Popup card anchor on 9:16 frame (percentage-based). */
const POPUP_POSITION: Record<ArrowPosition, string> = {
  "top-left": "left-[6%] top-[6%]",
  "top-center": "left-1/2 top-[6%] -translate-x-1/2",
  "top-right": "right-[6%] top-[6%]",
  "middle-left": "left-[6%] top-1/2 -translate-y-1/2",
  "middle-center": "left-1/2 top-[38%] -translate-x-1/2",
  "middle-right": "right-[6%] top-1/2 -translate-y-1/2",
  "bottom-left": "left-[6%] bottom-[22%]",
  "bottom-center": "left-1/2 bottom-[20%] -translate-x-1/2",
  "bottom-right": "right-[6%] bottom-[22%]",
};

/** Body highlight dot — toward athlete center from popup anchor. */
const BODY_DOT: Record<ArrowPosition, string> = {
  "top-left": "left-[28%] top-[32%]",
  "top-center": "left-1/2 top-[36%] -translate-x-1/2",
  "top-right": "right-[28%] top-[32%]",
  "middle-left": "left-[32%] top-[48%]",
  "middle-center": "left-1/2 top-[52%] -translate-x-1/2",
  "middle-right": "right-[32%] top-[48%]",
  "bottom-left": "left-[30%] top-[62%]",
  "bottom-center": "left-1/2 top-[66%] -translate-x-1/2",
  "bottom-right": "right-[30%] top-[62%]",
};

const ARROW_ROTATION: Record<ArrowDirection, string> = {
  up: "-rotate-90",
  down: "rotate-90",
  left: "rotate-180",
  right: "rotate-0",
};

const BOTTOM_ROW: ArrowPosition[] = ["bottom-left", "bottom-center", "bottom-right"];

/** Native controls (~52–64px) + 24px margin + notch — VideoPlayer overlay inset. */
export const CONTROLS_SAFE_INSET_BOTTOM = "5.75rem";

/** Horizontal breathing room inside 9:16 frame. */
export const CONTROLS_SAFE_INSET_X = "0.75rem";

export const CONTROLS_SAFE_INSET_TOP = "0.75rem";

/** Bottom inset with safe-area (iOS home indicator, landscape). */
export function getOverlaySafeBottom(active: boolean): string | undefined {
  return active
    ? `max(${CONTROLS_SAFE_INSET_BOTTOM}, calc(env(safe-area-inset-bottom, 0px) + 3.5rem))`
    : undefined;
}

/** Bottom 9-grid cells remap upward so popups never sit on the progress bar. */
const POPUP_POSITION_CONTROLS_SAFE: Record<ArrowPosition, string> = {
  "top-left": POPUP_POSITION["top-left"],
  "top-center": POPUP_POSITION["top-center"],
  "top-right": POPUP_POSITION["top-right"],
  "middle-left": POPUP_POSITION["middle-left"],
  "middle-center": POPUP_POSITION["middle-center"],
  "middle-right": POPUP_POSITION["middle-right"],
  "bottom-left": "left-[6%] top-[44%]",
  "bottom-center": "left-1/2 top-[40%] -translate-x-1/2",
  "bottom-right": "right-[6%] top-[44%]",
};

export function getPopupPositionClass(
  position: ArrowPosition,
  guardControls = false,
): string {
  const map = guardControls ? POPUP_POSITION_CONTROLS_SAFE : POPUP_POSITION;
  return map[position] ?? map["middle-center"];
}

export function isBottomGridRow(position: ArrowPosition): boolean {
  return BOTTOM_ROW.includes(position);
}

export function getBodyDotClass(position: ArrowPosition): string {
  return BODY_DOT[position] ?? BODY_DOT["middle-center"];
}

export function getGuideArrowRotation(direction: ArrowDirection): string {
  return ARROW_ROTATION[direction] ?? ARROW_ROTATION["down"];
}
