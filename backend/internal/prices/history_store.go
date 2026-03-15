package prices

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/url"
	"os"
	"time"

	_ "github.com/tursodatabase/libsql-client-go/libsql"
)

type historyStoreRow struct {
	CoinID      string         `json:"coin_id"`
	Days        string         `json:"days"`
	Interval    string         `json:"interval"`
	Prices      []HistoryPoint `json:"prices"`
	UpdatedAtMs int64          `json:"updated_at_ms"`
}

// HistoryStore persists historical price payloads in Turso/libSQL.
type HistoryStore struct {
	db *sql.DB
}

func NewHistoryStoreFromEnv() (*HistoryStore, error) {
	url := os.Getenv("TURSO_DATABASE_URL")
	token := os.Getenv("TURSO_AUTH_TOKEN")
	if url == "" || token == "" {
		return nil, nil
	}

	dsn, err := buildTursoDSN(url, token)
	if err != nil {
		return nil, err
	}
	db, err := sql.Open("libsql", dsn)
	if err != nil {
		return nil, fmt.Errorf("failed to open Turso database: %w", err)
	}

	if err := db.Ping(); err != nil {
		db.Close()
		return nil, fmt.Errorf("failed to ping Turso database: %w", err)
	}

	store := &HistoryStore{db: db}
	if err := store.ensureSchema(); err != nil {
		db.Close()
		return nil, err
	}

	return store, nil
}

func (s *HistoryStore) Close() error {
	if s == nil || s.db == nil {
		return nil
	}
	return s.db.Close()
}

func (s *HistoryStore) Get(key, days, interval string) (*HistoryResponse, bool, error) {
	if s == nil || s.db == nil {
		return nil, false, nil
	}

	var payload string
	err := s.db.QueryRow(
		`SELECT payload_json FROM history_cache WHERE cache_key = ?`,
		key,
	).Scan(&payload)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, false, nil
		}
		return nil, false, fmt.Errorf("failed to query Turso history cache: %w", err)
	}

	var row historyStoreRow
	if err := json.Unmarshal([]byte(payload), &row); err != nil {
		return nil, false, fmt.Errorf("failed to decode Turso history payload: %w", err)
	}

	updatedAt := time.UnixMilli(row.UpdatedAtMs)
	if time.Since(updatedAt) > historyTTL(row.Days, row.Interval) {
		return nil, false, nil
	}

	return &HistoryResponse{
		ID:        row.CoinID,
		Days:      row.Days,
		Interval:  row.Interval,
		Prices:    row.Prices,
		Timestamp: time.Now().UnixMilli(),
		Cached:    true,
		UpdatedAt: updatedAt,
	}, true, nil
}

func (s *HistoryStore) Set(key string, history *HistoryResponse) error {
	if s == nil || s.db == nil || history == nil {
		return nil
	}

	updatedAt := time.Now()
	row := historyStoreRow{
		CoinID:      history.ID,
		Days:        history.Days,
		Interval:    history.Interval,
		Prices:      history.Prices,
		UpdatedAtMs: updatedAt.UnixMilli(),
	}

	payload, err := json.Marshal(row)
	if err != nil {
		return fmt.Errorf("failed to encode Turso history payload: %w", err)
	}

	_, err = s.db.Exec(
		`
		INSERT INTO history_cache (cache_key, coin_id, days, interval, payload_json, updated_at_ms)
		VALUES (?, ?, ?, ?, ?, ?)
		ON CONFLICT(cache_key) DO UPDATE SET
			coin_id = excluded.coin_id,
			days = excluded.days,
			interval = excluded.interval,
			payload_json = excluded.payload_json,
			updated_at_ms = excluded.updated_at_ms
		`,
		key,
		history.ID,
		history.Days,
		history.Interval,
		string(payload),
		row.UpdatedAtMs,
	)
	if err != nil {
		return fmt.Errorf("failed to upsert Turso history cache: %w", err)
	}

	return nil
}

func buildTursoDSN(rawURL, token string) (string, error) {
	parsed, err := url.Parse(rawURL)
	if err != nil {
		return "", fmt.Errorf("invalid TURSO_DATABASE_URL: %w", err)
	}

	query := parsed.Query()
	query.Set("authToken", token)
	parsed.RawQuery = query.Encode()

	return parsed.String(), nil
}

func (s *HistoryStore) ensureSchema() error {
	if s == nil || s.db == nil {
		return nil
	}

	_, err := s.db.Exec(
		`
		CREATE TABLE IF NOT EXISTS history_cache (
			cache_key TEXT PRIMARY KEY,
			coin_id TEXT NOT NULL,
			days TEXT NOT NULL,
			interval TEXT NOT NULL,
			payload_json TEXT NOT NULL,
			updated_at_ms INTEGER NOT NULL
		)
		`,
	)
	if err != nil {
		return fmt.Errorf("failed to create Turso history cache schema: %w", err)
	}

	return nil
}
