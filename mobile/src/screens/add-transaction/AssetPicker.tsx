import { useMemo } from "react";
import { View, Text, TextInput, Pressable, ScrollView } from "react-native";
import { Image } from "expo-image";
import { spacing, radius, ThemeTokens } from "@/src/theme";
import type { Coin } from "@/src/hooks/useCoins";

export type AssetPickerProps = {
  theme: ThemeTokens;
  t: (key: string) => string;
  coins: Coin[];
  selectedCoin?: Coin;
  assetSymbol: string;
  showAssetList: boolean;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  setShowAssetList: (value: boolean) => void;
  onSelectAsset: (symbol: string) => void;
  coinsLoading: boolean;
};

export function AssetPicker({
  theme,
  t,
  coins,
  selectedCoin,
  assetSymbol,
  showAssetList,
  searchQuery,
  setSearchQuery,
  setShowAssetList,
  onSelectAsset,
  coinsLoading,
}: AssetPickerProps) {
  const filteredCoins = useMemo(() => {
    if (!searchQuery.trim()) return coins;
    const query = searchQuery.toLowerCase();
    return coins.filter(
      (coin) =>
        coin.name.toLowerCase().includes(query) ||
        coin.symbol.toLowerCase().includes(query),
    );
  }, [coins, searchQuery]);

  return (
    <>
      <Text
        style={{
          color: theme.textSecondary,
          marginBottom: spacing.xs,
          fontSize: 13,
        }}
      >
        {t("transaction.asset")}
      </Text>
      {!showAssetList && selectedCoin ? (
        <Pressable
          onPress={() => {
            setShowAssetList(true);
            setSearchQuery("");
          }}
          style={{
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: radius.md,
            padding: spacing.sm,
            marginBottom: spacing.md,
            flexDirection: "row",
            alignItems: "center",
            minHeight: 44,
          }}
        >
          <Image
            source={{ uri: selectedCoin.image }}
            style={{
              width: 28,
              height: 28,
              marginRight: spacing.sm,
              borderRadius: 14,
            }}
            contentFit="contain"
            cachePolicy="disk"
          />
          <Text style={{ color: theme.text, fontSize: 15, flex: 1 }}>
            {selectedCoin.name}
          </Text>
          <Text style={{ color: theme.textSecondary, fontSize: 13 }}>
            {selectedCoin.symbol.toUpperCase()}
          </Text>
        </Pressable>
      ) : (
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          onFocus={() => setShowAssetList(true)}
          placeholder={t("transaction.searchAsset")}
          placeholderTextColor={theme.muted}
          autoFocus={showAssetList}
          style={{
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: radius.md,
            color: theme.text,
            padding: spacing.sm,
            marginBottom: spacing.md,
            fontSize: 15,
            minHeight: 44,
          }}
        />
      )}
      {showAssetList && (
        <ScrollView
          style={{
            maxHeight: 200,
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: radius.md,
            marginBottom: spacing.md,
          }}
          nestedScrollEnabled={true}
        >
          {coinsLoading ? (
            <View style={{ padding: spacing.md, alignItems: "center" }}>
              <Text style={{ color: theme.textSecondary }}>
                {t("common.loading")}
              </Text>
            </View>
          ) : filteredCoins.length === 0 ? (
            <View style={{ padding: spacing.md, alignItems: "center" }}>
              <Text style={{ color: theme.textSecondary }}>
                {t("common.noData")}
              </Text>
            </View>
          ) : (
            filteredCoins.map((coin) => (
              <Pressable
                key={coin.id}
                onPress={() => {
                  onSelectAsset(coin.symbol);
                  setSearchQuery("");
                  setShowAssetList(false);
                }}
                style={{
                  padding: spacing.sm,
                  borderBottomWidth: 1,
                  borderBottomColor: theme.border,
                  backgroundColor:
                    assetSymbol === coin.symbol
                      ? theme.accent + "10"
                      : "transparent",
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Image
                    source={{ uri: coin.image }}
                    style={{
                      width: 32,
                      height: 32,
                      marginRight: spacing.sm,
                      borderRadius: 16,
                    }}
                    contentFit="contain"
                    cachePolicy="disk"
                  />
                  <View>
                    <Text
                      style={{
                        color: theme.text,
                        fontSize: 15,
                        fontWeight: "500",
                      }}
                    >
                      {coin.name}
                    </Text>
                    <Text
                      style={{
                        color: theme.textSecondary,
                        fontSize: 13,
                      }}
                    >
                      {coin.symbol.toUpperCase()}
                    </Text>
                  </View>
                </View>
              </Pressable>
            ))
          )}
        </ScrollView>
      )}
    </>
  );
}
