package main

import (
	"log"
	"net/http"
	"os"
	"time"

	"crypto-portfolio-backend/internal/config"
	"crypto-portfolio-backend/internal/fx"
	"crypto-portfolio-backend/internal/handlers"
	"crypto-portfolio-backend/internal/prices"
)

func main() {
	config.LoadEnv(".env")

	// Get port from environment or default to 8080
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	// Initialize price service
	priceService := prices.NewService("data/coins_meta.json", "data/cmc_coins_meta.json", "data/cmc_coingecko_map.json")
	priceHandler := handlers.NewPriceHandler(priceService)
	fxService := fx.NewService()
	fxHandler := handlers.NewFXHandler(fxService)

	// Register routes
	http.HandleFunc("/coins/meta", priceHandler.HandleGetCoinMeta)
	http.HandleFunc("/cmc/coins/meta", priceHandler.HandleGetCMCCoinMeta)
	http.HandleFunc("/prices/latest", priceHandler.HandleGetLatestPrices)
	http.HandleFunc("/cmc/prices/latest", priceHandler.HandleGetCMCLatestPrices)
	// Register more specific routes before less specific ones to avoid path conflicts
	http.HandleFunc("/prices/history/batch", priceHandler.HandleGetHistoryBatch)
	http.HandleFunc("/prices/history", priceHandler.HandleGetHistory)
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
	log.Printf("   GET /coins/meta  - Get coin metadata (cached 7d)")
	log.Printf("   GET /cmc/coins/meta  - Get CMC coin metadata (cached 7d)")
	log.Printf("   GET /prices/latest  - Get current prices for ids (cached 5m)")
	log.Printf("   GET /cmc/prices/latest  - Get CMC latest prices (cached 5m)")
	log.Printf("   GET /prices/history - Get historical prices (cached 1d)")
	log.Printf("   GET /prices/history/batch - Get historical prices (cached 1d)")
	log.Printf("   GET /fx     - Get latest FX rates from ECB (cached 24h)")
	log.Printf("   GET /health - Health check")
	log.Printf("")
	log.Printf("💡 Example:")
	log.Printf("   curl http://localhost:%s/coins/meta", port)
	log.Printf("   curl http://localhost:%s/cmc/coins/meta", port)
	log.Printf("   curl http://localhost:%s/prices/latest?ids=bitcoin,ethereum", port)
	log.Printf("   curl http://localhost:%s/cmc/prices/latest?ids=1,1027", port)
	log.Printf("   curl http://localhost:%s/prices/history?id=bitcoin&days=7&interval=hourly", port)

	go func() {
		if _, err := priceService.GetCMCCoinMeta(); err != nil {
			log.Printf("Failed to warm CMC coin metadata cache: %v", err)
		}

		if _, err := priceService.GetCMCLatestPrices(nil); err != nil {
			log.Printf("Failed to warm CMC top prices cache: %v", err)
		}

		if err := priceService.EnsureCMCMapping(); err != nil {
			log.Printf("Failed to build CMC mapping: %v", err)
		}

		go func() {
			time.Sleep(10 * time.Second)
			if err := priceService.PrewarmHistoryCache(); err != nil {
				log.Printf("Failed to prewarm history cache: %v", err)
			}
		}()

		ticker := time.NewTicker(24 * time.Hour)
		defer ticker.Stop()

		for range ticker.C {
			if _, err := priceService.GetCMCCoinMeta(); err != nil {
				log.Printf("Failed to refresh CMC coin metadata cache: %v", err)
			}
		}
	}()

	go func() {
		historyTicker := time.NewTicker(24 * time.Hour)
		defer historyTicker.Stop()

		for range historyTicker.C {
			if err := priceService.PrewarmHistoryCache(); err != nil {
				log.Printf("Failed to prewarm history cache: %v", err)
			}
		}
	}()

	go func() {
		ticker := time.NewTicker(5 * time.Minute)
		defer ticker.Stop()

		for range ticker.C {
			if _, err := priceService.GetCMCLatestPrices(nil); err != nil {
				log.Printf("Failed to refresh CMC top prices cache: %v", err)
			}
		}
	}()

	go func() {
		if _, err := fxService.GetRates(); err != nil {
			log.Printf("Failed to warm FX rates cache: %v", err)
		}

		loc, err := time.LoadLocation("Europe/Paris")
		if err != nil {
			log.Printf("Failed to load Europe/Paris timezone, using UTC: %v", err)
			loc = time.UTC
		}

		now := time.Now().In(loc)
		next := time.Date(now.Year(), now.Month(), now.Day(), 17, 0, 0, 0, loc)
		if !next.After(now) {
			next = next.Add(24 * time.Hour)
		}

		time.Sleep(time.Until(next))

		ticker := time.NewTicker(24 * time.Hour)
		defer ticker.Stop()

		for range ticker.C {
			if _, err := fxService.GetRates(); err != nil {
				log.Printf("Failed to refresh FX rates cache: %v", err)
			}
		}
	}()

	if err := server.ListenAndServe(); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
