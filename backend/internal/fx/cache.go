package fx

import (
	"sync"
	"time"
)

const (
	ratesTTL = 24 * time.Hour
)

// Cache provides thread-safe in-memory caching for FX rates.
type Cache struct {
	mu    sync.RWMutex
	rates *RatesResponse
}

// NewCache creates a new in-memory cache.
func NewCache() *Cache {
	c := &Cache{}

	go c.cleanupExpired()

	return c
}

// GetRates retrieves cached rates if they exist and haven't expired.
func (c *Cache) GetRates() (*RatesResponse, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	if c.rates == nil {
		return nil, false
	}

	if time.Since(c.rates.UpdatedAt) > ratesTTL {
		return nil, false
	}

	cached := *c.rates
	cached.Cached = true

	return &cached, true
}

// SetRates stores rates in cache.
func (c *Cache) SetRates(rates *RatesResponse) {
	c.mu.Lock()
	defer c.mu.Unlock()

	rates.UpdatedAt = time.Now()
	c.rates = rates
}

// cleanupExpired periodically removes expired rates from cache.
func (c *Cache) cleanupExpired() {
	ticker := time.NewTicker(30 * time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		c.mu.Lock()
		if c.rates != nil && time.Since(c.rates.UpdatedAt) > ratesTTL {
			c.rates = nil
		}
		c.mu.Unlock()
	}
}
