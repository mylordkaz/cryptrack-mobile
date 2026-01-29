import { useCallback, useEffect } from "react";
import { Pressable } from "react-native";
import { Gesture } from "react-native-gesture-handler";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

const DEFAULT_DISMISS_THRESHOLD = 100;

type BottomSheetControllerArgs = {
  visible: boolean;
  onClose: () => void;
  screenHeight: number;
  dismissThreshold?: number;
};

export function useBottomSheetController({
  visible,
  onClose,
  screenHeight,
  dismissThreshold = DEFAULT_DISMISS_THRESHOLD,
}: BottomSheetControllerArgs) {
  const translateY = useSharedValue(0);
  const isDismissing = useSharedValue(false);

  useEffect(() => {
    if (visible) {
      translateY.value = 0;
      isDismissing.value = false;
    }
  }, [visible, translateY, isDismissing]);

  const close = useCallback(() => {
    isDismissing.value = true;
    translateY.value = screenHeight;
    onClose();
  }, [isDismissing, onClose, screenHeight, translateY]);

  const gesture = Gesture.Pan()
    .onUpdate((event) => {
      if (event.translationY > 0) {
        translateY.value = event.translationY;
      }
    })
    .onEnd((event) => {
      if (event.translationY > dismissThreshold) {
        isDismissing.value = true;
        translateY.value = screenHeight;
        scheduleOnRN(onClose);
      } else {
        translateY.value = withSpring(0, {
          damping: 15,
          stiffness: 200,
        });
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateY.value,
      [0, screenHeight],
      [1, 0],
      Extrapolation.CLAMP,
    ),
  }));

  return { animatedStyle, backdropStyle, gesture, close };
}

export const AnimatedPressable = Animated.createAnimatedComponent(
  Pressable,
);
