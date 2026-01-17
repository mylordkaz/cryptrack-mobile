package fx

import (
	"encoding/xml"
	"fmt"
	"io"
	"net/http"
	"time"
)

const (
	ecbDailyURL    = "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml"
	requestTimeout = 10 * time.Second
	maxRetries     = 2
	retryDelay     = 500 * time.Millisecond
	userAgent      = "crypto-portfolio-backend/1.0"
)

// ECBClient fetches and parses FX rates from the ECB feed.
type ECBClient struct {
	httpClient *http.Client
}

// NewECBClient creates a new ECB client.
func NewECBClient() *ECBClient {
	return &ECBClient{
		httpClient: &http.Client{
			Timeout: requestTimeout,
		},
	}
}

type ecbEnvelope struct {
	Cube ecbCube `xml:"Cube"`
}

type ecbCube struct {
	Cube ecbCubeTime `xml:"Cube"`
}

type ecbCubeTime struct {
	Time  string        `xml:"time,attr"`
	Rates []ecbCubeRate `xml:"Cube"`
}

type ecbCubeRate struct {
	Currency string  `xml:"currency,attr"`
	Rate     float64 `xml:"rate,attr"`
}

// GetLatestRates fetches and parses the latest ECB daily rates.
func (c *ECBClient) GetLatestRates() (*RatesResponse, error) {
	resp, err := c.doRequest()
	if err != nil {
		return nil, fmt.Errorf("failed to fetch ECB rates: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("ECB API error: status %d, body: %s", resp.StatusCode, string(body))
	}

	var envelope ecbEnvelope
	if err := xml.NewDecoder(resp.Body).Decode(&envelope); err != nil {
		return nil, fmt.Errorf("failed to decode ECB response: %w", err)
	}

	rates := make(map[string]float64, len(envelope.Cube.Cube.Rates))
	for _, rate := range envelope.Cube.Cube.Rates {
		rates[rate.Currency] = rate.Rate
	}

	return &RatesResponse{
		Base:      "EUR",
		Rates:     rates,
		Timestamp: time.Now().UnixMilli(),
		Cached:    false,
		UpdatedAt: time.Now(),
	}, nil
}

func (c *ECBClient) doRequest() (*http.Response, error) {
	var lastErr error
	for attempt := 0; attempt <= maxRetries; attempt++ {
		req, err := http.NewRequest(http.MethodGet, ecbDailyURL, nil)
		if err != nil {
			return nil, fmt.Errorf("failed to build request: %w", err)
		}
		req.Header.Set("User-Agent", userAgent)
		req.Header.Set("Accept", "application/xml")

		resp, err := c.httpClient.Do(req)
		if err == nil {
			if resp.StatusCode >= http.StatusInternalServerError {
				io.Copy(io.Discard, resp.Body)
				resp.Body.Close()
				lastErr = fmt.Errorf("ECB API error: status %d", resp.StatusCode)
			} else {
				return resp, nil
			}
		} else {
			lastErr = err
		}

		if attempt < maxRetries {
			time.Sleep(retryDelay * time.Duration(attempt+1))
		}
	}

	return nil, lastErr
}
