package fx

import "testing"

func TestConvertToUSD(t *testing.T) {
	input := &RatesResponse{
		Base: "EUR",
		Rates: map[string]float64{
			"USD": 1.25,
			"GBP": 0.8,
		},
		Timestamp: 123,
	}

	converted, err := convertToUSD(input)
	if err != nil {
		t.Fatalf("convertToUSD failed: %v", err)
	}

	if converted.Base != "USD" {
		t.Fatalf("expected base USD, got %s", converted.Base)
	}
	if converted.Rates["USD"] != 1.0 {
		t.Fatalf("expected USD rate 1.0, got %f", converted.Rates["USD"])
	}
	if converted.Rates["GBP"] != 0.8/1.25 {
		t.Fatalf("expected GBP rate %f, got %f", 0.8/1.25, converted.Rates["GBP"])
	}
	if converted.Rates["EUR"] != 1/1.25 {
		t.Fatalf("expected EUR rate %f, got %f", 1/1.25, converted.Rates["EUR"])
	}
}

func TestConvertToUSD_MissingUSD(t *testing.T) {
	input := &RatesResponse{
		Base: "EUR",
		Rates: map[string]float64{
			"GBP": 0.8,
		},
	}

	if _, err := convertToUSD(input); err == nil {
		t.Fatalf("expected error when USD rate missing")
	}
}

func TestServiceGetRates_ConvertsCachedBase(t *testing.T) {
	cache := NewCache()
	cache.SetRates(&RatesResponse{
		Base: "EUR",
		Rates: map[string]float64{
			"USD": 1.2,
			"GBP": 0.9,
		},
		Timestamp: 456,
	})

	service := &Service{
		client: &ECBClient{},
		cache:  cache,
	}

	resp, err := service.GetRates()
	if err != nil {
		t.Fatalf("GetRates failed: %v", err)
	}
	if resp.Base != "USD" {
		t.Fatalf("expected base USD, got %s", resp.Base)
	}
	if resp.Rates["USD"] != 1.0 {
		t.Fatalf("expected USD rate 1.0, got %f", resp.Rates["USD"])
	}
	if resp.Rates["GBP"] != 0.9/1.2 {
		t.Fatalf("expected GBP rate %f, got %f", 0.9/1.2, resp.Rates["GBP"])
	}
	if !resp.Cached {
		t.Fatalf("expected cached response to remain cached")
	}
}
