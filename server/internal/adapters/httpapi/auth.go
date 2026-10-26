package httpapi

import (
	"encoding/json"
	"errors"
	"io"
	"net"
	"net/http"
	"randomgallery/server/internal/domain"
	"strings"
)

type userDTO struct {
	ID    string `json:"id"`
	Email string `json:"email"`
}

func token(r *http.Request) string {
	c, err := r.Cookie("gallery_session")
	if err != nil {
		return ""
	}
	return c.Value
}
func parseJSON(w http.ResponseWriter, r *http.Request, v any) error {
	r.Body = http.MaxBytesReader(w, r.Body, 8192)
	decoder := json.NewDecoder(r.Body)
	if err := decoder.Decode(v); err != nil {
		return domain.ErrInvalid
	}
	if err := decoder.Decode(new(any)); err != io.EOF {
		return domain.ErrInvalid
	}
	return nil
}
func (a *API) cookie(w http.ResponseWriter, value string, age int) {
	http.SetCookie(w, &http.Cookie{Name: "gallery_session", Value: value, Path: "/", HttpOnly: true, SameSite: http.SameSiteStrictMode, Secure: strings.HasPrefix(a.origin, "https://"), MaxAge: age})
}
func (a *API) auth(w http.ResponseWriter, r *http.Request) bool {
	path := r.URL.Path
	if path == "/api/auth/session" && r.Method == "GET" {
		user, err := a.service.Session(r.Context(), token(r), "")
		if errors.Is(err, domain.ErrUnauthorized) {
			respond(w, 200, map[string]any{"user": nil})
		} else if err != nil {
			problem(w, err)
		} else {
			respond(w, 200, map[string]any{"user": userDTO{user.ID, user.Email}})
		}
		return true
	}
	if path == "/api/auth/logout" && r.Method == "POST" {
		if err := a.service.Logout(r.Context(), token(r)); err != nil {
			problem(w, err)
		} else {
			a.cookie(w, "", -1)
			respond(w, 200, map[string]bool{"ok": true})
		}
		return true
	}
	if (path == "/api/auth/login" || path == "/api/auth/register") && r.Method == "POST" {
		var body struct {
			Email    string `json:"email"`
			Password string `json:"password"`
		}
		if err := parseJSON(w, r, &body); err != nil {
			problem(w, err)
			return true
		}
		ip := r.Header.Get("X-Real-IP")
		if ip == "" {
			ip, _, _ = net.SplitHostPort(r.RemoteAddr)
		}
		operation := a.service.Login
		if path == "/api/auth/register" {
			operation = a.service.Register
		}
		result, err := operation(r.Context(), body.Email, body.Password, ip)
		if err != nil {
			problem(w, err)
		} else {
			a.cookie(w, result.Token, 604800)
			respond(w, 200, map[string]any{"user": userDTO{result.User.ID, result.User.Email}})
		}
		return true
	}
	return false
}
