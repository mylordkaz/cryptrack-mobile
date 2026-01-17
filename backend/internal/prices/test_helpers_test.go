package prices

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"testing"
)

type roundTripFunc func(*http.Request) (*http.Response, error)

func (f roundTripFunc) RoundTrip(r *http.Request) (*http.Response, error) {
	return f(r)
}

func marketResponseBytes(t *testing.T, coins []CoinGeckoMarketCoin) []byte {
	t.Helper()

	data, err := json.Marshal(coins)
	if err != nil {
		t.Fatalf("failed to marshal market coins: %v", err)
	}

	return data
}

func newJSONResponse(body []byte) *http.Response {
	return &http.Response{
		StatusCode: http.StatusOK,
		Header:     http.Header{"Content-Type": []string{"application/json"}},
		Body:       io.NopCloser(bytes.NewReader(body)),
	}
}
