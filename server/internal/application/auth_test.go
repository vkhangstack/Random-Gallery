package application_test

import (
	"context"
	"errors"
	"randomgallery/server/internal/application"
	"randomgallery/server/internal/domain"
	"testing"
	"time"
)

type memory struct {
	application.Store
	user     domain.Credentials
	sessions map[string]domain.Session
}

func (m *memory) AccountByEmail(context.Context, string) (domain.Credentials, error) {
	if m.user.ID == "" {
		return domain.Credentials{}, domain.ErrNotFound
	}
	return m.user, nil
}
func (m *memory) CreateAccount(_ context.Context, c domain.Credentials) error {
	if m.user.ID != "" {
		return domain.ErrConflict
	}
	m.user = c
	return nil
}
func (m *memory) Session(_ context.Context, token string, now int64) (domain.Account, error) {
	s, ok := m.sessions[token]
	if !ok || s.Expires <= now {
		return domain.Account{}, domain.ErrUnauthorized
	}
	return m.user.Account, nil
}
func (m *memory) CreateSession(_ context.Context, s domain.Session) error {
	m.sessions[s.Token] = s
	return nil
}
func (m *memory) DeleteSession(_ context.Context, token string) error {
	delete(m.sessions, token)
	return nil
}
func (m *memory) RecordAttempt(context.Context, []string, int64) (bool, error) { return true, nil }
func (m *memory) Within(ctx context.Context, fn func(application.Repositories) error) error {
	return fn(m)
}

type passwords struct{}

func (passwords) Hash(_ context.Context, p string) (string, []byte, error) {
	return "salt", []byte(p), nil
}
func (passwords) Verify(_ context.Context, p, s string, k []byte) error {
	if string(k) != p {
		return domain.ErrCredentials
	}
	return nil
}
func TestAuthUseCasesThroughPorts(t *testing.T) {
	m := &memory{sessions: map[string]domain.Session{}}
	s := application.New(m, passwords{}, nil)
	ctx := context.Background()
	result, err := s.Register(ctx, "  OWNER@Example.test ", "a long enough password", "ip")
	if err != nil {
		t.Fatal(err)
	}
	if result.User.Email != "owner@example.test" || result.Token == "" {
		t.Fatal(result)
	}
	if _, err = s.Session(ctx, result.Token, result.User.ID); err != nil {
		t.Fatal(err)
	}
	if _, err = s.Session(ctx, result.Token, "another"); !errors.Is(err, domain.ErrUnauthorized) {
		t.Fatal("expected-account bypass")
	}
	if _, err = s.Login(ctx, "owner@example.test", "another long password", "ip"); !errors.Is(err, domain.ErrCredentials) {
		t.Fatal(err)
	}
	s.Now = func() time.Time { return time.Now().Add(8 * 24 * time.Hour) }
	if _, err = s.Session(ctx, result.Token, ""); !errors.Is(err, domain.ErrUnauthorized) {
		t.Fatal("expired session accepted")
	}
	s.Now = time.Now
	if err = s.Logout(ctx, result.Token); err != nil {
		t.Fatal(err)
	}
	if _, err = s.Session(ctx, result.Token, ""); !errors.Is(err, domain.ErrUnauthorized) {
		t.Fatal("logout did not revoke")
	}
}
