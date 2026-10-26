package imagevalidation

import (
	"bytes"
	"context"
	_ "golang.org/x/image/webp"
	"image"
	_ "image/jpeg"
	_ "image/png"
	"randomgallery/server/internal/domain"
)

type Validator struct{}

func (Validator) Validate(ctx context.Context, content []byte) (string, error) {
	if err := ctx.Err(); err != nil {
		return "", err
	}
	if len(content) == 0 || len(content) > domain.MaxImageSize {
		return "", domain.ErrInvalid
	}
	config, format, err := image.DecodeConfig(bytes.NewReader(content))
	if err != nil || config.Width <= 0 || config.Height <= 0 || config.Width > domain.MaxPixels/config.Height {
		return "", domain.ErrInvalid
	}
	mime := map[string]string{"jpeg": "image/jpeg", "png": "image/png", "webp": "image/webp"}[format]
	if mime == "" {
		return "", domain.ErrInvalid
	}
	_, _, err = image.Decode(bytes.NewReader(content))
	if err != nil {
		return "", domain.ErrInvalid
	}
	return mime, ctx.Err()
}
