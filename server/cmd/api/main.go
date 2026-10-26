package main

import (
	"context"
	"log"
	"net/http"
	"net/url"
	"os"
	"os/signal"
	"path/filepath"
	"randomgallery/server/internal/adapters/httpapi"
	"randomgallery/server/internal/adapters/imagevalidation"
	"randomgallery/server/internal/adapters/password"
	"randomgallery/server/internal/adapters/sqlite"
	"randomgallery/server/internal/application"
	"syscall"
	"time"
)

func env(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
func main() {
	dir := env("DATA_DIR", "./data")
	origin := env("APP_ORIGIN", "http://127.0.0.1:8081")
	parsed, err := url.Parse(origin)
	if err != nil || parsed.Host == "" || (parsed.Scheme != "http" && parsed.Scheme != "https") || parsed.Path != "" || parsed.RawQuery != "" || parsed.Fragment != "" {
		log.Fatal("APP_ORIGIN must be an exact http(s) origin without a path")
	}
	if err = os.MkdirAll(dir, 0700); err != nil {
		log.Fatal("Cannot open data directory")
	}
	store, err := sqlite.Open(filepath.Join(dir, "gallery.sqlite"))
	if err != nil {
		log.Fatal("Cannot open private database")
	}
	defer store.Close()
	service := application.New(store, password.New(), imagevalidation.Validator{})
	server := &http.Server{Addr: ":" + env("PORT", "3000"), Handler: httpapi.New(service, origin), ReadHeaderTimeout: 5 * time.Second, ReadTimeout: 30 * time.Second, WriteTimeout: 60 * time.Second, IdleTimeout: 60 * time.Second, MaxHeaderBytes: 16384}
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	go func() {
		<-ctx.Done()
		shutdown, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		server.Shutdown(shutdown)
	}()
	log.Print("Gallery Go API listening")
	if err = server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatal("HTTP server failed")
	}
}
