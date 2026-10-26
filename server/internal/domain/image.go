package domain

import (
	"regexp"
	"strings"
	"unicode/utf8"
)

const MaxImageSize = 10 * 1024 * 1024
const MaxPixels = 40000000
const MaxSafeInteger = 9007199254740991

var idPattern = regexp.MustCompile(`^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$`)

func ValidID(id string) bool { return idPattern.MatchString(id) }

type Metadata struct {
	ID, Name, MimeType, BatchID string
	Size, AddedAt, Ordinal      int64
	Favorite                    bool
}
type Image struct {
	Metadata
	Content []byte
}

func (m Metadata) Validate() error {
	if !ValidID(m.ID) || !ValidID(m.BatchID) || strings.TrimSpace(m.Name) == "" || utf8.RuneCountInString(m.Name) > 1024 || m.AddedAt < 0 || m.AddedAt > MaxSafeInteger || m.Ordinal < 0 || m.Ordinal > MaxSafeInteger {
		return ErrInvalid
	}
	return nil
}
