package prices

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

const (
	coinGeckoBaseURL = "https://api.coingecko.com/api/v3"
	requestTimeout   = 10 * time.Second
	coinsPerPage     = 250 // Always fetch top 250 coins by market cap
)

// CoinGeckoClient handles interactions with CoinGecko API
type CoinGeckoClient struct {
	httpClient *http.Client
}

// NewCoinGeckoClient creates a new CoinGecko API client
func NewCoinGeckoClient() *CoinGeckoClient {
	return &CoinGeckoClient{
		httpClient: &http.Client{
			Timeout: requestTimeout,
		},
	}
}

// GetCoinsMarkets fetches top 50 coins by market cap with current prices
func (c *CoinGeckoClient) GetCoinsMarkets() (*CoinsResponse, error) {
	// Build API URL: /coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&precision=full
	url := fmt.Sprintf("%s/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=%d&precision=full",
		coinGeckoBaseURL, coinsPerPage)

	// Make request
	resp, err := c.httpClient.Get(url)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch coins from CoinGecko: %w", err)
	}
	defer resp.Body.Close()

	// Check status code
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("CoinGecko API error: status %d, body: %s", resp.StatusCode, string(body))
	}

	// Parse response
	var marketCoins []CoinGeckoMarketCoin
	if err := json.NewDecoder(resp.Body).Decode(&marketCoins); err != nil {
		return nil, fmt.Errorf("failed to decode CoinGecko markets response: %w", err)
	}

	// Convert to our format
	coins := make([]Coin, len(marketCoins))
	for i, mc := range marketCoins {
		coins[i] = Coin{
			ID:             mc.ID,
			Symbol:         strings.ToUpper(mc.Symbol),
			Name:           mc.Name,
			Image:          mc.Image,
			CurrentPrice:   mc.CurrentPrice,
			MarketCap:      mc.MarketCap,
			MarketCapRank:  mc.MarketCapRank,
			PriceChange24h: mc.PriceChangePercentage24h,
		}
	}

	return &CoinsResponse{
		Coins:     coins,
		Timestamp: time.Now().UnixMilli(),
		Cached:    false,
		UpdatedAt: time.Now(),
	}, nil
}
