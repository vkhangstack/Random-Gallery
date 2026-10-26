package sqlite

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	_ "modernc.org/sqlite"
	"randomgallery/server/internal/application"
	"randomgallery/server/internal/domain"
	"strings"
)

type executor interface {
	ExecContext(context.Context, string, ...any) (sql.Result, error)
	QueryContext(context.Context, string, ...any) (*sql.Rows, error)
	QueryRowContext(context.Context, string, ...any) *sql.Row
}
type repository struct{ q executor }
type Store struct {
	repository
	db *sql.DB
}

func Open(path string) (*Store, error) {
	db, err := sql.Open("sqlite", path)
	if err != nil {
		return nil, err
	}
	db.SetMaxOpenConns(1)
	s := &Store{repository{db}, db}
	_, err = db.Exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
 CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,salt TEXT NOT NULL,password BLOB NOT NULL);
 CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),expires INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS images(id TEXT NOT NULL,user_id TEXT NOT NULL REFERENCES users(id),metadata TEXT NOT NULL,content BLOB NOT NULL,PRIMARY KEY(user_id,id));
 CREATE TABLE IF NOT EXISTS attempts(key TEXT PRIMARY KEY,count INTEGER NOT NULL,expires INTEGER NOT NULL);`)
	if err != nil {
		db.Close()
		return nil, err
	}
	return s, nil
}
func (s *Store) Close() error                     { return s.db.Close() }
func (s *Store) Health(ctx context.Context) error { return s.db.PingContext(ctx) }
func (s *Store) Within(ctx context.Context, fn func(application.Repositories) error) error {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	if err = fn(&repository{tx}); err != nil {
		return err
	}
	return tx.Commit()
}
func translate(err error) error {
	if errors.Is(err, sql.ErrNoRows) {
		return domain.ErrNotFound
	}
	if err != nil && strings.Contains(err.Error(), "UNIQUE constraint failed") {
		return domain.ErrConflict
	}
	return err
}
func (r *repository) AccountByEmail(ctx context.Context, email string) (c domain.Credentials, err error) {
	err = r.q.QueryRowContext(ctx, "SELECT id,email,salt,password FROM users WHERE email=?", email).Scan(&c.ID, &c.Email, &c.Salt, &c.Key)
	return c, translate(err)
}
func (r *repository) CreateAccount(ctx context.Context, c domain.Credentials) error {
	_, err := r.q.ExecContext(ctx, "INSERT INTO users VALUES(?,?,?,?)", c.ID, c.Email, c.Salt, c.Key)
	return translate(err)
}
func (r *repository) Session(ctx context.Context, token string, now int64) (a domain.Account, err error) {
	err = r.q.QueryRowContext(ctx, "SELECT users.id,email FROM sessions JOIN users ON users.id=sessions.user_id WHERE token=? AND expires>?", token, now).Scan(&a.ID, &a.Email)
	if errors.Is(err, sql.ErrNoRows) {
		err = domain.ErrUnauthorized
	}
	return
}
func (r *repository) CreateSession(ctx context.Context, s domain.Session) error {
	_, err := r.q.ExecContext(ctx, "INSERT INTO sessions VALUES(?,?,?)", s.Token, s.UserID, s.Expires)
	return err
}
func (r *repository) DeleteSession(ctx context.Context, token string) error {
	_, err := r.q.ExecContext(ctx, "DELETE FROM sessions WHERE token=?", token)
	return err
}
func (s *Store) RecordAttempt(ctx context.Context, keys []string, now int64) (bool, error) {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return false, err
	}
	defer tx.Rollback()
	if _, err = tx.ExecContext(ctx, "DELETE FROM attempts WHERE expires<=?", now); err != nil {
		return false, err
	}
	allowed := true
	for _, key := range keys {
		if _, err = tx.ExecContext(ctx, "INSERT INTO attempts VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1", key, now+15*60*1000); err != nil {
			return false, err
		}
		var count int
		if err = tx.QueryRowContext(ctx, "SELECT count FROM attempts WHERE key=?", key).Scan(&count); err != nil {
			return false, err
		}
		if count > 30 {
			allowed = false
		}
	}
	return allowed, tx.Commit()
}

type metadataRecord struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	MimeType string `json:"mimeType"`
	Size     int64  `json:"size"`
	AddedAt  int64  `json:"addedAt"`
	BatchID  string `json:"batchId"`
	Ordinal  int64  `json:"ordinal"`
	Favorite bool   `json:"favorite"`
}

func record(m domain.Metadata) metadataRecord {
	return metadataRecord{m.ID, m.Name, m.MimeType, m.Size, m.AddedAt, m.BatchID, m.Ordinal, m.Favorite}
}
func (m metadataRecord) domain() domain.Metadata {
	return domain.Metadata{ID: m.ID, Name: m.Name, MimeType: m.MimeType, Size: m.Size, AddedAt: m.AddedAt, BatchID: m.BatchID, Ordinal: m.Ordinal, Favorite: m.Favorite}
}
func (r *repository) ListImages(ctx context.Context, owner string) ([]domain.Metadata, error) {
	rows, err := r.q.QueryContext(ctx, `SELECT metadata FROM images WHERE user_id=? ORDER BY json_extract(metadata,'$.addedAt') DESC,json_extract(metadata,'$.batchId'),json_extract(metadata,'$.ordinal'),id`, owner)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	images := []domain.Metadata{}
	for rows.Next() {
		var raw string
		var m metadataRecord
		if err = rows.Scan(&raw); err != nil {
			return nil, err
		}
		if err = json.Unmarshal([]byte(raw), &m); err != nil {
			return nil, err
		}
		images = append(images, m.domain())
	}
	return images, rows.Err()
}
func (r *repository) Image(ctx context.Context, owner, id string) (image domain.Image, err error) {
	var raw string
	err = r.q.QueryRowContext(ctx, "SELECT metadata,content FROM images WHERE user_id=? AND id=?", owner, id).Scan(&raw, &image.Content)
	if err != nil {
		return image, translate(err)
	}
	var m metadataRecord
	err = json.Unmarshal([]byte(raw), &m)
	image.Metadata = m.domain()
	return
}
func (r *repository) InsertImage(ctx context.Context, owner string, image domain.Image) error {
	raw, err := json.Marshal(record(image.Metadata))
	if err != nil {
		return err
	}
	_, err = r.q.ExecContext(ctx, "INSERT INTO images VALUES(?,?,?,?)", image.ID, owner, string(raw), image.Content)
	return translate(err)
}
func (r *repository) Favorite(ctx context.Context, owner, id string, favorite bool) (domain.Metadata, error) {
	result, err := r.q.ExecContext(ctx, "UPDATE images SET metadata=json_set(metadata,'$.favorite',json(?)) WHERE user_id=? AND id=?", map[bool]string{true: "true", false: "false"}[favorite], owner, id)
	if err != nil {
		return domain.Metadata{}, err
	}
	n, _ := result.RowsAffected()
	if n == 0 {
		return domain.Metadata{}, domain.ErrNotFound
	}
	image, err := r.Image(ctx, owner, id)
	return image.Metadata, err
}
func (r *repository) DeleteImage(ctx context.Context, owner, id string) error {
	result, err := r.q.ExecContext(ctx, "DELETE FROM images WHERE user_id=? AND id=?", owner, id)
	if err != nil {
		return err
	}
	n, _ := result.RowsAffected()
	if n == 0 {
		return domain.ErrNotFound
	}
	return nil
}
