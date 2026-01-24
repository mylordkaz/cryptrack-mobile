package prices

import "strings"

func buildCMCMapEntries(cmcCoins []CoinMeta, cgMarkets []CoinGeckoMarketCoin) []CMCMappingEntry {
	bySymbol := make(map[string][]CoinGeckoMarketCoin, len(cgMarkets))
	for _, coin := range cgMarkets {
		symbol := strings.ToUpper(strings.TrimSpace(coin.Symbol))
		if symbol == "" {
			continue
		}
		bySymbol[symbol] = append(bySymbol[symbol], coin)
	}

	entries := make([]CMCMappingEntry, 0, len(cmcCoins))
	for _, cmcCoin := range cmcCoins {
		symbol := strings.ToUpper(strings.TrimSpace(cmcCoin.Symbol))
		if symbol == "" {
			continue
		}

		candidates := bySymbol[symbol]
		if len(candidates) == 0 {
			continue
		}

		best := pickBestCandidate(cmcCoin.Name, candidates)
		if best.ID == "" {
			continue
		}

		entries = append(entries, CMCMappingEntry{
			CMCID:       cmcCoin.ID,
			Symbol:      symbol,
			Name:        cmcCoin.Name,
			CoinGeckoID: best.ID,
		})
	}

	return entries
}

func pickBestCandidate(cmcName string, candidates []CoinGeckoMarketCoin) CoinGeckoMarketCoin {
	if len(candidates) == 1 {
		return candidates[0]
	}

	target := normalizeName(cmcName)
	for _, candidate := range candidates {
		if normalizeName(candidate.Name) == target {
			return candidate
		}
	}

	return candidates[0]
}

func normalizeName(name string) string {
	name = strings.ToLower(strings.TrimSpace(name))
	replacer := strings.NewReplacer(" ", "", "-", "", "_", "", ".", "", "'", "")
	return replacer.Replace(name)
}
