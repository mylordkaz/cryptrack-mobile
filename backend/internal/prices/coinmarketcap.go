package prices

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strconv"
	"time"
)

const coinMarketCapBaseURL = "https://pro-api.coinmarketcap.com/v1"

// CoinMarketCapClient handles interactions with CoinMarketCap API.
type CoinMarketCapClient struct {
	httpClient *http.Client
	apiKey     string
}

// NewCoinMarketCapClient creates a new CoinMarketCap API client.
func NewCoinMarketCapClient() *CoinMarketCapClient {
	return &CoinMarketCapClient{
		httpClient: &http.Client{
			Timeout: requestTimeout,
		},
		apiKey: os.Getenv("CMC_API_KEY"),
	}
}

// GetCoinMap fetches top coins by market cap with metadata.
func (c *CoinMarketCapClient) GetCoinMap(limit int) ([]CoinMeta, error) {
	if c.apiKey == "" {
		return nil, fmt.Errorf("CMC API key not configured")
	}
	if limit <= 0 {
		return nil, fmt.Errorf("limit must be > 0")
	}

	url := fmt.Sprintf("%s/cryptocurrency/map?sort=cmc_rank&limit=%d", coinMarketCapBaseURL, limit)
	resp, err := c.doRequest(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read CMC map response: %w", err)
	}

	var response cmcMapResponse
	if err := json.Unmarshal(body, &response); err != nil {
		return nil, fmt.Errorf("failed to decode CMC map response: %w", err)
	}

	meta := make([]CoinMeta, 0, len(response.Data))
	for _, coin := range response.Data {
		meta = append(meta, CoinMeta{
			ID:     strconv.Itoa(coin.ID),
			Symbol: coin.Symbol,
			Name:   coin.Name,
			Image:  cmcImageURL(coin.ID),
		})
	}

	return meta, nil
}

// GetLatestListings fetches latest prices for top coins by market cap.
func (c *CoinMarketCapClient) GetLatestListings(limit int) (*LatestPricesResponse, error) {
	if c.apiKey == "" {
		return nil, fmt.Errorf("CMC API key not configured")
	}
	if limit <= 0 {
		return nil, fmt.Errorf("limit must be > 0")
	}

	url := fmt.Sprintf("%s/cryptocurrency/listings/latest?start=1&limit=%d&convert=USD", coinMarketCapBaseURL, limit)
	resp, err := c.doRequest(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read CMC listings response: %w", err)
	}

	var response cmcListingsResponse
	if err := json.Unmarshal(body, &response); err != nil {
		return nil, fmt.Errorf("failed to decode CMC listings response: %w", err)
	}

	prices := make(map[string]PricePoint, len(response.Data))
	for _, coin := range response.Data {
		prices[strconv.Itoa(coin.ID)] = PricePoint{
			USD:           coin.Quote.USD.Price,
			LastUpdatedAt: time.Now().Unix(),
		}
	}

	return &LatestPricesResponse{
		Prices:    prices,
		Timestamp: time.Now().UnixMilli(),
		Cached:    false,
		UpdatedAt: time.Now(),
	}, nil
}

func (c *CoinMarketCapClient) doRequest(url string) (*http.Response, error) {
	const maxAttempts = 3
	backoff := []time.Duration{0, 750 * time.Millisecond, 1500 * time.Millisecond}
	var lastErr error

	for attempt := 1; attempt <= maxAttempts; attempt++ {
		if attempt > 1 {
			time.Sleep(backoff[attempt-1])
		}

		req, err := http.NewRequest(http.MethodGet, url, nil)
		if err != nil {
			return nil, fmt.Errorf("failed to create CMC request: %w", err)
		}

		req.Header.Set("X-CMC_PRO_API_KEY", c.apiKey)
		req.Header.Set("Accept", "application/json")

		resp, err := c.httpClient.Do(req)
		if err != nil {
			lastErr = fmt.Errorf("failed to fetch CMC data: %w", err)
			continue
		}

		if resp.StatusCode == http.StatusOK {
			return resp, nil
		}

		body, _ := io.ReadAll(resp.Body)
		resp.Body.Close()

		if resp.StatusCode == http.StatusTooManyRequests || resp.StatusCode == http.StatusRequestTimeout || resp.StatusCode >= 500 {
			lastErr = fmt.Errorf("CMC API retryable error: status %d, body: %s", resp.StatusCode, string(body))
			continue
		}

		return nil, fmt.Errorf("CMC API error: status %d, body: %s", resp.StatusCode, string(body))
	}

	return nil, lastErr
}

func cmcImageURL(id int) string {
	return fmt.Sprintf("https://s2.coinmarketcap.com/static/img/coins/64x64/%d.png", id)
}

type cmcMapResponse struct {
	Data []cmcMapCoin `json:"data"`
}

type cmcMapCoin struct {
	ID     int    `json:"id"`
	Name   string `json:"name"`
	Symbol string `json:"symbol"`
}

type cmcListingsResponse struct {
	Data []cmcListingCoin `json:"data"`
}

type cmcListingCoin struct {
	ID     int    `json:"id"`
	Name   string `json:"name"`
	Symbol string `json:"symbol"`
	Quote  struct {
		USD struct {
			Price float64 `json:"price"`
		} `json:"USD"`
	} `json:"quote"`
}
