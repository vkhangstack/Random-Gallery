package httpapi_test

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"randomgallery/server/internal/adapters/httpapi"
	"randomgallery/server/internal/adapters/imagevalidation"
	"randomgallery/server/internal/adapters/password"
	"randomgallery/server/internal/adapters/sqlite"
	"randomgallery/server/internal/application"
	"strings"
	"testing"
	"time"
)

const origin = "http://127.0.0.1:8081"
const pass = "correct horse battery staple"

type fixture struct {
	handler http.Handler
	store   *sqlite.Store
	service *application.Service
}

func setup(t *testing.T, host string) *fixture {
	t.Helper()
	store, err := sqlite.Open(filepath.Join(t.TempDir(), "gallery.sqlite"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { store.Close() })
	service := application.New(store, password.New(), imagevalidation.Validator{})
	return &fixture{httpapi.New(service, host), store, service}
}
func (f *fixture) request(method, path, cookie string, body io.Reader, headers map[string]string) *httptest.ResponseRecorder {
	r := httptest.NewRequest(method, "http://gallery.test/api"+path, body)
	r.Header.Set("Origin", origin)
	r.Header.Set("Cookie", cookie)
	r.RemoteAddr = "127.0.0.1:4444"
	for k, v := range headers {
		r.Header.Set(k, v)
	}
	w := httptest.NewRecorder()
	f.handler.ServeHTTP(w, r)
	return w
}
func (f *fixture) register(t *testing.T) (string, string) {
	t.Helper()
	email := application.NewID() + "@example.test"
	body, _ := json.Marshal(map[string]string{"email": email, "password": pass})
	w := f.request("POST", "/auth/register", "", bytes.NewReader(body), nil)
	if w.Code != 200 {
		t.Fatal(w.Code, w.Body.String())
	}
	var result struct {
		User struct {
			ID string `json:"id"`
		}
	}
	if err := json.Unmarshal(w.Body.Bytes(), &result); err != nil {
		t.Fatal(err)
	}
	return w.Result().Cookies()[0].String(), result.User.ID
}
func TestAuthHTTPContract(t *testing.T) {
	f := setup(t, origin)
	cookie, _ := f.register(t)
	for _, body := range []string{`null`, `{}`, `{"email":"bad","password":"short"}`, `{"email":1,"password":false}`, strings.Repeat("x", 8193)} {
		if w := f.request("POST", "/auth/login", "", strings.NewReader(body), nil); w.Code != 400 {
			t.Fatal(w.Code)
		}
	}
	if w := f.request("POST", "/auth/register", "", strings.NewReader(`{}`), map[string]string{"Origin": "https://evil.test"}); w.Code != 403 {
		t.Fatal(w.Code)
	}
	if w := f.request("GET", "/auth/session", cookie, nil, nil); w.Code != 200 || strings.Contains(w.Body.String(), `"user":null`) {
		t.Fatal(w.Body.String())
	}
	user, err := f.service.Session(context.Background(), strings.Split(strings.Split(cookie, ";")[0], "=")[1], "")
	if err != nil {
		t.Fatal(err)
	}
	wrong, _ := json.Marshal(map[string]string{"email": user.Email, "password": "wrong password long enough"})
	if w := f.request("POST", "/auth/login", "", bytes.NewReader(wrong), nil); w.Code != 401 {
		t.Fatal(w.Code)
	}
	correct, _ := json.Marshal(map[string]string{"email": user.Email, "password": pass})
	login := f.request("POST", "/auth/login", "", bytes.NewReader(correct), nil)
	if login.Code != 200 {
		t.Fatal(login.Code)
	}
	c := login.Result().Cookies()[0]
	if !c.HttpOnly || c.SameSite != http.SameSiteStrictMode || c.Secure || c.MaxAge != 604800 {
		t.Fatal(c)
	}
	f.service.Now = func() time.Time { return time.Now().Add(8 * 24 * time.Hour) }
	if w := f.request("GET", "/auth/session", cookie, nil, nil); !strings.Contains(w.Body.String(), `"user":null`) {
		t.Fatal(w.Body.String())
	}
	f.service.Now = time.Now
	if w := f.request("POST", "/auth/logout", cookie, nil, nil); w.Code != 200 || w.Result().Cookies()[0].MaxAge != -1 {
		t.Fatal(w.Body.String())
	}
	if w := f.request("GET", "/images", cookie, nil, nil); w.Code != 401 {
		t.Fatal(w.Code)
	}
}
func TestSecureCookieAndLookupFailure(t *testing.T) {
	f := setup(t, "https://gallery.example")
	body, _ := json.Marshal(map[string]string{"email": "owner@example.test", "password": pass})
	w := f.request("POST", "/auth/register", "", bytes.NewReader(body), map[string]string{"Origin": "https://gallery.example"})
	if w.Code != 200 || !w.Result().Cookies()[0].Secure {
		t.Fatal(w.Code, w.Body.String())
	}
	f.store.Close()
	w = f.request("GET", "/auth/session", w.Result().Cookies()[0].String(), nil, nil)
	if w.Code != 500 || strings.Contains(w.Body.String(), `"user":null`) {
		t.Fatal(w.Code, w.Body.String())
	}
}
