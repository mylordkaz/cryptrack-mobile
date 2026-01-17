package prices

import (
	"net/http"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

func TestServiceGetCoins_CachesResults(t *testing.T) {
	var requestCount int32
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
				atomic.AddInt32(&requestCount, 1)
				return newJSONResponse(responseBody), nil
			}),
		},
	}

	service := &Service{
		client: client,
		cache:  NewCache(),
	}

	first, err := service.GetCoins()
	if err != nil {
		t.Fatalf("first GetCoins failed: %v", err)
	}
	if first.Cached {
		t.Fatalf("expected first response to be uncached")
	}

	second, err := service.GetCoins()
	if err != nil {
		t.Fatalf("second GetCoins failed: %v", err)
	}
	if !second.Cached {
		t.Fatalf("expected second response to be cached")
	}

	if got := atomic.LoadInt32(&requestCount); got != 1 {
		t.Fatalf("expected 1 HTTP request, got %d", got)
	}
}

func TestServiceGetCoins_Singleflight(t *testing.T) {
	var requestCount int32
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
				atomic.AddInt32(&requestCount, 1)
				time.Sleep(50 * time.Millisecond)
				return newJSONResponse(responseBody), nil
			}),
		},
	}

	service := &Service{
		client: client,
		cache:  NewCache(),
	}

	const callers = 10
	start := make(chan struct{})
	var wg sync.WaitGroup
	wg.Add(callers)

	errs := make(chan error, callers)
	for i := 0; i < callers; i++ {
		go func() {
			defer wg.Done()
			<-start
			_, err := service.GetCoins()
			errs <- err
		}()
	}

	close(start)
	wg.Wait()
	close(errs)

	for err := range errs {
		if err != nil {
			t.Fatalf("GetCoins failed: %v", err)
		}
	}

	if got := atomic.LoadInt32(&requestCount); got != 1 {
		t.Fatalf("expected 1 HTTP request, got %d", got)
	}
}
