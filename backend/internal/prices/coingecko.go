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
	requestTimeout   = 20 * time.Second
	coinsPerPage     = 100 // Legacy CG meta size; kept for deprecated CG meta endpoint.
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

func (c *CoinGeckoClient) doRequest(url string) (*http.Response, error) {
	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create CoinGecko request: %w", err)
	}

	req.Header.Add("x-cg-demo-api-key", "CG-zobv9cW1iMnSqYTaR9gidtsS")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch CoinGecko data: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		resp.Body.Close()
		return nil, fmt.Errorf("CoinGecko API error: status %d, body: %s", resp.StatusCode, string(body))
	}

	return resp, nil
}

// GetCoinsMarketsPage fetches a specific page of coins by market cap with current prices.
func (c *CoinGeckoClient) GetCoinsMarketsPage(page int) (*CoinsResponse, error) {
	if page < 1 {
		return nil, fmt.Errorf("page must be >= 1")
	}

	// Build API URL: /coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=N&precision=full
	url := fmt.Sprintf("%s/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=%d&page=%d&precision=full",
		coinGeckoBaseURL, coinsPerPage, page)

	// Make request
	resp, err := c.doRequest(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

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

// GetCoinsMarketsBySymbols fetches coins by symbols with current prices.
func (c *CoinGeckoClient) GetCoinsMarketsBySymbols(symbols []string) ([]CoinGeckoMarketCoin, error) {
	if len(symbols) == 0 {
		return nil, fmt.Errorf("symbols cannot be empty")
	}

	joined := strings.ToLower(strings.Join(symbols, ","))
	url := fmt.Sprintf("%s/coins/markets?vs_currency=usd&symbols=%s&precision=full",
		coinGeckoBaseURL, joined)

	resp, err := c.doRequest(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var marketCoins []CoinGeckoMarketCoin
	if err := json.NewDecoder(resp.Body).Decode(&marketCoins); err != nil {
		return nil, fmt.Errorf("failed to decode CoinGecko markets response: %w", err)
	}

	return marketCoins, nil
}

// GetSimplePrices fetches current prices for specific CoinGecko IDs.
func (c *CoinGeckoClient) GetSimplePrices(ids []string) (*LatestPricesResponse, error) {
	if len(ids) == 0 {
		return nil, fmt.Errorf("ids cannot be empty")
	}

	url := fmt.Sprintf("%s/simple/price?ids=%s&vs_currencies=usd&include_last_updated_at=true",
		coinGeckoBaseURL, strings.Join(ids, ","))

	resp, err := c.doRequest(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var prices map[string]PricePoint
	if err := json.NewDecoder(resp.Body).Decode(&prices); err != nil {
		return nil, fmt.Errorf("failed to decode CoinGecko simple price response: %w", err)
	}

	return &LatestPricesResponse{
		Prices:    prices,
		Timestamp: time.Now().UnixMilli(),
		Cached:    false,
		UpdatedAt: time.Now(),
	}, nil
}

// GetMarketChart fetches historical prices for a CoinGecko ID.
func (c *CoinGeckoClient) GetMarketChart(id, days, interval string) (*HistoryResponse, error) {
	if id == "" {
		return nil, fmt.Errorf("id cannot be empty")
	}
	if days == "" {
		return nil, fmt.Errorf("days cannot be empty")
	}

	url := fmt.Sprintf("%s/coins/%s/market_chart?vs_currency=usd&days=%s",
		coinGeckoBaseURL, id, days)
	if interval != "" {
		url = fmt.Sprintf("%s&interval=%s", url, interval)
	}

	resp, err := c.doRequest(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var chart CoinGeckoMarketChartResponse
	if err := json.NewDecoder(resp.Body).Decode(&chart); err != nil {
		return nil, fmt.Errorf("failed to decode CoinGecko market chart response: %w", err)
	}

	points := make([]HistoryPoint, 0, len(chart.Prices))
	for _, entry := range chart.Prices {
		if len(entry) < 2 {
			continue
		}
		points = append(points, HistoryPoint{
			Timestamp: int64(entry[0]),
			Price:     entry[1],
		})
	}

	return &HistoryResponse{
		ID:        id,
		Days:      days,
		Interval:  interval,
		Prices:    points,
		Timestamp: time.Now().UnixMilli(),
		Cached:    false,
		UpdatedAt: time.Now(),
	}, nil
}
