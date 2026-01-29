import { View, TouchableOpacity, Modal, StyleSheet, Dimensions } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import Animated from "react-native-reanimated";
import { Check } from "lucide-react-native";
import { spacing, radius, ThemeTokens } from "@/src/theme";
import { Body, Headline } from "@/components/ui";
import { useBottomSheetController, AnimatedPressable } from "./useBottomSheetController";
import { useMemo } from "react";

export type SelectionItem = {
  code: string;
  label: string;
};

type SelectionSheetProps = {
  visible: boolean;
  title: string;
  items: SelectionItem[];
  selectedCode: string;
  theme: ThemeTokens;
  onClose: () => void;
  onSelect: (code: string) => void;
};

export function SelectionSheet({
  visible,
  title,
  items,
  selectedCode,
  theme,
  onClose,
  onSelect,
}: SelectionSheetProps) {
  const screenHeight = useMemo(
    () => Dimensions.get("window").height,
    [],
  );
  const { animatedStyle, backdropStyle, gesture, close } =
    useBottomSheetController({
      visible,
      onClose,
      screenHeight,
    });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={close}
    >
      <View style={styles.modalContainer}>
        <AnimatedPressable
          onPress={close}
          style={[styles.backdrop, backdropStyle]}
        />
        <GestureDetector gesture={gesture}>
          <Animated.View
            style={[
              styles.sheetContainer,
              { backgroundColor: theme.bg },
              animatedStyle,
            ]}
          >
            <View style={[styles.dragHandle, { backgroundColor: theme.muted }]} />

            <View style={styles.modalHeader}>
              <Headline style={{ color: theme.text }}>{title}</Headline>
            </View>

            <View style={styles.modalList}>
              {items.map((item, index) => (
                <TouchableOpacity
                  key={item.code}
                  style={[
                    styles.languageOption,
                    index < items.length - 1 && {
                      borderBottomColor: theme.border,
                      borderBottomWidth: 1,
                    },
                  ]}
                  onPress={() => onSelect(item.code)}
                >
                  <Body style={{ color: theme.text, flex: 1 }}>
                    {item.label}
                  </Body>
                  {selectedCode === item.code && (
                    <Check size={20} color={theme.accent} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
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
  modalHeader: {
    marginBottom: spacing.md,
  },
  modalList: {
    gap: spacing.xs,
  },
  languageOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.lg,
  },
});
