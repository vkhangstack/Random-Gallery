package httpapi

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"randomgallery/server/internal/domain"
	"strconv"
	"strings"
)

func metadataDTO(m domain.Metadata) map[string]any {
	return map[string]any{"id": m.ID, "name": m.Name, "mimeType": m.MimeType, "size": m.Size, "addedAt": m.AddedAt, "batchId": m.BatchID, "ordinal": m.Ordinal, "favorite": m.Favorite}
}
func (a *API) images(w http.ResponseWriter, r *http.Request) bool {
	path := r.URL.Path
	expected := r.Header.Get("X-Gallery-Account")
	if path == "/api/images" && r.Method == "GET" {
		images, err := a.service.ListImages(r.Context(), token(r), expected)
		if err != nil {
			problem(w, err)
			return true
		}
		result := make([]map[string]any, 0, len(images))
		for _, m := range images {
			result = append(result, metadataDTO(m))
		}
		respond(w, 200, result)
		return true
	}
	if path == "/api/images" && r.Method == "POST" {
		select {
		case a.uploads <- struct{}{}:
			defer func() { <-a.uploads }()
		default:
			problem(w, domain.ErrOverload)
			return true
		}
		r.Body = http.MaxBytesReader(w, r.Body, domain.MaxImageSize+65536)
		if err := r.ParseMultipartForm(domain.MaxImageSize + 65536); err != nil {
			var limit *http.MaxBytesError
			if errors.As(err, &limit) {
				respond(w, 413, map[string]string{"error": "Upload exceeds the request limit."})
			} else {
				problem(w, domain.ErrInvalid)
			}
			return true
		}
		defer r.MultipartForm.RemoveAll()
		var input struct {
			ID       string `json:"id"`
			Name     string `json:"name"`
			BatchID  string `json:"batchId"`
			AddedAt  *int64 `json:"addedAt"`
			Ordinal  *int64 `json:"ordinal"`
			Favorite *bool  `json:"favorite"`
		}
		if err := json.Unmarshal([]byte(r.FormValue("metadata")), &input); err != nil || input.AddedAt == nil || input.Ordinal == nil || input.Favorite == nil {
			problem(w, domain.ErrInvalid)
			return true
		}
		file, _, err := r.FormFile("file")
		if err != nil {
			problem(w, domain.ErrInvalid)
			return true
		}
		defer file.Close()
		content, err := io.ReadAll(io.LimitReader(file, domain.MaxImageSize+1))
		if err != nil {
			problem(w, err)
			return true
		}
		m := domain.Metadata{ID: input.ID, Name: input.Name, BatchID: input.BatchID, AddedAt: *input.AddedAt, Ordinal: *input.Ordinal, Favorite: *input.Favorite}
		saved, err := a.service.Upload(r.Context(), token(r), expected, m, content)
		if err != nil {
			problem(w, err)
		} else {
			respond(w, 201, metadataDTO(saved))
		}
		return true
	}
	if strings.HasPrefix(path, "/api/images/") {
		suffix := strings.TrimPrefix(path, "/api/images/")
		if domain.ValidID(suffix) && r.Method == "PATCH" {
			var body struct {
				Favorite *bool `json:"favorite"`
			}
			if err := parseJSON(w, r, &body); err != nil || body.Favorite == nil {
				problem(w, domain.ErrInvalid)
				return true
			}
			saved, err := a.service.SetFavorite(r.Context(), token(r), expected, suffix, *body.Favorite)
			if err != nil {
				problem(w, err)
			} else {
				respond(w, 200, metadataDTO(saved))
			}
			return true
		}
		if domain.ValidID(suffix) && r.Method == "DELETE" {
			if err := a.service.DeleteImage(r.Context(), token(r), expected, suffix); err != nil {
				problem(w, err)
			} else {
				respond(w, 200, map[string]bool{"ok": true})
			}
			return true
		}

		if strings.HasSuffix(suffix, "/content") && r.Method == "GET" {
			id := strings.TrimSuffix(suffix, "/content")
			image, err := a.service.ReadImage(r.Context(), token(r), expected, id)
			if err != nil {
				problem(w, err)
				return true
			}
			w.Header().Set("Content-Type", image.MimeType)
			w.Header().Set("Content-Length", strconv.Itoa(len(image.Content)))
			w.Header().Set("Cache-Control", "private, no-store")
			w.WriteHeader(200)
			w.Write(image.Content)
			return true
		}
	}
	return false
}
