import * as React from "react";

import { ControllerSettings } from "../../types.js";
import { UseSensors } from "../../hooks/useSensors.js";
import { useEventCallback } from "../../hooks/useEventCallback.js";
import { usePointerEvents } from "../../hooks/usePointerEvents.js";

enum Gesture {
  NONE,
  SWIPE,
  PULL,
}

const SWIPE_THRESHOLD = 30;

export function usePointerSwipe<T extends Element = Element>(
  { disableSwipeNavigation }: ControllerSettings,
  subscribeSensors: UseSensors<T>["subscribeSensors"],
  isSwipeValid: (offset: number) => boolean,
  containerWidth: number,
  swipeAnimationDuration: number,
  onSwipeStart: () => void,
  onSwipeProgress: (offset: number) => void,
  onSwipeFinish: (offset: number, duration: number) => void,
  onSwipeCancel: (offset: number) => void,
  pullUpEnabled: boolean,
  pullDownEnabled: boolean,
  onPullStart: () => void,
  onPullProgress: (offset: number) => void,
  onPullFinish: (offset: number, duration: number) => void,
  onPullCancel: (offset: number) => void,
) {
  const offset = React.useRef<number>(0);
  const pointers = React.useRef<React.PointerEvent[]>([]);
  const activePointer = React.useRef<number>(undefined);
  const startTime = React.useRef<number>(0);
  const gesture = React.useRef(Gesture.NONE);

  const clearPointer = React.useCallback((event: React.PointerEvent) => {
    if (activePointer.current === event.pointerId) {
      activePointer.current = undefined;
      gesture.current = Gesture.NONE;
    }

    const currentPointers = pointers.current;
    currentPointers.splice(
      0,
      currentPointers.length,
      ...currentPointers.filter((p) => p.pointerId !== event.pointerId),
    );
  }, []);

  const addPointer = React.useCallback(
    (event: React.PointerEvent) => {
      clearPointer(event);
      event.persist();
      pointers.current.push(event);
    },
    [clearPointer],
  );

  const onPointerDown = useEventCallback((event: React.PointerEvent) => {
    addPointer(event);
  });

  const exceedsPullThreshold = (value: number, threshold: number) =>
    (pullDownEnabled && value > threshold) || (pullUpEnabled && value < -threshold);

  const onPointerUp = useEventCallback((event: React.PointerEvent) => {
    if (pointers.current.find((x) => x.pointerId === event.pointerId) && activePointer.current === event.pointerId) {
      const duration = Date.now() - startTime.current;
      const currentOffset = offset.current;

      if (gesture.current === Gesture.SWIPE) {
        if (
          Math.abs(currentOffset) > 0.3 * containerWidth ||
          (Math.abs(currentOffset) > 5 && duration < swipeAnimationDuration)
        ) {
          onSwipeFinish(currentOffset, duration);
        } else {
          onSwipeCancel(currentOffset);
        }
      } else if (gesture.current === Gesture.PULL) {
        if (exceedsPullThreshold(currentOffset, 2 * SWIPE_THRESHOLD)) {
          onPullFinish(currentOffset, duration);
        } else {
          onPullCancel(currentOffset);
        }
      }

      offset.current = 0;
      gesture.current = Gesture.NONE;
    }

    clearPointer(event);
  });

  const onPointerMove = useEventCallback((event: React.PointerEvent) => {
    const pointer = pointers.current.find((p) => p.pointerId === event.pointerId);
    if (pointer) {
      const isCurrentPointer = activePointer.current === event.pointerId;

      if (event.buttons === 0) {
        // 2 known scenarios when we may end up here:
        // 1) active pointer must have been released while over an opaque element (https://github.com/igordanchenko/yet-another-react-lightbox/issues/48)
        // 2) out-of-order onpointermove / onpointerup events in Chrome (https://github.com/igordanchenko/yet-another-react-lightbox/issues/59)
        if (isCurrentPointer && offset.current !== 0) {
          onPointerUp(event);
        } else {
          clearPointer(pointer);
        }
        return;
      }

      const deltaX = event.clientX - pointer.clientX;
      const deltaY = event.clientY - pointer.clientY;

      // no gesture in progress
      if (activePointer.current === undefined) {
        const startGesture = (newGesture: Gesture) => {
          addPointer(event);

          activePointer.current = event.pointerId;
          startTime.current = Date.now();

          gesture.current = newGesture;
        };

        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > SWIPE_THRESHOLD && isSwipeValid(deltaX)) {
          if (!disableSwipeNavigation) {
            // start swipe gesture
            startGesture(Gesture.SWIPE);
            onSwipeStart();
          }
        } else if (Math.abs(deltaY) > Math.abs(deltaX) && exceedsPullThreshold(deltaY, SWIPE_THRESHOLD)) {
          // start pull-down gesture
          startGesture(Gesture.PULL);
          onPullStart();
        }
      } else if (isCurrentPointer) {
        if (gesture.current === Gesture.SWIPE) {
          offset.current = deltaX;
          onSwipeProgress(deltaX);
        } else if (gesture.current === Gesture.PULL) {
          offset.current = deltaY;
          onPullProgress(deltaY);
        }
      }
    }
  });

  usePointerEvents(subscribeSensors, onPointerDown, onPointerMove, onPointerUp);
}
