package prices

import "time"

// Coin represents a cryptocurrency with metadata and current price
type Coin struct {
	ID             string  `json:"id"`     // CoinGecko ID (e.g., "bitcoin")
	Symbol         string  `json:"symbol"` // Uppercase ticker (e.g., "BTC")
	Name           string  `json:"name"`   // Full name (e.g., "Bitcoin")
	Image          string  `json:"image"`  // Logo URL
	CurrentPrice   float64 `json:"current_price"`
	MarketCap      float64 `json:"market_cap"`
	MarketCapRank  int     `json:"market_cap_rank"`
	PriceChange24h float64 `json:"price_change_percentage_24h"`
}

// CoinMeta represents static coin metadata used by the app.
type CoinMeta struct {
	ID     string `json:"id"`
	Symbol string `json:"symbol"`
	Name   string `json:"name"`
	Image  string `json:"image"`
}

// CoinsResponse is returned to mobile app
type CoinsResponse struct {
	Coins     []Coin    `json:"coins"`
	Timestamp int64     `json:"timestamp"`
	Cached    bool      `json:"cached"`
	UpdatedAt time.Time `json:"-"`
}

// CoinMetaResponse is returned to the mobile app for static metadata.
type CoinMetaResponse struct {
	Coins     []CoinMeta `json:"coins"`
	Timestamp int64      `json:"timestamp"`
	Cached    bool       `json:"cached"`
	UpdatedAt time.Time  `json:"-"`
}

// PricePoint represents a simple price response entry from CoinGecko.
type PricePoint struct {
	USD           float64 `json:"usd"`
	LastUpdatedAt int64   `json:"last_updated_at,omitempty"`
}

// LatestPricesResponse is returned to the mobile app for current prices.
type LatestPricesResponse struct {
	Prices    map[string]PricePoint `json:"prices"`
	Timestamp int64                 `json:"timestamp"`
	Cached    bool                  `json:"cached"`
	UpdatedAt time.Time             `json:"-"`
}

// HistoryPoint represents a price at a specific time.
type HistoryPoint struct {
	Timestamp int64   `json:"timestamp"`
	Price     float64 `json:"price"`
}

// HistoryResponse is returned to the mobile app for historical prices.
type HistoryResponse struct {
	ID        string         `json:"id"`
	Days      string         `json:"days"`
	Interval  string         `json:"interval,omitempty"`
	Prices    []HistoryPoint `json:"prices"`
	Timestamp int64          `json:"timestamp"`
	Cached    bool           `json:"cached"`
	UpdatedAt time.Time      `json:"-"`
}

// CoinGeckoMarketCoin represents a single coin from /coins/markets
type CoinGeckoMarketCoin struct {
	ID                       string  `json:"id"`
	Symbol                   string  `json:"symbol"`
	Name                     string  `json:"name"`
	Image                    string  `json:"image"`
	CurrentPrice             float64 `json:"current_price"`
	MarketCap                float64 `json:"market_cap"`
	MarketCapRank            int     `json:"market_cap_rank"`
	PriceChangePercentage24h float64 `json:"price_change_percentage_24h"`
}

// CoinGeckoMarketChartResponse represents /coins/{id}/market_chart response.
type CoinGeckoMarketChartResponse struct {
	Prices [][]float64 `json:"prices"`
}
