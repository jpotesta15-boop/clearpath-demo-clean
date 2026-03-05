# Motion guidelines

Short reference for when and how to use motion. All timings live in [lib/theme/tokens.ts](../lib/theme/tokens.ts) and [lib/theme/animation.ts](../lib/theme/animation.ts).

## When to use

- **Page enter/exit:** Fade + small y (8px). Handled by `AnimatedPage` / `AnimatedPageWithExit` in layouts. No layout shift; opacity and transform only.
- **List/card entrance:** Stagger children (e.g. 50ms per item) with `staggerContainerVariants` and `staggerItemVariants`. Use on dashboard tiles, schedule cards, client list, programs, messages. Cap total delay on long lists.
- **Card hover:** Interactive cards use `cardHoverTransition` (lift + shadow). Ensure focus-visible state for keyboard.
- **Modal:** Use `modalTransition` (scale 0.98 → 1 + opacity) for overlay dialogs. Backdrop fade in/out.
- **Button tap:** Optional scale 0.98 or opacity; keep under 150ms. Already on Button via `active:scale-[0.98]`.
- **Loading:** Full-page `<Loading />` or inline spinner; skeletons for known layout (e.g. `SkeletonCard`, `SkeletonLine`).

## Reduced motion

Respect `prefers-reduced-motion: reduce`: no stagger, shorter or no transitions. Use Tailwind `motion-reduce:animate-none` on animated elements. Skeleton uses `motion-reduce:animate-none`. When adding new motion, gate stagger or use a hook that reads `window.matchMedia('(prefers-reduced-motion: reduce)')` and disables stagger / shortens duration.

## Performance

Prefer `transform` and `opacity` only; avoid animating layout or box-shadow where it causes jank.

## Optional: Lottie

For loading or empty-state illustrations: install `lottie-react`, load JSON (from After Effects/Bodymovin or LottieFiles), and render in a wrapper that respects `prefers-reduced-motion` (fallback to static image or spinner). Keep file size small for full-page or inline loaders.
