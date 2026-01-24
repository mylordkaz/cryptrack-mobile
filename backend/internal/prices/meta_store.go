package prices

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"time"
)

const coinMetaTTL = 7 * 24 * time.Hour

type coinMetaFile struct {
	UpdatedAt time.Time  `json:"updated_at"`
	Coins     []CoinMeta `json:"coins"`
}

// MetaStore manages cached coin metadata stored on disk.
type MetaStore struct {
	mu   sync.RWMutex
	path string
	data *CoinMetaResponse
}

// NewMetaStore creates a new metadata store using the given file path.
func NewMetaStore(path string) *MetaStore {
	return &MetaStore{
		path: path,
	}
}

// Get returns cached metadata if available and not stale.
func (m *MetaStore) Get() (*CoinMetaResponse, bool, error) {
	if m == nil {
		return nil, false, fmt.Errorf("meta store not configured")
	}

	m.mu.RLock()
	if m.data != nil && !isCoinMetaExpired(m.data.UpdatedAt) {
		cached := *m.data
		cached.Cached = true
		m.mu.RUnlock()
		return &cached, true, nil
	}
	m.mu.RUnlock()

	data, err := m.loadFromFile()
	if err != nil {
		if os.IsNotExist(err) {
			return nil, false, nil
		}
		return nil, false, err
	}

	m.mu.Lock()
	m.data = data
	m.mu.Unlock()

	if isCoinMetaExpired(data.UpdatedAt) {
		return nil, false, nil
	}

	cached := *data
	cached.Cached = true
	return &cached, true, nil
}

// Set stores metadata on disk and updates the in-memory cache.
func (m *MetaStore) Set(response *CoinMetaResponse) error {
	if m == nil {
		return fmt.Errorf("meta store not configured")
	}
	if response == nil {
		return fmt.Errorf("meta response is nil")
	}

	updatedAt := time.Now()
	payload := coinMetaFile{
		UpdatedAt: updatedAt,
		Coins:     response.Coins,
	}

	bytes, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal coin metadata: %w", err)
	}

	dir := filepath.Dir(m.path)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return fmt.Errorf("failed to create metadata directory: %w", err)
	}

	tmpFile, err := os.CreateTemp(dir, "coins_meta_*.json")
	if err != nil {
		return fmt.Errorf("failed to create temp metadata file: %w", err)
	}

	if _, err := tmpFile.Write(bytes); err != nil {
		tmpFile.Close()
		return fmt.Errorf("failed to write metadata file: %w", err)
	}

	if err := tmpFile.Close(); err != nil {
		return fmt.Errorf("failed to close metadata file: %w", err)
	}

	if err := os.Rename(tmpFile.Name(), m.path); err != nil {
		return fmt.Errorf("failed to move metadata file: %w", err)
	}

	m.mu.Lock()
	response.UpdatedAt = updatedAt
	m.data = response
	m.mu.Unlock()

	return nil
}

func (m *MetaStore) loadFromFile() (*CoinMetaResponse, error) {
	bytes, err := os.ReadFile(m.path)
	if err != nil {
		return nil, err
	}

	var payload coinMetaFile
	if err := json.Unmarshal(bytes, &payload); err != nil {
		return nil, fmt.Errorf("failed to unmarshal metadata file: %w", err)
	}

	return &CoinMetaResponse{
		Coins:     payload.Coins,
		Timestamp: time.Now().UnixMilli(),
		Cached:    false,
		UpdatedAt: payload.UpdatedAt,
	}, nil
}

func isCoinMetaExpired(updatedAt time.Time) bool {
	if updatedAt.IsZero() {
		return true
	}
	return time.Since(updatedAt) > coinMetaTTL
}
