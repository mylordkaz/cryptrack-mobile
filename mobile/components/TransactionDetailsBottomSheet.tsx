import { View, Text, Modal, Pressable, Button, Dimensions } from "react-native";
import { useCallback, useEffect } from "react";
import { Transaction } from "@/src/types/transaction";
import { ThemeTokens } from "@/src/theme";
import { formatFiat, formatAmount, formatDateTime } from "@/src/utils/format";
import { t } from "@/src/i18n";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

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
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        <AnimatedPressable
          onPress={closeNow}
          style={[
            {
              position: "absolute",
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
              backgroundColor: "rgba(0,0,0,0.5)",
            },
            backdropStyle,
          ]}
        />
        <GestureDetector gesture={panGesture}>
          <Animated.View
            style={[
              {
                backgroundColor: theme.bg,
                borderTopLeftRadius: 16,
                borderTopRightRadius: 16,
                padding: 20,
                paddingBottom: 40,
              },
              animatedStyle,
            ]}
          >
            <View
              style={{
                width: 40,
                height: 4,
                backgroundColor: theme.muted,
                borderRadius: 2,
                alignSelf: "center",
                marginBottom: 16,
              }}
            />

            {/* Header */}
            <Text
              style={{
                color: theme.text,
                fontSize: 20,
                fontWeight: "600",
                marginBottom: 20,
              }}
            >
              {t("transaction.detailsTitle")}
            </Text>

            {/* Transaction Details */}
            <View>
              <View style={{ marginBottom: 12 }}>
                <Text
                  style={{ color: theme.muted, fontSize: 12, marginBottom: 4 }}
                >
                  {t("transaction.date")}
                </Text>
                <Text style={{ color: theme.text, fontSize: 16 }}>
                  {formatDateTime(transaction.timestamp)}
                </Text>
              </View>

              <View style={{ marginBottom: 12 }}>
                <Text
                  style={{ color: theme.muted, fontSize: 12, marginBottom: 4 }}
                >
                  {t("transaction.type")}
                </Text>
                <Text
                  style={{
                    color: transaction.type === "BUY" ? theme.gain : theme.loss,
                    fontSize: 16,
                    fontWeight: "600",
                  }}
                >
                  {transaction.type}
                </Text>
              </View>

              <View style={{ marginBottom: 12 }}>
                <Text
                  style={{ color: theme.muted, fontSize: 12, marginBottom: 4 }}
                >
                  {t("transaction.amount")}
                </Text>
                <Text style={{ color: theme.text, fontSize: 16 }}>
                  {formatAmount(Math.abs(transaction.amount), 6)} {symbol}
                </Text>
              </View>

              <View style={{ marginBottom: 12 }}>
                <Text
                  style={{ color: theme.muted, fontSize: 12, marginBottom: 4 }}
                >
                  {t("transaction.currentValue")}
                </Text>
                <Text style={{ color: theme.text, fontSize: 16 }}>
                  {currentValue !== null ? formatFiat(currentValue) : "-"}
                </Text>
              </View>

              <View style={{ marginBottom: 12 }}>
                <Text
                  style={{ color: theme.muted, fontSize: 12, marginBottom: 4 }}
                >
                  {t("transaction.priceAtTime")}
                </Text>
                <Text style={{ color: theme.text, fontSize: 16 }}>
                  {formatFiat(transaction.price_per_unit_fiat)}
                </Text>
              </View>

              {transaction.type === "BUY" && (
                <View style={{ marginBottom: 12 }}>
                  <Text
                    style={{
                      color: theme.muted,
                      fontSize: 12,
                      marginBottom: 4,
                    }}
                  >
                    {t("transaction.costBasis")}
                  </Text>
                  <Text style={{ color: theme.text, fontSize: 16 }}>
                    {costBasis !== null ? formatFiat(costBasis) : "-"}
                  </Text>
                </View>
              )}

              <View style={{ marginBottom: 12 }}>
                <Text
                  style={{ color: theme.muted, fontSize: 12, marginBottom: 4 }}
                >
                  {t("transaction.fee")}
                </Text>
                <Text style={{ color: theme.text, fontSize: 16 }}>
                  {transaction.fee_amount
                    ? transaction.fee_currency === transaction.fiat_currency
                      ? formatFiat(transaction.fee_amount)
                      : `${transaction.fee_amount} ${transaction.fee_currency}`
                    : "-"}
                </Text>
              </View>

              <View style={{ marginBottom: 20 }}>
                <Text
                  style={{ color: theme.muted, fontSize: 12, marginBottom: 4 }}
                >
                  {t("transaction.notes")}
                </Text>
                <Text style={{ color: theme.text, fontSize: 16 }}>
                  {transaction.notes?.trim() ? transaction.notes : "-"}
                </Text>
              </View>

              {/* Action Buttons */}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Button title={t("transaction.edit")} onPress={onEdit} />
                </View>
                <View style={{ flex: 1 }}>
                  <Button
                    title={t("transaction.delete")}
                    color={theme.loss}
                    onPress={onDelete}
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
