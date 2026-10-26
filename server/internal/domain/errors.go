package domain

import "errors"

var (
	ErrInvalid      = errors.New("Invalid request. Check the submitted details.")
	ErrUnauthorized = errors.New("Your session has ended. Sign in again.")
	ErrCredentials  = errors.New("Email or password is incorrect.")
	ErrNotFound     = errors.New("Image was not found.")
	ErrConflict     = errors.New("The account or image already exists. Sign in or refresh your collection.")
	ErrOverload     = errors.New("Too many requests. Wait and retry.")
)
