package httpapi

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"randomgallery/server/internal/application"
	"randomgallery/server/internal/domain"
	"time"
)

type API struct {
	service *application.Service
	origin  string
	uploads chan struct{}
}

func New(service *application.Service, origin string) http.Handler {
	a := &API{service, origin, make(chan struct{}, 2)}
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "no-store")
		w.Header().Set("X-Content-Type-Options", "nosniff")
		if r.Method != "GET" && r.Method != "HEAD" && r.Header.Get("Origin") != origin {
			respond(w, 403, map[string]string{"error": "Request origin is not allowed."})
			return
		}
		if r.URL.Path == "/api/health" && r.Method == "GET" {
			if err := service.Health(r.Context()); err != nil {
				problem(w, err)
			} else {
				respond(w, 200, map[string]bool{"ok": true})
			}
			return
		}
		ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
		defer cancel()
		a.route(w, r.WithContext(ctx))
	})
}
func respond(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}
func problem(w http.ResponseWriter, err error) {
	status := 500
	message := "The server could not complete your request. Retry."
	switch {
	case errors.Is(err, domain.ErrInvalid):
		status = 400
	case errors.Is(err, domain.ErrUnauthorized), errors.Is(err, domain.ErrCredentials):
		status = 401
	case errors.Is(err, domain.ErrNotFound):
		status = 404
	case errors.Is(err, domain.ErrConflict):
		status = 409
	case errors.Is(err, domain.ErrOverload):
		status = 429
		w.Header().Set("Retry-After", "60")
	}
	if status != 500 {
		message = err.Error()
	}
	respond(w, status, map[string]string{"error": message})
}
func (a *API) route(w http.ResponseWriter, r *http.Request) {
	if a.auth(w, r) {
		return
	}
	if _, err := a.service.Session(r.Context(), token(r), r.Header.Get("X-Gallery-Account")); err != nil {
		problem(w, err)
		return
	}
	if a.images(w, r) {
		return
	}
	respond(w, 404, map[string]string{"error": "Endpoint was not found."})
}
