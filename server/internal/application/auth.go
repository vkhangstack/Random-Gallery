package application

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"randomgallery/server/internal/domain"
	"strings"
)

type AuthResult struct {
	User  domain.Account
	Token string
}

func NewID() string {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		panic("system random source unavailable")
	}
	b[6] = (b[6] & 15) | 64
	b[8] = (b[8] & 63) | 128
	return fmt.Sprintf("%x-%x-%x-%x-%x", b[:4], b[4:6], b[6:8], b[8:10], b[10:])
}
func Digest(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}
func (s *Service) authAttempt(ctx context.Context, email, password, ip string) error {
	if !domain.ValidCredentials(email, password) {
		return domain.ErrInvalid
	}
	allowed, err := s.store.RecordAttempt(ctx, []string{"ip:" + ip, "email:" + email}, s.Now().UnixMilli())
	if err != nil {
		return err
	}
	if !allowed {
		return domain.ErrOverload
	}
	return nil
}
func (s *Service) newSession(user domain.Account) (AuthResult, domain.Session, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return AuthResult{}, domain.Session{}, err
	}
	token := hex.EncodeToString(b)
	return AuthResult{user, token}, domain.Session{Token: Digest(token), UserID: user.ID, Expires: s.Now().UnixMilli() + 7*86400000}, nil
}
func (s *Service) Register(ctx context.Context, email, password, ip string) (AuthResult, error) {
	email = domain.NormalizeEmail(email)
	if err := s.authAttempt(ctx, email, password, ip); err != nil {
		return AuthResult{}, err
	}
	salt, key, err := s.passwords.Hash(ctx, password)
	if err != nil {
		return AuthResult{}, err
	}
	user := domain.Account{ID: NewID(), Email: email}
	result, session, err := s.newSession(user)
	if err != nil {
		return AuthResult{}, err
	}
	err = s.store.Within(ctx, func(tx Repositories) error {
		if err := tx.CreateAccount(ctx, domain.Credentials{Account: user, Salt: salt, Key: key}); err != nil {
			return err
		}
		return tx.CreateSession(ctx, session)
	})
	return result, err
}
func (s *Service) Login(ctx context.Context, email, password, ip string) (AuthResult, error) {
	email = domain.NormalizeEmail(email)
	if err := s.authAttempt(ctx, email, password, ip); err != nil {
		return AuthResult{}, err
	}
	user, err := s.store.AccountByEmail(ctx, email)
	if err != nil && !errors.Is(err, domain.ErrNotFound) {
		return AuthResult{}, err
	}
	salt, key := user.Salt, user.Key
	if errors.Is(err, domain.ErrNotFound) {
		salt = strings.Repeat("0", 32)
		key = make([]byte, 64)
	}
	if verify := s.passwords.Verify(ctx, password, salt, key); verify != nil {
		return AuthResult{}, verify
	}
	if err != nil {
		return AuthResult{}, domain.ErrCredentials
	}
	result, session, err := s.newSession(user.Account)
	if err != nil {
		return AuthResult{}, err
	}
	err = s.store.Within(ctx, func(tx Repositories) error { return tx.CreateSession(ctx, session) })
	return result, err
}
func (s *Service) Session(ctx context.Context, token, expected string) (domain.Account, error) {
	return s.session(ctx, s.store, token, expected)
}
func (s *Service) session(ctx context.Context, repos Repositories, token, expected string) (domain.Account, error) {
	if len(token) != 64 {
		return domain.Account{}, domain.ErrUnauthorized
	}
	user, err := repos.Session(ctx, Digest(token), s.Now().UnixMilli())
	if err != nil {
		return domain.Account{}, err
	}
	if expected != "" && user.ID != expected {
		return domain.Account{}, domain.ErrUnauthorized
	}
	return user, nil
}
func (s *Service) Logout(ctx context.Context, token string) error {
	return s.store.DeleteSession(ctx, Digest(token))
}
