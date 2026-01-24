package prices

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"time"
)

type CMCMappingEntry struct {
	CMCID       string `json:"cmc_id"`
	Symbol      string `json:"symbol"`
	Name        string `json:"name"`
	CoinGeckoID string `json:"coingecko_id"`
}

type cmcMappingFile struct {
	UpdatedAt time.Time         `json:"updated_at"`
	Entries   []CMCMappingEntry `json:"entries"`
}

// CMCMapStore manages cached CMC->CoinGecko mappings stored on disk.
type CMCMapStore struct {
	mu   sync.RWMutex
	path string
	data []CMCMappingEntry
}

// NewCMCMapStore creates a new mapping store using the given file path.
func NewCMCMapStore(path string) *CMCMapStore {
	return &CMCMapStore{
		path: path,
	}
}

// Get returns cached mapping entries if present.
func (m *CMCMapStore) Get() ([]CMCMappingEntry, bool, error) {
	if m == nil {
		return nil, false, fmt.Errorf("cmc map store not configured")
	}

	m.mu.RLock()
	if m.data != nil && len(m.data) > 0 {
		data := make([]CMCMappingEntry, len(m.data))
		copy(data, m.data)
		m.mu.RUnlock()
		return data, true, nil
	}
	m.mu.RUnlock()

	data, err := m.loadFromFile()
	if err != nil {
		if os.IsNotExist(err) {
			return nil, false, nil
		}
		return nil, false, err
	}

	if len(data) == 0 {
		return nil, false, nil
	}

	m.mu.Lock()
	m.data = data
	m.mu.Unlock()

	return data, true, nil
}

// Set stores mapping entries on disk and updates the in-memory cache.
func (m *CMCMapStore) Set(entries []CMCMappingEntry) error {
	if m == nil {
		return fmt.Errorf("cmc map store not configured")
	}
	if len(entries) == 0 {
		return fmt.Errorf("cmc mapping entries are empty")
	}

	payload := cmcMappingFile{
		UpdatedAt: time.Now(),
		Entries:   entries,
	}

	bytes, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal cmc mapping: %w", err)
	}

	dir := filepath.Dir(m.path)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return fmt.Errorf("failed to create mapping directory: %w", err)
	}

	tmpFile, err := os.CreateTemp(dir, "cmc_mapping_*.json")
	if err != nil {
		return fmt.Errorf("failed to create temp mapping file: %w", err)
	}

	if _, err := tmpFile.Write(bytes); err != nil {
		tmpFile.Close()
		return fmt.Errorf("failed to write mapping file: %w", err)
	}

	if err := tmpFile.Close(); err != nil {
		return fmt.Errorf("failed to close mapping file: %w", err)
	}

	if err := os.Rename(tmpFile.Name(), m.path); err != nil {
		return fmt.Errorf("failed to move mapping file: %w", err)
	}

	m.mu.Lock()
	m.data = entries
	m.mu.Unlock()

	return nil
}

func (m *CMCMapStore) loadFromFile() ([]CMCMappingEntry, error) {
	bytes, err := os.ReadFile(m.path)
	if err != nil {
		return nil, err
	}

	var payload cmcMappingFile
	if err := json.Unmarshal(bytes, &payload); err != nil {
		return nil, fmt.Errorf("failed to unmarshal mapping file: %w", err)
	}

	return payload.Entries, nil
}
