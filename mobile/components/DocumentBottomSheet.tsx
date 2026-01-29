import { View, Modal, Pressable, Dimensions, StyleSheet, Text, ScrollView } from "react-native";
import { useCallback, useEffect } from "react";
import { ThemeTokens, spacing, radius } from "@/src/theme";
import { useLocale } from "@/src/i18n/LocaleProvider";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { Headline } from "./ui";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface DocumentBottomSheetProps {
  visible: boolean;
  titleKey: string;
  contentKey: string;
  theme: ThemeTokens;
  onClose: () => void;
}

export function DocumentBottomSheet({
  visible,
  titleKey,
  contentKey,
  theme,
  onClose,
}: DocumentBottomSheetProps) {
  const { t } = useLocale();
  const translateY = useSharedValue(0);
  const isDismissing = useSharedValue(false);
  const { height: SCREEN_HEIGHT } = Dimensions.get("window");
  const DISMISS_THRESHOLD = 100;

  const title = t(titleKey as any);
  const content = t(contentKey as any);

  useEffect(() => {
    if (visible) {
      translateY.value = 0;
      isDismissing.value = false;
    }
  }, [visible, translateY, isDismissing]);

  const closeNow = useCallback(() => {
    isDismissing.value = true;
    translateY.value = SCREEN_HEIGHT;
    onClose();
  }, [SCREEN_HEIGHT, isDismissing, onClose, translateY]);

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (event.translationY > 0) {
        translateY.value = event.translationY;
      }
    })
    .onEnd((event) => {
      if (event.translationY > DISMISS_THRESHOLD) {
        isDismissing.value = true;
        translateY.value = SCREEN_HEIGHT;
        scheduleOnRN(onClose);
      } else {
        translateY.value = withSpring(0, { damping: 15, stiffness: 200 });
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateY.value,
      [0, SCREEN_HEIGHT],
      [1, 0],
      Extrapolation.CLAMP,
    ),
  }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={closeNow}
    >
      <View style={styles.modalContainer}>
        <AnimatedPressable
          onPress={closeNow}
          style={[styles.backdrop, backdropStyle]}
        />
        <GestureDetector gesture={panGesture}>
          <Animated.View
            style={[
              styles.sheetContainer,
              { backgroundColor: theme.bg },
              animatedStyle,
            ]}
          >
            <View
              style={[styles.dragHandle, { backgroundColor: theme.muted }]}
            />

            <View style={styles.header}>
              <Headline style={{ color: theme.text }}>{title}</Headline>
            </View>

            <ScrollView
              style={styles.content}
              showsVerticalScrollIndicator={true}
            >
              <Text style={[styles.text, { color: theme.text }]}>
                {content}
              </Text>
            </ScrollView>
          </Animated.View>
        </GestureDetector>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheetContainer: {
    height: "80%",
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: radius.sm,
    alignSelf: "center",
    marginBottom: spacing.lg,
  },
  header: {
    marginBottom: spacing.md,
  },
  content: {
    flex: 1,
  },
  text: {
    fontSize: 14,
    lineHeight: 22,
  },
});
