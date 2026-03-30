/**
 * Utility functions for tutorial overlay positioning and spotlight calculations.
 * Handles target element positioning, callout placement, and arrow direction logic.
 */

export type ElementRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type PlacementHint = "top" | "bottom" | "center";
export type ArrowDirection = "up" | "down" | null;
export type CalloutPosition = {
  left: number;
  top: number;
  arrowLeft: number;
  arrowDirection: ArrowDirection;
};

const CALLOUT_MARGIN = 16; // Space between target and callout
const ARROW_SIZE = 10; // Arrow triangle base radius
const SCREEN_PADDING = 12; // Minimum padding from screen edges

/**
 * Calculate spotlight padding around target element.
 * Creates visual breathing room around the highlighted element.
 */
export function calculateSpotlightPadding(
  targetRect: ElementRect,
  padding: number = 8
): ElementRect {
  return {
    x: Math.max(0, targetRect.x - padding),
    y: Math.max(0, targetRect.y - padding),
    width: targetRect.width + padding * 2,
    height: targetRect.height + padding * 2,
  };
}

/**
 * Determine the best placement for callout based on available space.
 * Tries preferred placement first, then falls back to available space.
 *
 * Returns: ("top" | "bottom" | "center") and whether there's room above/below.
 */
export function determineBestPlacement(
  targetRect: ElementRect,
  screenHeight: number,
  calloutHeight: number,
  placementHint?: PlacementHint
): { placement: "top" | "bottom" | "center"; canPlaceAbove: boolean; canPlaceBelow: boolean } {
  const spaceAbove = targetRect.y - CALLOUT_MARGIN;
  const spaceBelow = screenHeight - (targetRect.y + targetRect.height) - CALLOUT_MARGIN;

  const canPlaceAbove = spaceAbove >= calloutHeight + 8;
  const canPlaceBelow = spaceBelow >= calloutHeight + 8;

  if (placementHint === "center") {
    return { placement: "center", canPlaceAbove, canPlaceBelow };
  }

  const preferTop = placementHint === "top";

  // Try preferred placement first
  if (preferTop && canPlaceAbove) {
    return { placement: "top", canPlaceAbove, canPlaceBelow };
  }
  if (!preferTop && canPlaceBelow) {
    return { placement: "bottom", canPlaceAbove, canPlaceBelow };
  }

  // Fallback to best available space
  if (canPlaceAbove) {
    return { placement: "top", canPlaceAbove, canPlaceBelow };
  }
  if (canPlaceBelow) {
    return { placement: "bottom", canPlaceAbove, canPlaceBelow };
  }

  // If neither fits, center and let it overlap (user can scroll)
  return { placement: "center", canPlaceAbove, canPlaceBelow };
}

/**
 * Calculate optimal callout position with intelligent placement and overflow prevention.
 *
 * Logic:
 * 1. Horizontally center callout near target (with screen edge clamping)
 * 2. Vertically place above or below target (with fallback to center)
 * 3. Adjust arrow position to point toward target
 * 4. Ensure arrow stays within callout bounds
 */
export function calculateCalloutPosition(
  targetRect: ElementRect | null,
  screenWidth: number,
  screenHeight: number,
  calloutWidth: number,
  calloutHeight: number,
  placementHint?: PlacementHint
): CalloutPosition {
  // Default: center callout on screen with no arrow
  const defaultPosition: CalloutPosition = {
    left: (screenWidth - calloutWidth) / 2,
    top: Math.max(SCREEN_PADDING, (screenHeight - calloutHeight) / 2),
    arrowLeft: calloutWidth / 2 - ARROW_SIZE,
    arrowDirection: null,
  };

  if (!targetRect) {
    return defaultPosition;
  }

  // If placement is "center", just center the callout
  if (placementHint === "center") {
    return defaultPosition;
  }

  const { placement } = determineBestPlacement(
    targetRect,
    screenHeight,
    calloutHeight,
    placementHint
  );

  if (placement === "center") {
    return defaultPosition;
  }

  // Calculate horizontal position (center on target)
  const targetCenterX = targetRect.x + targetRect.width / 2;
  let calloutLeft = clamp(
    targetCenterX - calloutWidth / 2,
    SCREEN_PADDING,
    screenWidth - calloutWidth - SCREEN_PADDING
  );

  // Calculate vertical position based on placement
  let calloutTop: number;
  let arrowDirection: ArrowDirection;

  if (placement === "top") {
    // Place callout above target
    calloutTop = Math.max(
      SCREEN_PADDING,
      targetRect.y - calloutHeight - CALLOUT_MARGIN
    );
    arrowDirection = "down"; // Arrow points down toward target
  } else {
    // Place callout below target
    calloutTop = Math.min(
      screenHeight - calloutHeight - SCREEN_PADDING,
      targetRect.y + targetRect.height + CALLOUT_MARGIN
    );
    arrowDirection = "up"; // Arrow points up toward target
  }

  // Calculate arrow horizontal position (point at target center)
  const arrowLeft = clamp(
    targetCenterX - calloutLeft - ARROW_SIZE,
    SCREEN_PADDING + 4,
    calloutWidth - SCREEN_PADDING - ARROW_SIZE * 2 - 4
  );

  return {
    left: calloutLeft,
    top: calloutTop,
    arrowLeft,
    arrowDirection,
  };
}

/**
 * Clamp a number between min and max values.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}

/**
 * Calculate the spotlight mask dimensions for a given target element.
 * Returns 4 separate mask regions (top, left, right, bottom).
 *
 * The spotlight has padding around the target element for visual balance.
 */
export function calculateSpotlightMasks(
  targetRect: ElementRect,
  screenWidth: number,
  screenHeight: number,
  padding: number = 8
): {
  top: ElementRect;
  left: ElementRect;
  right: ElementRect;
  bottom: ElementRect;
} {
  const padded = calculateSpotlightPadding(targetRect, padding);

  return {
    // Top mask
    top: {
      x: 0,
      y: 0,
      width: screenWidth,
      height: padded.y,
    },
    // Left mask
    left: {
      x: 0,
      y: padded.y,
      width: padded.x,
      height: padded.height,
    },
    // Right mask
    right: {
      x: padded.x + padded.width,
      y: padded.y,
      width: Math.max(0, screenWidth - (padded.x + padded.width)),
      height: padded.height,
    },
    // Bottom mask
    bottom: {
      x: 0,
      y: padded.y + padded.height,
      width: screenWidth,
      height: Math.max(0, screenHeight - (padded.y + padded.height)),
    },
  };
}

/**
 * Check if a target element is partially visible within current screen bounds.
 * Useful for determining if the element has scrolled out of view.
 */
export function isTargetVisible(
  targetRect: ElementRect,
  screenWidth: number,
  screenHeight: number
): boolean {
  return !(
    targetRect.x + targetRect.width < 0 ||
    targetRect.x > screenWidth ||
    targetRect.y + targetRect.height < 0 ||
    targetRect.y > screenHeight
  );
}
