package fx

import "time"

// RatesResponse is returned to clients for FX rates.
type RatesResponse struct {
	Base      string             `json:"base"`
	Rates     map[string]float64 `json:"rates"`
	Timestamp int64              `json:"timestamp"`
	Cached    bool               `json:"cached"`
	UpdatedAt time.Time          `json:"-"`
}
