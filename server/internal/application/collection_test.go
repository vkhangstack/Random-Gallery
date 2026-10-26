package application_test

import (
	"context"
	"errors"
	"path/filepath"
	"randomgallery/server/internal/adapters/sqlite"
	"randomgallery/server/internal/application"
	"randomgallery/server/internal/domain"
	"testing"
)

type validator struct{ entered, release chan struct{} }

func (v validator) Validate(ctx context.Context, b []byte) (string, error) {
	if v.entered != nil {
		close(v.entered)
		select {
		case <-v.release:
		case <-ctx.Done():
			return "", ctx.Err()
		}
	}
	return "image/png", nil
}
func TestRevocationDuringValidationCannotCommit(t *testing.T) {
	store, err := sqlite.Open(filepath.Join(t.TempDir(), "gallery.sqlite"))
	if err != nil {
		t.Fatal(err)
	}
	defer store.Close()
	v := validator{make(chan struct{}), make(chan struct{})}
	s := application.New(store, passwords{}, v)
	ctx := context.Background()
	auth, err := s.Register(ctx, "owner@example.test", "a long enough password", "ip")
	if err != nil {
		t.Fatal(err)
	}
	result := make(chan error, 1)
	go func() {
		_, e := s.Upload(ctx, auth.Token, auth.User.ID, domain.Metadata{ID: application.NewID(), Name: "image.png", BatchID: application.NewID()}, []byte("content"))
		result <- e
	}()
	<-v.entered
	if err = s.Logout(ctx, auth.Token); err != nil {
		t.Fatal(err)
	}
	close(v.release)
	if err = <-result; !errors.Is(err, domain.ErrUnauthorized) {
		t.Fatal("revoked write committed", err)
	}
	list, err := store.ListImages(ctx, auth.User.ID)
	if err != nil || len(list) != 0 {
		t.Fatal(list, err)
	}
}
func TestCollectionUseCasesThroughPorts(t *testing.T) {
	store, err := sqlite.Open(filepath.Join(t.TempDir(), "gallery.sqlite"))
	if err != nil {
		t.Fatal(err)
	}
	defer store.Close()
	s := application.New(store, passwords{}, validator{})
	ctx := context.Background()
	a, _ := s.Register(ctx, "a@example.test", "a long enough password", "ip")
	b, _ := s.Register(ctx, "b@example.test", "a long enough password", "ip")
	m := domain.Metadata{ID: application.NewID(), Name: "image.png", BatchID: application.NewID()}
	saved, err := s.Upload(ctx, a.Token, a.User.ID, m, []byte("original"))
	if err != nil || saved.Size != 8 {
		t.Fatal(saved, err)
	}
	if _, err = s.ReadImage(ctx, b.Token, b.User.ID, m.ID); !errors.Is(err, domain.ErrNotFound) {
		t.Fatal("private image disclosed", err)
	}
	if _, err = s.Upload(ctx, a.Token, a.User.ID, m, []byte("replacement")); !errors.Is(err, domain.ErrConflict) {
		t.Fatal("overwrote duplicate", err)
	}
	cancelled, cancel := context.WithCancel(ctx)
	cancel()
	if _, err = s.ReadImage(cancelled, a.Token, a.User.ID, m.ID); err == nil {
		t.Fatal("cancelled read accepted")
	}
}
func TestFavoriteDeleteAndInvalidSession(t *testing.T) {
	store, err := sqlite.Open(filepath.Join(t.TempDir(), "gallery.sqlite"))
	if err != nil {
		t.Fatal(err)
	}
	defer store.Close()
	s := application.New(store, passwords{}, validator{})
	ctx := context.Background()
	a, _ := s.Register(ctx, "owner@example.test", "a long enough password", "ip")
	m := domain.Metadata{ID: application.NewID(), BatchID: application.NewID(), Name: "image.png"}
	if _, err = s.Upload(ctx, a.Token, a.User.ID, m, []byte("original")); err != nil {
		t.Fatal(err)
	}
	if _, err = s.SetFavorite(ctx, a.Token, a.User.ID, m.ID, true); err != nil {
		t.Fatal(err)
	}
	image, err := s.ReadImage(ctx, a.Token, a.User.ID, m.ID)
	if err != nil || !image.Favorite {
		t.Fatal(image, err)
	}
	if err = s.Logout(ctx, a.Token); err != nil {
		t.Fatal(err)
	}
	if err = s.DeleteImage(ctx, a.Token, a.User.ID, m.ID); !errors.Is(err, domain.ErrUnauthorized) {
		t.Fatal("revoked delete accepted")
	}
	if _, err = store.Image(ctx, a.User.ID, m.ID); err != nil {
		t.Fatal("revoked delete removed image")
	}
}

type gatedStore struct {
	application.Store
	entered, release chan struct{}
}
type gatedRepos struct {
	application.Repositories
	entered, release chan struct{}
}

func (g gatedRepos) Session(ctx context.Context, token string, now int64) (domain.Account, error) {
	account, err := g.Repositories.Session(ctx, token, now)
	close(g.entered)
	select {
	case <-g.release:
	case <-ctx.Done():
		return domain.Account{}, ctx.Err()
	}
	return account, err
}
func (g gatedStore) Within(ctx context.Context, fn func(application.Repositories) error) error {
	return g.Store.Within(ctx, func(tx application.Repositories) error { return fn(gatedRepos{tx, g.entered, g.release}) })
}
func TestConcurrentLogoutIsOrderedWithAuthorizedWrite(t *testing.T) {
	store, err := sqlite.Open(filepath.Join(t.TempDir(), "gallery.sqlite"))
	if err != nil {
		t.Fatal(err)
	}
	defer store.Close()
	ctx := context.Background()
	service := application.New(store, passwords{}, validator{})
	auth, err := service.Register(ctx, "owner@example.test", "a long enough password", "ip")
	if err != nil {
		t.Fatal(err)
	}
	m := domain.Metadata{ID: application.NewID(), BatchID: application.NewID(), Name: "image.png"}
	if _, err = service.Upload(ctx, auth.Token, auth.User.ID, m, []byte("original")); err != nil {
		t.Fatal(err)
	}
	entered, release := make(chan struct{}), make(chan struct{})
	gated := application.New(gatedStore{store, entered, release}, passwords{}, validator{})
	writeDone := make(chan error, 1)
	logoutDone := make(chan error, 1)
	go func() { _, e := gated.SetFavorite(ctx, auth.Token, auth.User.ID, m.ID, true); writeDone <- e }()
	<-entered
	go func() { logoutDone <- service.Logout(ctx, auth.Token) }()
	close(release)
	if err = <-writeDone; err != nil {
		t.Fatal(err)
	}
	if err = <-logoutDone; err != nil {
		t.Fatal(err)
	}
	if _, err = service.Session(ctx, auth.Token, ""); !errors.Is(err, domain.ErrUnauthorized) {
		t.Fatal("revocation lost")
	}
	image, err := store.Image(ctx, auth.User.ID, m.ID)
	if err != nil || !image.Favorite {
		t.Fatal(image, err)
	}
}
