package application

import (
	"context"
	"time"
)

type Service struct {
	store     Store
	passwords PasswordHasher
	images    ImageValidator
	Now       func() time.Time
}

func New(store Store, passwords PasswordHasher, images ImageValidator) *Service {
	return &Service{store, passwords, images, time.Now}
}
func (s *Service) Health(ctx context.Context) error { return s.store.Health(ctx) }
