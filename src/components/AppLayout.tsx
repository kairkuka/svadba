import { useEffect, useState, type ReactNode } from 'react';
import {
  Keyboard,
  Platform,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const BOTTOM_NAV_CONTENT_HEIGHT = 64;
export const SCREEN_EDGE_GAP = 12;

export function useKeyboardVisible() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web') return undefined;

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSubscription = Keyboard.addListener(showEvent, () => setVisible(true));
    const hideSubscription = Keyboard.addListener(hideEvent, () => setVisible(false));

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  return visible;
}

export function useBottomNavigationLayout() {
  const insets = useSafeAreaInsets();
  const keyboardVisible = useKeyboardVisible();
  const safeBottom = Platform.OS === 'web' ? 0 : insets.bottom;
  const bottomBarHeight = BOTTOM_NAV_CONTENT_HEIGHT + safeBottom;

  return {
    bottomBarHeight,
    contentBottomInset: bottomBarHeight + SCREEN_EDGE_GAP,
    keyboardVisible,
    safeBottom,
  };
}

export function BottomNavigationBar({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { bottomBarHeight, keyboardVisible, safeBottom } = useBottomNavigationLayout();

  if (keyboardVisible) return null;

  return (
    <View
      style={[
        style,
        {
          minHeight: bottomBarHeight,
          paddingBottom: Math.max(safeBottom, 6),
          paddingTop: 6,
        },
      ]}
    >
      {children}
    </View>
  );
}
