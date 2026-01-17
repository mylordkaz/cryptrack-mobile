package prices

import (
	"fmt"
	"log"

	"golang.org/x/sync/singleflight"
)

// Service handles price fetching with caching
type Service struct {
	client *CoinGeckoClient
	cache  *Cache
	group  singleflight.Group
}

// NewService creates a new price service
func NewService() *Service {
	return &Service{
		client: NewCoinGeckoClient(),
		cache:  NewCache(),
	}
}

// GetCoins fetches top 50 coins by market cap with current prices
// Cached for 2 hours to respect API rate limits (13 calls/24h = ~1 call every 2 hours)
// Uses singleflight to prevent multiple concurrent API calls during cache miss
func (s *Service) GetCoins() (*CoinsResponse, error) {
	// Use singleflight for all requests (cache check happens inside)
	// This ensures only the "winner" checks cache on concurrent requests
	result, err, shared := s.group.Do("coins", func() (interface{}, error) {
		// Check cache (only the first concurrent request does this)
		if cached, found := s.cache.GetCoinsList(); found {
			log.Printf("Cache hit for coins list")
			return cached, nil
		}

		log.Printf("Cache miss for coins list, fetching from CoinGecko")

		// Fetch from API
		coins, err := s.client.GetCoinsMarkets()
		if err != nil {
			return nil, fmt.Errorf("failed to fetch coins: %w", err)
		}

		// Store in cache
		s.cache.SetCoinsList(coins)

		return coins, nil
	})

	if err != nil {
		return nil, err
	}

	if shared {
		log.Printf("Request shared singleflight result (prevented duplicate cache check/API call)")
	}

	return result.(*CoinsResponse), nil
}
