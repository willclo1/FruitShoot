# Technical Implementation Guide

## Architecture Overview

### Component Hierarchy

```
TutorialProvider (Context)
└── TutorialLayer (at root _layout.tsx)
    └── TutorialOverlay (Modal Component)
        ├── SafeAreaView
        ├── Spotlight Masks (4x View)
        ├── Highlight Frame (Animated.View)
        ├── Glow Layer (View)
        └── Callout Sheet (Animated.View)
            ├── Arrows (conditional View)
            ├── Header
            ├── Narration Toggle
            ├── Step Content
            └── Footer Buttons
```

### Data Flow

```
TutorialProvider
  ├─ visible (boolean) → determines if overlay shows
  ├─ currentStepIndex (number) → current step in tour
  ├─ targets (object) → registry of target element bounds
  │  └─ { targetId: { x, y, width, height }, ... }
  │
  ├─ registerTarget(id, bounds) → called by TourTarget on mount
  ├─ unregisterTarget(id) → called by TourTarget on unmount
  ├─ getTargetRect(id) → returns bounds from registry
  │
  ├─ nextStep() → moves to next step
  ├─ prevStep() → moves to previous step
  ├─ startTutorial(fromIndex=0) → starts from specific step
  └─ closeTutorial() → hides overlay

TutorialOverlay
  ├─ receives: visible, steps, onClose
  ├─ reads: currentStepIndex, getTargetRect from context
  ├─ calculates: calloutPosition, spotlightMasks
  ├─ manages: narrationEnabled, calloutHeight
  ├─ animates: pulseScale, calloutOpacity
  └─ plays TTS via: tts.say(), tts.stop()

TourTarget (wrapper component)
  ├─ wraps: any UI element to enable highlighting
  ├─ on mount: measures element bounds, calls registerTarget(id, bounds)
  ├─ on unmount: calls unregisterTarget(id)
  └─ keeps overlay in sync with element position
```

---

## Positioning Calculation Flow

### Step 1: Get Target Bounds

```typescript
// From TutorialContext - already measured by TourTarget
const targetRect = getTargetRect(currentStep?.targetId);

// targetRect format:
{
  x: number;        // Left position relative to screen
  y: number;        // Top position relative to screen
  width: number;    // Element width
  height: number;   // Element height
}
```

### Step 2: Calculate Spotlight Masks

```typescript
// Function: calculateSpotlightMasks(targetRect, screenWidth, screenHeight, padding)

const spotlightMasks = targetRect
  ? calculateSpotlightMasks(targetRect, width, height, 8)
  : null;

// Returns:
{
  top: { x: 0, y: 0, width: width, height: padded.y },
  left: { x: 0, y: padded.y, width: padded.x, height: padded.height },
  right: { ... },
  bottom: { ... }
}
```

**Algorithm:**
```
1. Add padding around target: padded = calculateSpotlightPadding(target, 8)
2. Calculate space occupied by padded target
3. Remaining space = dim mask regions
4. Return 4 separate regions for rendering
```

### Step 3: Determine Best Placement

```typescript
// Function: determineBestPlacement(targetRect, screenHeight, calloutHeight, hint)

const { placement } = determineBestPlacement(
  targetRect,
  screenHeight,
  calloutHeight,
  currentStep?.placement  // "top" | "bottom" | "center"
);

// placement logic:
if (placementHint === "center") {
  return "center";  // No arrow, centered on screen
}

const spaceAbove = targetRect.y - CALLOUT_MARGIN;
const spaceBelow = screenHeight - (targetRect.y + targetRect.height) - CALLOUT_MARGIN;

if (placementHint === "top" && spaceAbove >= calloutHeight) {
  return "top";  // Try preferred placement
}
if (spaceBelow >= calloutHeight) {
  return "bottom";  // Try opposite
}
if (spaceAbove >= calloutHeight) {
  return "top";  // Fallback
}
if (spaceBelow >= calloutHeight) {
  return "bottom";  // Fallback
}
return "center";  // No room, overlap allowed
```

### Step 4: Calculate Final Position & Arrow

```typescript
// Function: calculateCalloutPosition(target, width, height, calloutWidth, calloutHeight, hint)

const calloutPosition = calculateCalloutPosition(
  targetRect,
  width,
  height,
  calloutWidth,
  calloutHeight,
  currentStep?.placement
);

// Returns:
{
  left: number;              // X position (centered on target, clamped)
  top: number;               // Y position (above/below, clamped)
  arrowLeft: number;         // Arrow X (within callout bounds)
  arrowDirection: "up" | "down" | null;  // Points toward target
}
```

**Detailed Algorithm:**

```typescript
// 1. Determine placement
const { placement } = determineBestPlacement(...);

// 2. Horizontal centering (on target or screen)
const targetCenterX = targetRect.x + targetRect.width / 2;
const calloutLeft = clamp(
  targetCenterX - calloutWidth / 2,  // Center on target
  SCREEN_PADDING,
  screenWidth - calloutWidth - SCREEN_PADDING
);

// 3. Vertical positioning
if (placement === "top") {
  calloutTop = targetRect.y - calloutHeight - CALLOUT_MARGIN;  // Above
  arrowDirection = "down";  // Point down
} else if (placement === "bottom") {
  calloutTop = targetRect.y + targetRect.height + CALLOUT_MARGIN;  // Below
  arrowDirection = "up";  // Point up
} else {
  calloutTop = (screenHeight - calloutHeight) / 2;  // Center
  arrowDirection = null;  // No arrow
}

// 4. Clamp vertical (prevent off-screen)
calloutTop = clamp(calloutTop, SCREEN_PADDING, screenHeight - calloutHeight - SCREEN_PADDING);

// 5. Arrow positioning (relative to callout)
const arrowLeft = clamp(
  targetCenterX - calloutLeft - ARROW_SIZE,  // Align with target
  SCREEN_PADDING + 4,
  calloutWidth - SCREEN_PADDING - ARROW_SIZE * 2 - 4
);
```

---

## Animation Implementation

### Pulse Animation (Highlight Border)

```typescript
// Setup (in component)
const pulseScale = useRef(new Animated.Value(1)).current;

// Trigger on step change
useEffect(() => {
  if (!visible) return;

  pulseScale.setValue(1);  // Reset to start
  
  Animated.sequence([
    // Grow phase: 1.0 → 1.12
    Animated.timing(pulseScale, {
      toValue: 1.12,
      duration: 400,
      useNativeDriver: true,  // ← Key: 60fps performance
    }),
    // Shrink phase: 1.12 → 1.0
    Animated.timing(pulseScale, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }),
  ]).start();
}, [currentStepIndex, visible, pulseScale]);

// Apply to frame
<Animated.View
  style={[
    styles.highlightFrame,
    {
      transform: [{ scale: pulseScale }],  // ← Animated scale
    },
  ]}
/>
```

**Timing:**
- Grow: 0ms → 400ms (scale 1.0 → 1.12)
- Shrink: 400ms → 800ms (scale 1.12 → 1.0)
- Total: 800ms per pulse
- Triggers: On each step change

### Fade-In Animation (Callout)

```typescript
// Setup
const calloutOpacity = useRef(new Animated.Value(0)).current;

// Trigger on step change (same effect)
useEffect(() => {
  if (!visible) return;

  calloutOpacity.setValue(0);  // Start transparent
  
  Animated.timing(calloutOpacity, {
    toValue: 1,  // Fade in
    duration: 300,
    useNativeDriver: true,
  }).start();
}, [currentStepIndex, visible, calloutOpacity]);

// Apply to callout
<Animated.View
  style={[
    styles.sheet,
    {
      opacity: calloutOpacity,  // ← Animated opacity
    },
  ]}
/>
```

**Timing:**
- Start: opacity 0 (invisible)
- End: opacity 1 (fully visible)
- Duration: 300ms
- Easing: Linear (default)

---

## Styling System

### Color Palette

```typescript
// Brand colors
const COLORS = {
  PRIMARY_DARK: "#193F3A",      // Dark green (headers, primary buttons)
  SECONDARY_DARK: "#1F4A44",    // Slightly lighter dark green (borders)
  HIGHLIGHT: "#A8D8CF",         // Light green (border, glow) ← NEW
  BACKGROUND: "#F6F3EE",        // Warm cream (callout background)
  
  // Text colors
  TEXT_PRIMARY: "#193F3A",      // Dark text
  TEXT_SECONDARY: "#21312F",    // Medium gray
  TEXT_TERTIARY: "#2B5751",     // Dimmer gray
  
  // Component backgrounds
  TOGGLE_BG: "#EAF3F1",        // Pale green
  PILL_BG: "#E3F1EE",          // Light green
  
  // Shadows & transparency
  MASK_DIM: "rgba(0, 0, 0, 0.68)",  // Dark overlay (68%)
  GLOW: "rgba(168, 216, 207, 0.15)",  // Subtle glow (15%)
};
```

### Border Styles

```typescript
// Highlight frame
highlightFrame: {
  borderWidth: 3,                              // Thick, visible
  borderColor: COLORS.HIGHLIGHT,              // Light green
  borderRadius: 16,                           // Modern corners
  backgroundColor: "rgba(168, 216, 207, 0.08)",  // 8% fill
  
  // iOS shadow
  shadowColor: COLORS.HIGHLIGHT,
  shadowOpacity: 0.25,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 0 },
  
  // Android shadow
  elevation: 4,
},

// Glow layer (outer ring)
highlightGlow: {
  backgroundColor: COLORS.GLOW,               // 15% opacity
  borderWidth: 1,
  borderColor: "rgba(168, 216, 207, 0.08)",  // Very subtle
  borderRadius: 20,                           // Larger radius
},
```

### Layout Spacing

```typescript
// Consistent spacing
const SPACING = {
  CALLOUT_PADDING: 18,      // Inside callout
  CALLOUT_GAP: 16,          // Between sections
  BUTTON_PADDING_V: 11,     // Vertical button padding
  BUTTON_PADDING_H: 10,     // Horizontal button padding
  BORDER_RADIUS: 18,        // Callout corners
  BORDER_RADIUS_BTN: 12,    // Button corners
};

// Applied in StyleSheet
sheet: {
  padding: SPACING.CALLOUT_PADDING,
  gap: SPACING.CALLOUT_GAP,
  borderRadius: SPACING.BORDER_RADIUS,
},
```

---

## Performance Considerations

### Animation Performance

**Why `useNativeDriver: true`?**
```
useNativeDriver: false (Default - JavaScript thread)
├─ Animation runs on JS thread
├─ Each frame:
│  ├─ Calculate new value
│  ├─ Call style setter
│  └─ Send to native renderer
├─ Problem: JS thread busy → drops frames
└─ Result: Jank at 30fps or less

useNativeDriver: true (Native thread)
├─ Animation serialized and sent to native
├─ Native thread handles frame updates
├─ No JS overhead per frame
├─ Result: Smooth 60fps
└─ Limitation: Can only animate transform, opacity
```

**Animated Values in Refs:**
```typescript
// BAD: Recreated on every render
const animation = new Animated.Value(0);  ❌

// GOOD: Persistent across renders
const animation = useRef(new Animated.Value(0)).current;  ✅
```

### Layout Optimization

**Batch Calculations:**
```typescript
// ✅ Good: All calculations done once
const calloutPosition = calculateCalloutPosition(...);
const spotlightMasks = calculateSpotlightMasks(...);
const targetVisible = isTargetVisible(...);

// ❌ Bad: Recalculate inside render loops
{
  spotlightMasks.map(mask => {
    const position = calculateSpotlightMasks(...);  // Inefficient!
  })
}
```

**Position Updates:**
- Positions recalculated on render (window resize, step change)
- No separate effect for position changes
- Prevents redundant calculations
- Still responsive to layout changes

---

## Extending the System

### Adding a New Step

```typescript
// 1. Define step in tutorialSteps.ts
{
  id: "my-feature",
  route: "/my-screen",          // Where element is located
  targetId: "my-element",       // Must match TourTarget id
  placement: "bottom",           // Preferred callout placement
  title: "My Feature Title",
  description: "What this feature does...",
  highlightLabel: "Feature Name",
  instruction: "How to use it...",  // Optional
  narration: "Custom speech...",    // Optional (defaults to title+description+instruction)
}

// 2. Wrap target element in TourTarget
<TourTarget id="my-element">
  <Pressable onPress={handlePress}>
    <Text>My Button</Text>
  </Pressable>
</TourTarget>

// 3. Test
- Play tutorial and check:
  - Element highlighted correctly
  - Callout positioned without overflow
  - Arrow points to center of element
  - TTS narration sounds good
```

### Creating a Custom Positioning Function

```typescript
// Add to tutorialPositioning.ts
export function calculateCustomPlacement(
  targetRect: ElementRect,
  screenWidth: number,
  screenHeight: number
): PlacementResult {
  // Custom logic here
  return { ... };
}

// Use in TutorialOverlay
const customPos = calculateCustomPlacement(targetRect, width, height);
```

### Styling Customizations

```typescript
// Change highlight color
highlightFrame: {
  borderColor: "#YOUR_COLOR",
  backgroundColor: "rgba(0, 0, 0, 0.1)",  // 10% fill
  shadowColor: "#YOUR_COLOR",
},

// Change border radius
highlightFrame: {
  borderRadius: 24,  // More rounded
},

// Change animation timing
Animated.timing(pulseScale, {
  toValue: 1.15,       // Bigger pulse
  duration: 600,       // Longer duration
  useNativeDriver: true,
})
```

---

## Debugging Guide

### Issue: Highlight not appearing

```typescript
// Check:
1. Is TourTarget wrapping the element?
   <TourTarget id="my-id">
     <MyElement />
   </TourTarget>

2. Is the id correct in tutorialSteps.ts?
   targetId: "my-id"  ← Must match

3. Is element mounted when step runs?
   └─ Use getTargetRect(id) return null → element not registered

4. Is element off-screen?
   └─ Use isTargetVisible() to check bounds

// Debug code:
const rect = getTargetRect(currentStep?.targetId);
console.log("Target rect:", rect);
console.log("Target visible:", targetVisible);
```

### Issue: Callout appears off-screen

```typescript
// Check positioning calculations:
console.log("Screen dims:", width, height);
console.log("Target rect:", targetRect);
console.log("Callout position:", calloutPosition);

// Verify clamp logic:
console.log("Safe bounds:", {
  minLeft: SCREEN_PADDING,
  maxLeft: width - calloutWidth - SCREEN_PADDING,
  minTop: SCREEN_PADDING,
  maxTop: height - calloutHeight - SCREEN_PADDING,
});
```

### Issue: Arrow not pointing correctly

```typescript
// Arrow position calculation:
// arrowLeft = clamp(targetCenterX - calloutLeft - ARROW_SIZE, ...)

// Debug:
const targetCenterX = targetRect.x + targetRect.width / 2;
const relativeToCallout = targetCenterX - calloutPosition.left;
console.log("Arrow should point at:", relativeToCallout);
console.log("Arrow actual position:", calloutPosition.arrowLeft);
```

### Issue: Animation stuttering

```typescript
// Check:
1. useNativeDriver: true on all animations?
   useNativeDriver: true,  ← Must be true for transform/opacity

2. Is heavy computation blocking JS thread?
   └─ Move to useEffect, not in render

3. Are refs properly initialized?
   const scale = useRef(new Animated.Value(1)).current;  ✅

4. Test on lower-end device
   └─ Performance is device-specific
```

---

## Testing Strategies

### Unit Testing (with Jest)

```typescript
// Test positioning functions
describe("calculateCalloutPosition", () => {
  it("centers callout horizontally on target", () => {
    const target = { x: 100, y: 100, width: 50, height: 50 };
    const result = calculateCalloutPosition(target, 400, 800, 200, 300);
    
    // Target center: 100 + 25 = 125
    // Callout left: 125 - 100 = 25 (centered)
    expect(result.left).toBe(25);
  });

  it("places callout above when space available", () => {
    const target = { x: 150, y: 400, width: 100, height: 50 };
    const result = calculateCalloutPosition(target, 400, 800, 300, 200);
    
    // Space above: 400 - 16 - 300 = 84 ❌ Not enough
    // Falls back to center
    expect(result.arrowDirection).toBeNull();
  });
});
```

### Integration Testing (on device)

```typescript
// Checklist:
- [ ] All 8 steps visible
- [ ] Cross-page navigation works
- [ ] Highlight appears correctly
- [ ] Callout positioned well
- [ ] Arrow points to element
- [ ] No off-screen overflow
- [ ] TTS narration synced
- [ ] Buttons functional
- [ ] Animations smooth
- [ ] Works in landscape
- [ ] Works on multiple devices
```

---

## Performance Metrics

### Expected Frame Rates
- Animation: 60fps (with useNativeDriver)
- Position recalc: < 5ms
- Render cycle: < 16ms

### Memory Usage
- Context size: ~200 bytes (per target)
- Animated values: ~50 bytes (per animation)
- Overall footprint: < 1MB

### Bundle Size Impact
- `tutorialPositioning.ts`: ~8KB
- `TutorialOverlay.tsx`: ~12KB
- Total tutorial system: ~25KB (minified)
