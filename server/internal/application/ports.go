package application

import (
	"context"
	"randomgallery/server/internal/domain"
)

type Accounts interface {
	AccountByEmail(context.Context, string) (domain.Credentials, error)
	CreateAccount(context.Context, domain.Credentials) error
}
type Sessions interface {
	Session(context.Context, string, int64) (domain.Account, error)
	CreateSession(context.Context, domain.Session) error
	DeleteSession(context.Context, string) error
}
type Images interface {
	ListImages(context.Context, string) ([]domain.Metadata, error)
	Image(context.Context, string, string) (domain.Image, error)
	InsertImage(context.Context, string, domain.Image) error
	Favorite(context.Context, string, string, bool) (domain.Metadata, error)
	DeleteImage(context.Context, string, string) error
}
type Attempts interface {
	RecordAttempt(context.Context, []string, int64) (bool, error)
}
type Repositories interface {
	Accounts
	Sessions
	Images
}
type Store interface {
	Repositories
	Attempts
	Within(context.Context, func(Repositories) error) error
	Health(context.Context) error
}
type PasswordHasher interface {
	Hash(context.Context, string) (string, []byte, error)
	Verify(context.Context, string, string, []byte) error
}
type ImageValidator interface {
	Validate(context.Context, []byte) (string, error)
}
