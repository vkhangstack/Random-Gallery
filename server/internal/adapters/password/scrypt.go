package password

import (
	"context"
	"crypto/rand"
	"crypto/subtle"
	"encoding/hex"
	"golang.org/x/crypto/scrypt"
	"randomgallery/server/internal/domain"
)

type Hasher struct{ slots chan struct{} }

func New() *Hasher { return &Hasher{make(chan struct{}, 4)} }
func (h *Hasher) derive(ctx context.Context, password, salt string) ([]byte, error) {
	if err := ctx.Err(); err != nil {
		return nil, err
	}
	select {
	case h.slots <- struct{}{}:
		defer func() { <-h.slots }()
	default:
		return nil, domain.ErrOverload
	}
	key, err := scrypt.Key([]byte(password), []byte(salt), 32768, 8, 3, 64)
	if err == nil {
		err = ctx.Err()
	}
	return key, err
}
func (h *Hasher) Hash(ctx context.Context, password string) (string, []byte, error) {
	salt := make([]byte, 16)
	if _, err := rand.Read(salt); err != nil {
		return "", nil, err
	}
	text := hex.EncodeToString(salt)
	key, err := h.derive(ctx, password, text)
	return text, key, err
}
func (h *Hasher) Verify(ctx context.Context, password, salt string, key []byte) error {
	candidate, err := h.derive(ctx, password, salt)
	if err != nil {
		return err
	}
	if subtle.ConstantTimeCompare(candidate, key) != 1 {
		return domain.ErrCredentials
	}
	return nil
}
