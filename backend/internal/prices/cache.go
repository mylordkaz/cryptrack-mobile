package prices

import (
	"sync"
	"time"
)

const (
	// Cache TTL for coins list (2 hours due to API rate limits: 13 calls/24h)
	coinsListTTL = 2 * time.Hour
)

// Cache provides thread-safe in-memory caching
type Cache struct {
	mu        sync.RWMutex
	coinsList *CoinsResponse
}

// NewCache creates a new in-memory cache
func NewCache() *Cache {
	c := &Cache{}

	// Start background cleanup goroutine
	go c.cleanupExpired()

	return c
}

// GetCoinsList retrieves cached coins list if it exists and hasn't expired
func (c *Cache) GetCoinsList() (*CoinsResponse, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	if c.coinsList == nil {
		return nil, false
	}

	// Check if expired (2 hours TTL)
	if time.Since(c.coinsList.UpdatedAt) > coinsListTTL {
		return nil, false
	}

	// Mark as cached
	cached := *c.coinsList
	cached.Cached = true

	return &cached, true
}

// SetCoinsList stores coins list in cache
func (c *Cache) SetCoinsList(coins *CoinsResponse) {
	c.mu.Lock()
	defer c.mu.Unlock()

	coins.UpdatedAt = time.Now()
	c.coinsList = coins
}

// cleanupExpired periodically removes expired coins list from cache
func (c *Cache) cleanupExpired() {
	ticker := time.NewTicker(10 * time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		c.mu.Lock()

		// Clean expired coins list
		if c.coinsList != nil && time.Since(c.coinsList.UpdatedAt) > coinsListTTL {
			c.coinsList = nil
		}

		c.mu.Unlock()
	}
}
