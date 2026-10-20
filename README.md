# Storybook React Native — iPad crash when collapsing a sidebar group

Clicking a sidebar group to **collapse** it kills the app on iPadOS. Expanding is
fine, and iPhone is unaffected.

The sidebar's tree rows set `cursor: 'pointer'`, which React Native turns into a
`UIHoverStyle` on iOS. When a pointer hovers such a row, UIKit inserts an extra
view next to Fabric's children, and the index-based unmount that follows asserts.

## Reproduce

```bash
npm install
npx expo run:ios --device "iPad Pro 13-inch (M5)"
```

Then, **with a mouse or trackpad** (not the touch simulator):

1. Move the pointer onto the **`Nested`** row and leave it there for a second, so
   iPadOS draws the hover effect on the row.
2. Click it to collapse.
3. The app dies immediately.

The sidebar starts fully expanded (`DEMO > Nested > Widget > One / Two`), so no
setup clicks are needed.

## Three things are required

Miss any one of them and it looks like it does not reproduce:

1. **A Debug build.** The crash is an `RCTAssert`, and React Native compiles those
   out when `NS_BLOCK_ASSERTIONS` is defined. In Release the index check is skipped
   and the unmount falls through to `removeFromSuperview`, which removes the correct
   view by identity, so nothing goes wrong. **Expo Go cannot reproduce this** — its
   native runtime is a Release build. Use `npx expo run:ios` (Debug is the default).
2. **A real hovering pointer** — mouse, trackpad, or Apple Pencil Pro. Collapsing
   the same row by touch never crashes, because without hover the native subview
   order never drifts.
3. **An iPad wide enough for the desktop sidebar.** Storybook switches to it at
   `width >= 1000`, so use an iPad Pro 13" in portrait, or any iPad in landscape.

## Crash

```
*** Assertion failure in -[RCTViewComponentView unmountChildComponentView:index:](),
    RCTViewComponentView.mm:268
*** Terminating app due to uncaught exception 'NSInternalInconsistencyException',
    reason: 'Attempt to unmount a view which has a different index.
     (parent: <RCTViewComponentView: 0x11c0ae680; frame = (14 90; 211 96); tag = 124>,
      child:  <RCTViewComponentView: 0x11c1e2300; frame = (0 76; 211 28); tag = 220>,
      index: 2, actual index: 4, tag at index: 118)'
```

The index is off by two — the hover platter view and its companion.

## Root cause

`@storybook/react-native-ui` sets `cursor: 'pointer'` on the tree rows, in
`src/Tree.tsx` and `src/TreeNode.tsx`.

On iOS 17+, React Native maps `cursor: 'pointer'` to a `UIHoverStyle` built with
`UIHoverAutomaticEffect` (`RCTViewComponentView.mm`, "Stage 1.5. Cursor / Hover
Effects"). Hovering such a view on iPadOS makes UIKit insert a
`_UIPointerEffectPlatterView` as a sibling inside the same container.

Fabric mounts and unmounts children by **index** into
`currentContainerView.subviews`, and that array now holds a view Fabric does not
know about. Collapsing a group unmounts rows, the indices no longer line up, and
the assertion aborts the process. Expanding only inserts, which is why it survives.

## Verified A/B

iPad Pro 13" simulator, iPadOS 27, Debug build, RN 0.88.0, Storybook RN 10.7.0 —
hover, then click the `Nested` row:

| `@storybook/react-native-ui` | Result |
| --- | --- |
| stock | crashes every time, assertion in the device log |
| `cursor: 'pointer'` removed | collapses cleanly, process survives, no assertion |

Same binary, same gesture, same coordinates; only the style differed.
`patches/storybook-react-native-ui-no-cursor-pointer.patch` is that exact change.

> Apply the patch to `src/*.tsx`, not `dist/index.js` — the package's
> `"react-native": "src/index.tsx"` field is what Metro resolves.

## Suggested fix

`cursor` is a desktop affordance with no visual effect on a touch-first iPad UI,
but on iOS it opts every row into `UIHoverAutomaticEffect`. Dropping it, or gating
it to `Platform.OS === 'web' | 'macos' | 'windows'`, removes the exposure without
waiting on React Native.

## Upstream

The underlying React Native bug, reported independently of Storybook:

- Issue: https://github.com/facebook/react-native/issues/55489
- Open fix PR: https://github.com/facebook/react-native/pull/58686

Still unmerged as of React Native 0.88.0. Production apps are not affected, since
Release builds compile the assertion out — but Storybook's users are developers
running Debug builds, so in practice the exposure is complete.

## Versions

| | |
| --- | --- |
| `@storybook/react-native` | 10.7.0 |
| `storybook` | 10.6.3 |
| `react-native` | 0.88.0 |
| `expo` | SDK 58 |
| Device | iPad simulator or hardware, iPadOS 26 / 27 |
| Build configuration | Debug |
| Architecture | New Architecture (Fabric) |

Also reproduces on React Native 0.86.3 / Expo SDK 57.
