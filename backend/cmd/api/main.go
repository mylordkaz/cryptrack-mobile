package main

import (
	"crypto-portfolio-backend/internal/handlers"
	"crypto-portfolio-backend/internal/fx"
	"crypto-portfolio-backend/internal/prices"
	"log"
	"net/http"
	"os"
	"time"
)

func main() {
	// Get port from environment or default to 8080
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	// Initialize price service
	priceService := prices.NewService()
	priceHandler := handlers.NewPriceHandler(priceService)
	fxService := fx.NewService()
	fxHandler := handlers.NewFXHandler(fxService)

	// Register routes
	http.HandleFunc("/coins", priceHandler.HandleGetCoins)
	http.HandleFunc("/fx", fxHandler.HandleGetRates)
	http.HandleFunc("/health", priceHandler.HandleHealth)

	// Configure server with timeouts
	server := &http.Server{
		Addr:         ":" + port,
		Handler:      nil, // Use DefaultServeMux
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Start server
	log.Printf("🚀 Backend server starting on port %s", port)
	log.Printf("📊 Endpoints:")
	log.Printf("   GET /coins  - Get top 250 coins with current prices (cached 2h)")
	log.Printf("   GET /fx     - Get latest FX rates from ECB (cached 24h)")
	log.Printf("   GET /health - Health check")
	log.Printf("")
	log.Printf("💡 Example:")
	log.Printf("   curl http://localhost:%s/coins", port)

	if err := server.ListenAndServe(); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
