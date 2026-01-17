package prices

import (
	"net/http"
	"testing"
)

func TestCoinGeckoClientGetCoinsMarkets_RequestAndMapping(t *testing.T) {
	responseBody := marketResponseBytes(t, []CoinGeckoMarketCoin{
		{
			ID:                       "bitcoin",
			Symbol:                   "btc",
			Name:                     "Bitcoin",
			Image:                    "https://example.com/btc.png",
			CurrentPrice:             42000,
			MarketCap:                1000000,
			MarketCapRank:            1,
			PriceChangePercentage24h: 1.23,
		},
	})

	client := &CoinGeckoClient{
		httpClient: &http.Client{
			Transport: roundTripFunc(func(r *http.Request) (*http.Response, error) {
				if r.URL.Host != "api.coingecko.com" {
					t.Errorf("expected host api.coingecko.com, got %s", r.URL.Host)
				}
				if r.URL.Path != "/api/v3/coins/markets" {
					t.Errorf("expected path /api/v3/coins/markets, got %s", r.URL.Path)
				}

				q := r.URL.Query()
				if q.Get("vs_currency") != "usd" {
					t.Errorf("expected vs_currency=usd, got %s", q.Get("vs_currency"))
				}
				if q.Get("order") != "market_cap_desc" {
					t.Errorf("expected order=market_cap_desc, got %s", q.Get("order"))
				}
				if q.Get("per_page") != "50" {
					t.Errorf("expected per_page=50, got %s", q.Get("per_page"))
				}
				if q.Get("precision") != "full" {
					t.Errorf("expected precision=full, got %s", q.Get("precision"))
				}

				return newJSONResponse(responseBody), nil
			}),
		},
	}

	resp, err := client.GetCoinsMarkets()
	if err != nil {
		t.Fatalf("GetCoinsMarkets failed: %v", err)
	}

	if len(resp.Coins) != 1 {
		t.Fatalf("expected 1 coin, got %d", len(resp.Coins))
	}
	if resp.Coins[0].Symbol != "BTC" {
		t.Fatalf("expected symbol to be uppercased to BTC, got %s", resp.Coins[0].Symbol)
	}
}
