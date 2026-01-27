import { View, StyleSheet } from "react-native";
import { AssetWithMetrics } from "@/src/math/types";
import { useLocale } from "@/src/i18n/LocaleProvider";
import { spacing } from "@/src/theme";
import { AssetRow } from "./AssetRow";
import { Headline } from "./ui";
import { useCoinMetadata } from "@/src/hooks/useCoins";
import { useMemo } from "react";

interface AssetListProps {
  assets: AssetWithMetrics[];
}

export function AssetList({ assets }: AssetListProps) {
  const { t } = useLocale();
  const symbols = useMemo(
    () => [...new Set(assets.map((a) => a.symbol))].sort(),
    [assets],
  );
  const { metadata } = useCoinMetadata(symbols);

  return (
    <View style={styles.container}>
      <Headline style={styles.header}>{t("portfolio.assets")}</Headline>

      {assets.map((asset, index) => (
        <AssetRow
          key={asset.symbol}
          asset={asset}
          imageUrl={metadata.get(asset.symbol)?.image_url}
          isLast={index === assets.length - 1}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    marginBottom: spacing.lg,
  },
});
