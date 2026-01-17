package handlers

import (
	"crypto-portfolio-backend/internal/fx"
	"encoding/json"
	"log"
	"net/http"
)

// FXHandler handles FX rate requests.
type FXHandler struct {
	service *fx.Service
}

// NewFXHandler creates a new FX handler.
func NewFXHandler(service *fx.Service) *FXHandler {
	return &FXHandler{
		service: service,
	}
}

// HandleGetRates handles GET /fx
func (h *FXHandler) HandleGetRates(w http.ResponseWriter, r *http.Request) {
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

	log.Printf("Fetching latest FX rates")

	rates, err := h.service.GetRates()
	if err != nil {
		log.Printf("Error fetching FX rates: %v", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(rates); err != nil {
		log.Printf("Error encoding response: %v", err)
		http.Error(w, "Failed to encode response", http.StatusInternalServerError)
		return
	}
}
