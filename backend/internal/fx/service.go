package fx

import (
	"fmt"
	"log"

	"golang.org/x/sync/singleflight"
)

// Service handles FX rates fetching with caching.
type Service struct {
	client *ECBClient
	cache  *Cache
	group  singleflight.Group
}

// NewService creates a new FX rates service.
func NewService() *Service {
	return &Service{
		client: NewECBClient(),
		cache:  NewCache(),
	}
}

// GetRates returns latest FX rates with caching and singleflight.
func (s *Service) GetRates() (*RatesResponse, error) {
	result, err, shared := s.group.Do("fx-rates", func() (interface{}, error) {
		if cached, found := s.cache.GetRates(); found {
			log.Printf("Cache hit for FX rates")
			if cached.Base != "USD" {
				converted, err := convertToUSD(cached)
				if err != nil {
					return nil, err
				}
				s.cache.SetRates(converted)
				return converted, nil
			}

			return cached, nil
		}

		log.Printf("Cache miss for FX rates, fetching from ECB")

		rates, err := s.client.GetLatestRates()
		if err != nil {
			return nil, fmt.Errorf("failed to fetch FX rates: %w", err)
		}

		converted, err := convertToUSD(rates)
		if err != nil {
			return nil, err
		}

		s.cache.SetRates(converted)

		return converted, nil
	})

	if err != nil {
		return nil, err
	}

	if shared {
		log.Printf("Request shared singleflight FX rates result")
	}

	return result.(*RatesResponse), nil
}

func convertToUSD(rates *RatesResponse) (*RatesResponse, error) {
	usdRate, ok := rates.Rates["USD"]
	if !ok || usdRate <= 0 {
		return nil, fmt.Errorf("USD rate missing from ECB response")
	}

	converted := make(map[string]float64, len(rates.Rates)+1)
	for currency, rate := range rates.Rates {
		converted[currency] = rate / usdRate
	}

	converted["USD"] = 1.0
	if _, ok := converted["EUR"]; !ok {
		converted["EUR"] = 1 / usdRate
	}

	return &RatesResponse{
		Base:      "USD",
		Rates:     converted,
		Timestamp: rates.Timestamp,
		Cached:    rates.Cached,
		UpdatedAt: rates.UpdatedAt,
	}, nil
}
