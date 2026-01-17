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

// CoinsResponse is returned to mobile app
type CoinsResponse struct {
	Coins     []Coin    `json:"coins"`
	Timestamp int64     `json:"timestamp"`
	Cached    bool      `json:"cached"`
	UpdatedAt time.Time `json:"-"`
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
