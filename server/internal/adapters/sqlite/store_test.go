package sqlite

import (
	"context"
	"errors"
	"path/filepath"
	"randomgallery/server/internal/application"
	"randomgallery/server/internal/domain"
	"testing"
)

func TestRollbackReopenAndOwnership(t *testing.T) {
	path := filepath.Join(t.TempDir(), "gallery.sqlite")
	s, err := Open(path)
	if err != nil {
		t.Fatal(err)
	}
	ctx := context.Background()
	account := domain.Credentials{Account: domain.Account{ID: "owner", Email: "owner@test.example"}, Salt: "salt", Key: []byte("verifier")}
	if err = s.CreateAccount(ctx, account); err != nil {
		t.Fatal(err)
	}
	image := domain.Image{Metadata: domain.Metadata{ID: "image", Name: "private.png", BatchID: "batch", Favorite: true}, Content: []byte("original")}
	sentinel := errors.New("rollback")
	err = s.Within(ctx, func(tx application.Repositories) error {
		if e := tx.InsertImage(ctx, "owner", image); e != nil {
			return e
		}
		return sentinel
	})
	if !errors.Is(err, sentinel) {
		t.Fatal(err)
	}
	list, _ := s.ListImages(ctx, "owner")
	if len(list) != 0 {
		t.Fatal("rollback lost")
	}
	if err = s.InsertImage(ctx, "owner", image); err != nil {
		t.Fatal(err)
	}
	if _, err = s.Image(ctx, "other", "image"); !errors.Is(err, domain.ErrNotFound) {
		t.Fatal("owner leak", err)
	}
	if err = s.Close(); err != nil {
		t.Fatal(err)
	}
	s, err = Open(path)
	if err != nil {
		t.Fatal(err)
	}
	defer s.Close()
	saved, err := s.Image(ctx, "owner", "image")
	if err != nil || string(saved.Content) != "original" || !saved.Favorite {
		t.Fatal(saved, err)
	}
}
func TestRejectedDatabaseWritesPreserveContent(t *testing.T) {
	s, err := Open(filepath.Join(t.TempDir(), "gallery.sqlite"))
	if err != nil {
		t.Fatal(err)
	}
	defer s.Close()
	ctx := context.Background()
	s.CreateAccount(ctx, domain.Credentials{Account: domain.Account{ID: "owner", Email: "owner@example.test"}, Salt: "salt", Key: []byte("key")})
	image := domain.Image{Metadata: domain.Metadata{ID: "image", Name: "original.png", BatchID: "batch"}, Content: []byte("original")}
	if err = s.InsertImage(ctx, "owner", image); err != nil {
		t.Fatal(err)
	}
	if _, err = s.db.Exec("PRAGMA query_only=ON"); err != nil {
		t.Fatal(err)
	}
	for _, operation := range []func() error{
		func() error { _, e := s.Favorite(ctx, "owner", "image", true); return e },
		func() error { return s.DeleteImage(ctx, "owner", "image") },
		func() error { copy := image; copy.ID = "new"; return s.InsertImage(ctx, "owner", copy) },
	} {
		if err = operation(); err == nil {
			t.Fatal("accepted failed write")
		}
	}
	saved, err := s.Image(ctx, "owner", "image")
	if err != nil || saved.Favorite || string(saved.Content) != "original" {
		t.Fatal(saved, err)
	}
	images, err := s.ListImages(ctx, "owner")
	if err != nil || len(images) != 1 {
		t.Fatal(images, err)
	}
}
