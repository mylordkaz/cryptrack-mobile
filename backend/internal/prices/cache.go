package prices

import (
	"sync"
	"time"
)

const (
	latestPricesTTL  = 5 * time.Minute
	historyHourlyTTL = 24 * time.Hour
	historyDailyTTL  = 24 * time.Hour
	historyMaxTTL    = 24 * time.Hour
)

// Cache provides thread-safe in-memory caching
type Cache struct {
	mu            sync.RWMutex
	latestPrices  map[string]*LatestPricesResponse
	historyPrices map[string]*HistoryResponse
}

// NewCache creates a new in-memory cache
func NewCache() *Cache {
	c := &Cache{
		latestPrices:  make(map[string]*LatestPricesResponse),
		historyPrices: make(map[string]*HistoryResponse),
	}

	// Start background cleanup goroutine
	go c.cleanupExpired()

	return c
}

// GetLatestPrices retrieves cached latest prices by key if not expired.
func (c *Cache) GetLatestPrices(key string) (*LatestPricesResponse, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	latest := c.latestPrices[key]
	if latest == nil {
		return nil, false
	}

	if time.Since(latest.UpdatedAt) > latestPricesTTL {
		return nil, false
	}

	cached := *latest
	cached.Cached = true

	return &cached, true
}

// SetLatestPrices stores latest prices in cache.
func (c *Cache) SetLatestPrices(key string, prices *LatestPricesResponse) {
	c.mu.Lock()
	defer c.mu.Unlock()

	prices.UpdatedAt = time.Now()
	c.latestPrices[key] = prices
}

// GetHistory retrieves cached history by key if not expired.
func (c *Cache) GetHistory(key string) (*HistoryResponse, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	history := c.historyPrices[key]
	if history == nil {
		return nil, false
	}

	if time.Since(history.UpdatedAt) > historyTTL(history.Days, history.Interval) {
		return nil, false
	}

	cached := *history
	cached.Cached = true

	return &cached, true
}

// SetHistory stores history in cache.
func (c *Cache) SetHistory(key string, history *HistoryResponse) {
	c.mu.Lock()
	defer c.mu.Unlock()

	history.UpdatedAt = time.Now()
	c.historyPrices[key] = history
}

// cleanupExpired periodically removes expired coins list from cache
func (c *Cache) cleanupExpired() {
	ticker := time.NewTicker(10 * time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		c.mu.Lock()

		// Clean expired latest prices
		for key, latest := range c.latestPrices {
			if latest == nil || time.Since(latest.UpdatedAt) > latestPricesTTL {
				delete(c.latestPrices, key)
			}
		}

		// Clean expired history prices
		for key, history := range c.historyPrices {
			if history == nil || time.Since(history.UpdatedAt) > historyTTL(history.Days, history.Interval) {
				delete(c.historyPrices, key)
			}
		}

		c.mu.Unlock()
	}
}

func historyTTL(days, interval string) time.Duration {
	if days == "max" {
		return historyMaxTTL
	}
	if interval == "hourly" {
		return historyHourlyTTL
	}
	return historyDailyTTL
}
