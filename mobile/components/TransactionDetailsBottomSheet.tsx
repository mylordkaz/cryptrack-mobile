import { View, Modal, Pressable, Dimensions, StyleSheet } from "react-native";
import { useCallback, useEffect } from "react";
import { Transaction } from "@/src/types/transaction";
import { ThemeTokens, spacing, radius, useTheme } from "@/src/theme";
import { formatFiat, formatAmount, formatDateTime } from "@/src/utils/format";
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
import { Title, Caption, Body, Headline } from "./ui";
import { Button } from "./ui/Button";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface TransactionDetailsBottomSheetProps {
  visible: boolean;
  transaction: Transaction | null;
  symbol: string;
  theme: ThemeTokens;
  costBasis: number | null;
  currentValue: number | null;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function TransactionDetailsBottomSheet({
  visible,
  transaction,
  symbol,
  theme,
  costBasis,
  currentValue,
  onClose,
  onEdit,
  onDelete,
}: TransactionDetailsBottomSheetProps) {
  const { isDark } = useTheme();
  const { t } = useLocale();
  const translateY = useSharedValue(0);
  const isDismissing = useSharedValue(false);
  const { height: SCREEN_HEIGHT } = Dimensions.get("window");
  const DISMISS_THRESHOLD = 100;

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

  if (!transaction) return null;

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

            {/* Header */}
            <Title style={styles.header}>{t("common.details")}</Title>

            {/* Date and Type Row */}
            <View style={styles.dateTypeRow}>
              <Caption>{formatDateTime(transaction.timestamp)}</Caption>
              <Body
                color={transaction.type === "BUY" ? "gain" : "loss"}
                style={[
                  styles.transactionType,
                  isDark && {
                    textShadowColor:
                      transaction.type === "BUY" ? theme.gain : theme.loss,
                    textShadowOffset: { width: 0, height: 0 },
                    textShadowRadius: 8,
                  },
                ]}
              >
                {transaction.type === "BUY"
                  ? t("transaction.buy")
                  : t("transaction.sell")}
              </Body>
            </View>

            {/* Transaction Details */}
            <View style={styles.content}>
              {/* Main Info Card */}
              <View
                style={[
                  styles.mainInfoCard,
                  { backgroundColor: theme.surface, borderColor: theme.border },
                ]}
              >
                {/* Left: Amount */}
                <View style={styles.amountSection}>
                  <Headline style={styles.amountValue}>
                    {formatAmount(Math.abs(transaction.amount), 6)}
                  </Headline>
                  <Caption>{symbol}</Caption>
                </View>

                {/* Right: Price Metrics */}
                <View style={styles.metricsSection}>
                  <View style={styles.metricItem}>
                    <Caption>{t("transaction.priceAtTime")}</Caption>
                    <Body>{formatFiat(transaction.price_per_unit_fiat)}</Body>
                  </View>
                  <View style={styles.metricItem}>
                    <Caption>{t("transaction.currentValue")}</Caption>
                    <Body>
                      {currentValue !== null ? formatFiat(currentValue) : "-"}
                    </Body>
                  </View>
                  {transaction.type === "BUY" && (
                    <View style={styles.metricItem}>
                      <Caption>{t("transaction.costBasis")}</Caption>
                      <Body>
                        {costBasis !== null ? formatFiat(costBasis) : "-"}
                      </Body>
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.detailRow}>
                <Caption>{t("transaction.fee")}</Caption>
                <Body>
                  {transaction.fee_amount
                    ? transaction.fee_currency === transaction.fiat_currency
                      ? formatFiat(transaction.fee_amount)
                      : `${transaction.fee_amount} ${transaction.fee_currency}`
                    : "-"}
                </Body>
              </View>

              <View style={styles.detailRow}>
                <Caption>{t("transaction.notes")}</Caption>
                <Body>
                  {transaction.notes?.trim() ? transaction.notes : "-"}
                </Body>
              </View>

              {/* Action Buttons */}
              <View style={styles.buttonRow}>
                <View style={styles.buttonWrapper}>
                  <Button
                    title={t("transaction.edit")}
                    onPress={onEdit}
                    variant="primary"
                  />
                </View>
                <View style={styles.buttonWrapper}>
                  <Button
                    title={t("transaction.delete")}
                    onPress={onDelete}
                    variant="destructive"
                  />
                </View>
              </View>
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
  header: {
    marginBottom: spacing.sm,
  },
  dateTypeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  transactionType: {
    fontWeight: "600",
    fontSize: 18,
  },
  content: {
    gap: spacing.md,
  },
  mainInfoCard: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  amountSection: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  amountValue: {
    fontWeight: "700",
    marginBottom: spacing.xs,
  },
  metricsSection: {
    flex: 1,
    gap: spacing.sm,
  },
  metricItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  buttonRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  buttonWrapper: {
    flex: 1,
  },
});
