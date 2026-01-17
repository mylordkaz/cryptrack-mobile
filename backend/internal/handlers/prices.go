package handlers

import (
	"crypto-portfolio-backend/internal/prices"
	"encoding/json"
	"log"
	"net/http"
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

// HandleGetCoins handles GET /coins
// Returns top 250 coins by market cap with current prices
func (h *PriceHandler) HandleGetCoins(w http.ResponseWriter, r *http.Request) {
	// Enable CORS for mobile app
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	// Handle preflight
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	// Only allow GET
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	log.Printf("Fetching top 250 coins by market cap")

	// Fetch coins from service (cached for 2 hours)
	coins, err := h.service.GetCoins()
	if err != nil {
		log.Printf("Error fetching coins: %v", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Return JSON response
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(coins); err != nil {
		log.Printf("Error encoding response: %v", err)
		http.Error(w, "Failed to encode response", http.StatusInternalServerError)
		return
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
