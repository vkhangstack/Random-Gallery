package domain

import (
	"regexp"
	"strings"
	"unicode/utf8"
)

type Account struct{ ID, Email string }
type Credentials struct {
	Account
	Salt string
	Key  []byte
}
type Session struct {
	Token, UserID string
	Expires       int64
}

var emailPattern = regexp.MustCompile(`^[^\s@]+@[^\s@]+\.[^\s@]+$`)

func NormalizeEmail(email string) string { return strings.ToLower(strings.TrimSpace(email)) }
func ValidCredentials(email, password string) bool {
	n := utf8.RuneCountInString(password)
	return len(email) <= 254 && emailPattern.MatchString(email) && n >= 12 && n <= 128
}
