package application

import (
	"context"
	"randomgallery/server/internal/domain"
)

func (s *Service) withOwner(ctx context.Context, token, expected string, fn func(Repositories, string) error) error {
	return s.store.Within(ctx, func(tx Repositories) error {
		user, err := s.session(ctx, tx, token, expected)
		if err != nil {
			return err
		}
		if err = ctx.Err(); err != nil {
			return err
		}
		return fn(tx, user.ID)
	})
}
func (s *Service) ListImages(ctx context.Context, token, expected string) (images []domain.Metadata, err error) {
	err = s.withOwner(ctx, token, expected, func(tx Repositories, owner string) error {
		var e error
		images, e = tx.ListImages(ctx, owner)
		return e
	})
	return
}
func (s *Service) ReadImage(ctx context.Context, token, expected, id string) (image domain.Image, err error) {
	if !domain.ValidID(id) {
		return image, domain.ErrNotFound
	}
	err = s.withOwner(ctx, token, expected, func(tx Repositories, owner string) error { var e error; image, e = tx.Image(ctx, owner, id); return e })
	return
}
func (s *Service) Upload(ctx context.Context, token, expected string, metadata domain.Metadata, content []byte) (domain.Metadata, error) {
	if _, err := s.Session(ctx, token, expected); err != nil {
		return domain.Metadata{}, err
	}
	if err := metadata.Validate(); err != nil {
		return domain.Metadata{}, err
	}
	mime, err := s.images.Validate(ctx, content)
	if err != nil {
		return domain.Metadata{}, err
	}
	metadata.MimeType = mime
	metadata.Size = int64(len(content))
	err = s.withOwner(ctx, token, expected, func(tx Repositories, owner string) error {
		return tx.InsertImage(ctx, owner, domain.Image{Metadata: metadata, Content: content})
	})
	return metadata, err
}
func (s *Service) SetFavorite(ctx context.Context, token, expected, id string, favorite bool) (metadata domain.Metadata, err error) {
	if !domain.ValidID(id) {
		return metadata, domain.ErrNotFound
	}
	err = s.withOwner(ctx, token, expected, func(tx Repositories, owner string) error {
		var e error
		metadata, e = tx.Favorite(ctx, owner, id, favorite)
		return e
	})
	return
}
func (s *Service) DeleteImage(ctx context.Context, token, expected, id string) error {
	if !domain.ValidID(id) {
		return domain.ErrNotFound
	}
	return s.withOwner(ctx, token, expected, func(tx Repositories, owner string) error { return tx.DeleteImage(ctx, owner, id) })
}
