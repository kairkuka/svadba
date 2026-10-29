import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import {
  findNodeHandle,
  Keyboard,
  Platform,
  ScrollView,
  TextInput,
  type ScrollViewProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  BOTTOM_NAV_CONTENT_HEIGHT,
  SCREEN_EDGE_GAP,
} from './AppLayout';

type KeyboardSafeScrollViewProps = ScrollViewProps & {
  bottomOverlayHeight?: number;
  reserveBottomNavigation?: boolean;
};

export const KeyboardSafeScrollView = forwardRef<
  ScrollView,
  KeyboardSafeScrollViewProps
>(function KeyboardSafeScrollView(
  {
    automaticallyAdjustKeyboardInsets = Platform.OS === 'ios',
    bottomOverlayHeight = 0,
    contentContainerStyle,
    contentInsetAdjustmentBehavior = Platform.OS === 'ios' ? 'automatic' : 'never',
    keyboardDismissMode = Platform.OS === 'ios' ? 'interactive' : 'on-drag',
    keyboardShouldPersistTaps = 'handled',
    reserveBottomNavigation = false,
    ...props
  },
  forwardedRef,
) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const reservedBottom = reserveBottomNavigation
    ? BOTTOM_NAV_CONTENT_HEIGHT +
      (Platform.OS === 'web' ? 0 : insets.bottom) +
      bottomOverlayHeight +
      SCREEN_EDGE_GAP
    : undefined;

  useImperativeHandle(forwardedRef, () => scrollRef.current as ScrollView);

  useEffect(() => {
    if (Platform.OS === 'web') return undefined;

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const subscription = Keyboard.addListener(showEvent, () => {
      requestAnimationFrame(() => {
        const focusedInput = (
          TextInput.State as typeof TextInput.State & {
            currentlyFocusedInput?: () => unknown;
          }
        ).currentlyFocusedInput?.();
        const focusedNode = focusedInput ? findNodeHandle(focusedInput as never) : null;

        if (focusedNode) {
          scrollRef.current?.scrollResponderScrollNativeHandleToKeyboard(
            focusedNode,
            18,
            true,
          );
        }
      });
    });

    return () => subscription.remove();
  }, []);

  return (
    <ScrollView
      {...props}
      ref={scrollRef}
      automaticallyAdjustKeyboardInsets={automaticallyAdjustKeyboardInsets}
      contentContainerStyle={[
        contentContainerStyle,
        reservedBottom === undefined ? null : { paddingBottom: reservedBottom },
      ]}
      contentInsetAdjustmentBehavior={contentInsetAdjustmentBehavior}
      keyboardDismissMode={keyboardDismissMode}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
    />
  );
});
