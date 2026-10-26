package password

import (
	"context"
	"errors"
	"randomgallery/server/internal/domain"
	"testing"
)

func TestPasswordVerificationAndAdmission(t *testing.T) {
	h := New()
	ctx := context.Background()
	salt, key, err := h.Hash(ctx, "password with sufficient length")
	if err != nil {
		t.Fatal(err)
	}
	if len(salt) != 32 || len(key) != 64 {
		t.Fatal("invalid encoding")
	}
	if err = h.Verify(ctx, "password with sufficient length", salt, key); err != nil {
		t.Fatal(err)
	}
	if !errors.Is(h.Verify(ctx, "wrong password", salt, key), domain.ErrCredentials) {
		t.Fatal("accepted wrong password")
	}
	for i := 0; i < 4; i++ {
		h.slots <- struct{}{}
	}
	if _, _, err = h.Hash(ctx, "password"); !errors.Is(err, domain.ErrOverload) {
		t.Fatal(err)
	}
}
