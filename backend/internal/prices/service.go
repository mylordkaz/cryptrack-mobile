package prices

import (
	"fmt"
	"log"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"golang.org/x/sync/singleflight"
)

// Service handles price fetching with caching
type Service struct {
	client       *CoinGeckoClient
	cmcClient    *CoinMarketCapClient
	cache        *Cache
	metaStore    *MetaStore
	cmcMetaStore *MetaStore
	cmcMapStore  *CMCMapStore
	group        singleflight.Group
}

const topPricesCacheKey = "top_prices"
const cmcTopPricesCacheKey = "cmc_top_prices"

// NewService creates a new price service
func NewService(metaPath, cmcMetaPath, cmcMapPath string) *Service {
	return &Service{
		client:       NewCoinGeckoClient(),
		cmcClient:    NewCoinMarketCapClient(),
		cache:        NewCache(),
		metaStore:    NewMetaStore(metaPath),
		cmcMetaStore: NewMetaStore(cmcMetaPath),
		cmcMapStore:  NewCMCMapStore(cmcMapPath),
	}
}

// GetCoinMeta returns cached coin metadata or refreshes it if stale.
func (s *Service) GetCoinMeta() (*CoinMetaResponse, error) {
	if s.metaStore == nil {
		return nil, fmt.Errorf("meta store not configured")
	}

	result, err, shared := s.group.Do("coin_meta", func() (interface{}, error) {
		if cached, found, err := s.metaStore.Get(); err != nil {
			return nil, err
		} else if found {
			log.Printf("Cache hit for coin metadata")
			return cached, nil
		}

		log.Printf("Cache miss for coin metadata, fetching from CoinGecko")

		const metaPages = 1
		meta := make([]CoinMeta, 0, coinsPerPage*metaPages)

		for page := 1; page <= metaPages; page++ {
			coins, err := s.client.GetCoinsMarketsPage(page)
			if err != nil {
				return nil, fmt.Errorf("failed to fetch coin metadata: %w", err)
			}

			for _, coin := range coins.Coins {
				meta = append(meta, CoinMeta{
					ID:     coin.ID,
					Symbol: coin.Symbol,
					Name:   coin.Name,
					Image:  coin.Image,
				})
			}
		}

		response := &CoinMetaResponse{
			Coins:     meta,
			Timestamp: time.Now().UnixMilli(),
			Cached:    false,
			UpdatedAt: time.Now(),
		}

		if err := s.metaStore.Set(response); err != nil {
			return nil, fmt.Errorf("failed to store coin metadata: %w", err)
		}

		return response, nil
	})

	if err != nil {
		return nil, err
	}

	if shared {
		log.Printf("Shared coin metadata singleflight result")
	}

	return result.(*CoinMetaResponse), nil
}

// GetCMCCoinMeta returns cached coin metadata or refreshes it if stale.
func (s *Service) GetCMCCoinMeta() (*CoinMetaResponse, error) {
	if s.cmcMetaStore == nil {
		return nil, fmt.Errorf("cmc meta store not configured")
	}

	result, err, shared := s.group.Do("cmc_coin_meta", func() (interface{}, error) {
		if cached, found, err := s.cmcMetaStore.Get(); err != nil {
			return nil, err
		} else if found {
			log.Printf("Cache hit for CMC coin metadata")
			return cached, nil
		}

		log.Printf("Cache miss for CMC coin metadata, fetching from CoinMarketCap")

		meta, err := s.cmcClient.GetCoinMap(100)
		if err != nil {
			return nil, fmt.Errorf("failed to fetch CMC coin metadata: %w", err)
		}

		response := &CoinMetaResponse{
			Coins:     meta,
			Timestamp: time.Now().UnixMilli(),
			Cached:    false,
			UpdatedAt: time.Now(),
		}

		if err := s.cmcMetaStore.Set(response); err != nil {
			return nil, fmt.Errorf("failed to store CMC coin metadata: %w", err)
		}

		return response, nil
	})

	if err != nil {
		return nil, err
	}

	if shared {
		log.Printf("Shared CMC coin metadata singleflight result")
	}

	return result.(*CoinMetaResponse), nil
}

// GetLatestPrices fetches current prices for specific CoinGecko IDs.
func (s *Service) GetLatestPrices(ids []string) (*LatestPricesResponse, error) {
	top, err := s.getTopPrices()
	if err != nil {
		return nil, err
	}

	if len(ids) == 0 {
		return top, nil
	}

	_, normalized := normalizeIDs(ids)
	filtered := make(map[string]PricePoint, len(normalized))
	for _, id := range normalized {
		if price, found := top.Prices[id]; found {
			filtered[id] = price
		}
	}

	return &LatestPricesResponse{
		Prices:    filtered,
		Timestamp: top.Timestamp,
		Cached:    top.Cached,
		UpdatedAt: top.UpdatedAt,
	}, nil
}

// GetCMCLatestPrices fetches current prices for specific CoinMarketCap IDs.
func (s *Service) GetCMCLatestPrices(ids []string) (*LatestPricesResponse, error) {
	top, err := s.getCMCTopPrices()
	if err != nil {
		return nil, err
	}

	if len(ids) == 0 {
		return top, nil
	}

	_, normalized := normalizeIDs(ids)
	filtered := make(map[string]PricePoint, len(normalized))
	for _, id := range normalized {
		if price, found := top.Prices[id]; found {
			filtered[id] = price
		}
	}

	return &LatestPricesResponse{
		Prices:    filtered,
		Timestamp: top.Timestamp,
		Cached:    top.Cached,
		UpdatedAt: top.UpdatedAt,
	}, nil
}

// GetHistory fetches historical prices for a CoinGecko ID.
func (s *Service) GetHistory(id, days, interval string) (*HistoryResponse, error) {
	if id == "" {
		return nil, fmt.Errorf("id cannot be empty")
	}
	if days == "" {
		return nil, fmt.Errorf("days cannot be empty")
	}

	resolvedInterval := interval
	canonicalDays, canonicalInterval, err := canonicalizeHistoryRequest(days, resolvedInterval)
	if err != nil {
		return nil, err
	}

	if days != canonicalDays || resolvedInterval != canonicalInterval {
			log.Printf("History canonicalized: request days=%s -> fetch days=%s interval=%s",
				days, canonicalDays, canonicalInterval)
	}

	key := strings.ToLower(fmt.Sprintf("%s:%s:%s", id, canonicalDays, canonicalInterval))
	result, err, shared := s.group.Do("history:"+key, func() (interface{}, error) {
		if cached, found := s.cache.GetHistory(key); found {
			log.Printf("Cache hit for history (%s)", key)
			return cached, nil
		}

		log.Printf("Cache miss for history (%s), fetching from CoinGecko", key)
		history, err := s.client.GetMarketChart(id, canonicalDays, canonicalInterval)
		if err != nil {
			return nil, fmt.Errorf("failed to fetch history: %w", err)
		}

		s.cache.SetHistory(key, history)
		return history, nil
	})

	if err != nil {
		return nil, err
	}

	if shared {
		log.Printf("Shared history singleflight result (%s)", key)
	}

	history := result.(*HistoryResponse)
	if history == nil {
		return nil, fmt.Errorf("history response is nil")
	}

	if days != canonicalDays {
		sliced := sliceHistory(history, days, canonicalInterval)
		log.Printf("History sliced: days=%s points=%d", days, len(sliced.Prices))
		return sliced, nil
	}

	return history, nil
}

// GetHistoryCachedOnly returns cached history or an error if not available.
func (s *Service) GetHistoryCachedOnly(id, days, interval string) (*HistoryResponse, error) {
	if id == "" {
		return nil, fmt.Errorf("id cannot be empty")
	}
	if days == "" {
		return nil, fmt.Errorf("days cannot be empty")
	}

	canonicalDays, canonicalInterval, err := canonicalizeHistoryRequest(days, interval)
	if err != nil {
		return nil, err
	}

	key := strings.ToLower(fmt.Sprintf("%s:%s:%s", id, canonicalDays, canonicalInterval))
	history, found := s.cache.GetHistory(key)
	if !found {
		return nil, fmt.Errorf("history not cached for %s", key)
	}

	if days != canonicalDays {
		sliced := sliceHistory(history, days, canonicalInterval)
		log.Printf("History sliced: days=%s points=%d", days, len(sliced.Prices))
		return sliced, nil
	}

	return history, nil
}

func canonicalizeHistoryRequest(days, interval string) (string, string, error) {
	days = strings.TrimSpace(days)
	if days == "" {
		return "", "", fmt.Errorf("days cannot be empty")
	}

	switch days {
	case "7", "30", "90", "365":
		return "365", "daily", nil
	default:
		return "", "", fmt.Errorf("unsupported days value: %s", days)
	}
}

func sliceHistory(history *HistoryResponse, days, interval string) *HistoryResponse {
	daysInt, err := strconv.Atoi(days)
	if err != nil || daysInt <= 0 || history == nil {
		return history
	}

	if len(history.Prices) == 0 {
		return &HistoryResponse{
			ID:        history.ID,
			Days:      days,
			Interval:  interval,
			Prices:    history.Prices,
			Timestamp: history.Timestamp,
			Cached:    history.Cached,
			UpdatedAt: history.UpdatedAt,
		}
	}

	lastTS := history.Prices[len(history.Prices)-1].Timestamp
	cutoff := lastTS - int64(daysInt)*24*60*60*1000

	filtered := make([]HistoryPoint, 0, len(history.Prices))
	for _, point := range history.Prices {
		if point.Timestamp >= cutoff {
			filtered = append(filtered, point)
		}
	}

	return &HistoryResponse{
		ID:        history.ID,
		Days:      days,
		Interval:  interval,
		Prices:    filtered,
		Timestamp: history.Timestamp,
		Cached:    history.Cached,
		UpdatedAt: history.UpdatedAt,
	}
}

// ResolveCMCID maps a CMC id to a CoinGecko id using the cached mapping file.
func (s *Service) ResolveCMCID(cmcID string) (string, error) {
	if s.cmcMapStore == nil {
		return "", fmt.Errorf("cmc map store not configured")
	}
	if cmcID == "" {
		return "", fmt.Errorf("cmc_id cannot be empty")
	}

	entries, found, err := s.cmcMapStore.Get()
	if err != nil {
		return "", err
	}
	if !found || len(entries) == 0 {
		return "", fmt.Errorf("cmc mapping not available")
	}

	for _, entry := range entries {
		if entry.CMCID == cmcID {
			if entry.CoinGeckoID == "" {
				return "", fmt.Errorf("cmc_id %s has no coingecko mapping", cmcID)
			}
			return entry.CoinGeckoID, nil
		}
	}

	return "", fmt.Errorf("no coingecko mapping for cmc_id %s", cmcID)
}

// EnsureCMCMapping builds a CMC->CoinGecko mapping file if missing.
func (s *Service) EnsureCMCMapping() error {
	if s.cmcMapStore == nil {
		return fmt.Errorf("cmc map store not configured")
	}

	if _, found, err := s.cmcMapStore.Get(); err != nil {
		return err
	} else if found {
		return nil
	}

	cmcMeta, err := s.GetCMCCoinMeta()
	if err != nil {
		return fmt.Errorf("failed to load CMC metadata: %w", err)
	}

	symbols := make([]string, 0, len(cmcMeta.Coins))
	for _, coin := range cmcMeta.Coins {
		if coin.Symbol != "" {
			symbols = append(symbols, coin.Symbol)
		}
	}

	if len(symbols) == 0 {
		return fmt.Errorf("no CMC symbols available for mapping")
	}

	cgMarkets := make([]CoinGeckoMarketCoin, 0, len(symbols))
	for _, batch := range chunkSymbols(symbols, 50) {
		markets, err := s.client.GetCoinsMarketsBySymbols(batch)
		if err != nil {
			return fmt.Errorf("failed to fetch CoinGecko markets by symbols: %w", err)
		}
		cgMarkets = append(cgMarkets, markets...)
	}

	entries := buildCMCMapEntries(cmcMeta.Coins, cgMarkets)
	if len(entries) == 0 {
		return fmt.Errorf("no CMC mapping entries built")
	}

	if err := s.cmcMapStore.Set(entries); err != nil {
		return fmt.Errorf("failed to store CMC mapping: %w", err)
	}

	return nil
}

// PrewarmHistoryCache fetches and caches history for all mapped coins.
// This is intended to run on a fixed schedule (no user-triggered calls).
func (s *Service) PrewarmHistoryCache() error {
	if s.cmcMapStore == nil {
		return fmt.Errorf("cmc map store not configured")
	}

	entries, found, err := s.cmcMapStore.Get()
	if err != nil {
		return err
	}
	if !found || len(entries) == 0 {
		return fmt.Errorf("cmc mapping not available")
	}

	ids := make([]string, 0, len(entries))
	seen := make(map[string]struct{}, len(entries))
	for _, entry := range entries {
		id := strings.TrimSpace(entry.CoinGeckoID)
		if id == "" {
			continue
		}
		if _, ok := seen[id]; ok {
			continue
		}
		seen[id] = struct{}{}
		ids = append(ids, id)
	}

	if len(ids) == 0 {
		return fmt.Errorf("no coingecko ids available for prewarm")
	}

	var failures []string
	var failuresMu sync.Mutex

	type task struct {
		id       string
		days     string
		interval string
		label    string
	}

	tasks := make(chan task, len(ids)*2)
	for _, id := range ids {
		tasks <- task{id: id, days: "365", interval: "daily", label: "365d"}
	}
	close(tasks)

	limiter := time.NewTicker(2 * time.Second) // ~30 requests/min
	defer limiter.Stop()

	const maxWorkers = 5
	var wg sync.WaitGroup
	worker := func() {
		defer wg.Done()
		for t := range tasks {
			<-limiter.C
			if err := s.prewarmHistoryForCoin(t.id, t.days, t.interval); err != nil {
				log.Printf("Prewarm failed for %s (%s): %v", t.id, t.label, err)
				failuresMu.Lock()
				failures = append(failures, fmt.Sprintf("%s:%s", t.id, t.label))
				failuresMu.Unlock()
			}
		}
	}

	wg.Add(maxWorkers)
	for i := 0; i < maxWorkers; i++ {
		go worker()
	}
	wg.Wait()

	if len(failures) > 0 {
		return fmt.Errorf("prewarm completed with %d failures", len(failures))
	}

	return nil
}

func (s *Service) prewarmHistoryForCoin(id, days, interval string) error {
	key := strings.ToLower(fmt.Sprintf("%s:%s:%s", id, days, interval))
	if _, found := s.cache.GetHistory(key); found {
		return nil
	}

	log.Printf("Prewarm history for %s (days=%s interval=%s)", id, days, interval)
	history, err := s.client.GetMarketChart(id, days, interval)
	if err != nil {
		return fmt.Errorf("failed to prewarm history for %s: %w", id, err)
	}

	s.cache.SetHistory(key, history)
	return nil
}

func chunkSymbols(symbols []string, size int) [][]string {
	if size <= 0 || len(symbols) == 0 {
		return nil
	}

	chunks := make([][]string, 0, (len(symbols)+size-1)/size)
	for i := 0; i < len(symbols); i += size {
		end := i + size
		if end > len(symbols) {
			end = len(symbols)
		}
		chunks = append(chunks, symbols[i:end])
	}

	return chunks
}

func (s *Service) getTopPrices() (*LatestPricesResponse, error) {
	result, err, shared := s.group.Do("latest:"+topPricesCacheKey, func() (interface{}, error) {
		if cached, found := s.cache.GetLatestPrices(topPricesCacheKey); found {
			log.Printf("Cache hit for top prices")
			return cached, nil
		}

		log.Printf("Cache miss for top prices, fetching from CoinGecko")
		prices, err := s.refreshTopPrices()
		if err != nil {
			return nil, err
		}

		return prices, nil
	})

	if err != nil {
		return nil, err
	}

	if shared {
		log.Printf("Shared top prices singleflight result")
	}

	return result.(*LatestPricesResponse), nil
}

func (s *Service) getCMCTopPrices() (*LatestPricesResponse, error) {
	result, err, shared := s.group.Do("cmc_latest:"+cmcTopPricesCacheKey, func() (interface{}, error) {
		if cached, found := s.cache.GetLatestPrices(cmcTopPricesCacheKey); found {
			log.Printf("Cache hit for CMC top prices")
			return cached, nil
		}

		log.Printf("Cache miss for CMC top prices, fetching from CoinMarketCap")
		prices, err := s.cmcClient.GetLatestListings(100)
		if err != nil {
			return nil, err
		}

		s.cache.SetLatestPrices(cmcTopPricesCacheKey, prices)
		return prices, nil
	})

	if err != nil {
		return nil, err
	}

	if shared {
		log.Printf("Shared CMC top prices singleflight result")
	}

	return result.(*LatestPricesResponse), nil
}

func (s *Service) refreshTopPrices() (*LatestPricesResponse, error) {
	if s.metaStore == nil {
		return nil, fmt.Errorf("meta store not configured")
	}

	meta, err := s.GetCoinMeta()
	if err != nil {
		return nil, fmt.Errorf("failed to load coin metadata: %w", err)
	}

	ids := make([]string, 0, len(meta.Coins))
	for _, coin := range meta.Coins {
		if coin.ID != "" {
			ids = append(ids, strings.ToLower(coin.ID))
		}
	}

	if len(ids) == 0 {
		return nil, fmt.Errorf("no ids available for top prices")
	}

	prices, err := s.client.GetSimplePrices(ids)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch latest prices: %w", err)
	}

	s.cache.SetLatestPrices(topPricesCacheKey, prices)
	return prices, nil
}

func normalizeIDs(ids []string) (string, []string) {
	seen := make(map[string]struct{}, len(ids))
	normalized := make([]string, 0, len(ids))
	for _, id := range ids {
		clean := strings.ToLower(strings.TrimSpace(id))
		if clean == "" {
			continue
		}
		if _, exists := seen[clean]; exists {
			continue
		}
		seen[clean] = struct{}{}
		normalized = append(normalized, clean)
	}

	if len(normalized) == 0 {
		return "", nil
	}

	sort.Strings(normalized)
	return strings.Join(normalized, ","), normalized
}
