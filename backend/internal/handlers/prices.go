package handlers

import (
	"crypto-portfolio-backend/internal/prices"
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"strings"
)

// PriceHandler handles price-related HTTP requests
type PriceHandler struct {
	service *prices.Service
}

// NewPriceHandler creates a new price handler
func NewPriceHandler(service *prices.Service) *PriceHandler {
	return &PriceHandler{
		service: service,
	}
}

// HandleGetCoinMeta handles GET /coins/meta
// Returns coin metadata without prices
func (h *PriceHandler) HandleGetCoinMeta(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	log.Printf("Fetching coin metadata")

	coins, err := h.service.GetCoinMeta()
	if err != nil {
		log.Printf("Error fetching coin metadata: %v", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(coins); err != nil {
		log.Printf("Error encoding response: %v", err)
		http.Error(w, "Failed to encode response", http.StatusInternalServerError)
		return
	}
}

// HandleGetCMCCoinMeta handles GET /cmc/coins/meta
// Returns coin metadata without prices
func (h *PriceHandler) HandleGetCMCCoinMeta(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	log.Printf("Fetching CMC coin metadata")

	coins, err := h.service.GetCMCCoinMeta()
	if err != nil {
		log.Printf("Error fetching CMC coin metadata: %v", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(coins); err != nil {
		log.Printf("Error encoding response: %v", err)
		http.Error(w, "Failed to encode response", http.StatusInternalServerError)
		return
	}
}

// HandleGetLatestPrices handles GET /prices/latest
// Example: /prices/latest?ids=bitcoin,ethereum
func (h *PriceHandler) HandleGetLatestPrices(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	idsParam := strings.TrimSpace(r.URL.Query().Get("ids"))
	var ids []string
	if idsParam != "" {
		ids = strings.Split(idsParam, ",")
		log.Printf("Fetching latest prices for ids: %s", idsParam)
	} else {
		log.Printf("Fetching latest prices for top coins")
	}

	pricesResp, err := h.service.GetLatestPrices(ids)
	if err != nil {
		log.Printf("Error fetching latest prices: %v", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(pricesResp); err != nil {
		log.Printf("Error encoding response: %v", err)
		http.Error(w, "Failed to encode response", http.StatusInternalServerError)
		return
	}
}

// HandleGetCMCLatestPrices handles GET /cmc/prices/latest
// Example: /cmc/prices/latest?ids=1,1027
func (h *PriceHandler) HandleGetCMCLatestPrices(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	idsParam := strings.TrimSpace(r.URL.Query().Get("ids"))
	var ids []string
	if idsParam != "" {
		ids = strings.Split(idsParam, ",")
		log.Printf("Fetching CMC latest prices for ids: %s", idsParam)
	} else {
		log.Printf("Fetching CMC latest prices for top coins")
	}

	pricesResp, err := h.service.GetCMCLatestPrices(ids)
	if err != nil {
		log.Printf("Error fetching CMC latest prices: %v", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(pricesResp); err != nil {
		log.Printf("Error encoding response: %v", err)
		http.Error(w, "Failed to encode response", http.StatusInternalServerError)
		return
	}
}

// HandleGetHistory handles GET /prices/history
// Example: /prices/history?id=bitcoin&days=7&interval=hourly
func (h *PriceHandler) HandleGetHistory(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	id := strings.TrimSpace(r.URL.Query().Get("id"))
	cmcID := strings.TrimSpace(r.URL.Query().Get("cmc_id"))
	days := strings.TrimSpace(r.URL.Query().Get("days"))
	interval := strings.TrimSpace(r.URL.Query().Get("interval"))

	if id == "" && cmcID == "" {
		http.Error(w, "id or cmc_id query parameter is required", http.StatusBadRequest)
		return
	}
	if days == "" {
		days = "7"
	}

	if !isValidDays(days) {
		http.Error(w, "days must be one of: 7,30,90,365", http.StatusBadRequest)
		return
	}

	if id == "" {
		mappedID, err := h.service.ResolveCMCID(cmcID)
		if err != nil {
			log.Printf("Error resolving cmc_id %s: %v", cmcID, err)
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		id = mappedID
	}

	log.Printf("Fetching history from cache for %s (days=%s, interval=%s)", id, days, interval)

	historyResp, err := h.service.GetHistoryCachedOnly(id, days, interval)
	if err != nil {
		log.Printf("Error fetching cached history: %v", err)
		http.Error(w, err.Error(), http.StatusServiceUnavailable)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(historyResp); err != nil {
		log.Printf("Error encoding response: %v", err)
		http.Error(w, "Failed to encode response", http.StatusInternalServerError)
		return
	}
}

func isValidDays(days string) bool {
	value, err := strconv.Atoi(days)
	if err != nil {
		return false
	}

	switch value {
	case 7, 30, 90, 365:
		return true
	default:
		return false
	}
}

// HandleHealth handles GET /health
func (h *PriceHandler) HandleHealth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Content-Type", "application/json")

	response := map[string]string{
		"status":  "healthy",
		"service": "crypto-portfolio-backend",
	}

	json.NewEncoder(w).Encode(response)
}
