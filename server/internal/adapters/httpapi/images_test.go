package httpapi_test

import (
	"bytes"
	"encoding/json"
	"fmt"
	"mime/multipart"
	"net/http/httptest"
	"os"
	"randomgallery/server/internal/application"
	"testing"
)

func (f *fixture) upload(t *testing.T, cookie, name string, content []byte, overrides map[string]any) (*httptest.ResponseRecorder, string) {
	t.Helper()
	id := application.NewID()
	m := map[string]any{"id": id, "name": name, "batchId": application.NewID(), "addedAt": int64(1700000000000), "ordinal": 0, "favorite": false}
	for k, v := range overrides {
		m[k] = v
	}
	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	raw, _ := json.Marshal(m)
	writer.WriteField("metadata", string(raw))
	file, _ := writer.CreateFormFile("file", name)
	file.Write(content)
	writer.Close()
	return f.request("POST", "/images", cookie, &body, map[string]string{"Content-Type": writer.FormDataContentType()}), id
}
func TestPrivateUploadListContentAndValidation(t *testing.T) {
	f := setup(t, origin)
	owner, _ := f.register(t)
	other, _ := f.register(t)
	for _, name := range []string{"landscape.png", "portrait.jpg", "square.webp"} {
		content, err := os.ReadFile("../../../../tests/fixtures/" + name)
		if err != nil {
			t.Fatal(err)
		}
		w, id := f.upload(t, owner, name, content, map[string]any{"user_id": "forged"})
		if w.Code != 201 {
			t.Fatal(w.Code, w.Body.String())
		}
		w = f.request("GET", "/images/"+id+"/content", owner, nil, nil)
		if w.Code != 200 || !bytes.Equal(w.Body.Bytes(), content) || w.Header().Get("Cache-Control") != "private, no-store" {
			t.Fatal("content mismatch", w.Code)
		}
		if w = f.request("GET", "/images/"+id+"/content", other, nil, nil); w.Code != 404 {
			t.Fatal(w.Code)
		}
		if w = f.request("GET", "/images/"+id+"/content", "", nil, nil); w.Code != 401 {
			t.Fatal(w.Code)
		}
	}
	if w := f.request("GET", "/images", other, nil, nil); w.Code != 200 || w.Body.String() != "[]\n" {
		t.Fatal(w.Code, w.Body.String())
	}
	for _, content := range [][]byte{nil, []byte("bad"), []byte("<svg/>"), make([]byte, 10*1024*1024+1)} {
		w, _ := f.upload(t, owner, "bad.png", content, nil)
		if w.Code != 400 {
			t.Fatal(w.Code)
		}
	}
	png, _ := os.ReadFile("../../../../tests/fixtures/landscape.png")
	for _, m := range []map[string]any{{"favorite": "yes"}, {"ordinal": 1.5}, {"addedAt": 9007199254740992}, {"name": ""}, {"id": "../escape"}} {
		w, _ := f.upload(t, owner, "bad.png", png, m)
		if w.Code != 400 {
			t.Fatal(m, w.Code)
		}
	}
	w, id := f.upload(t, owner, "duplicate.png", png, nil)
	if w.Code != 201 {
		t.Fatal(w.Code)
	}
	w, _ = f.upload(t, owner, "duplicate.png", png, map[string]any{"id": id})
	if w.Code != 409 {
		t.Fatal(w.Code)
	}
	if w = f.request("GET", "/images", owner, nil, map[string]string{"X-Gallery-Account": "wrong-owner"}); w.Code != 401 {
		t.Fatal(w.Code)
	}
	_ = fmt.Sprint(w)
}
func TestMutationOwnershipAndState(t *testing.T) {
	f := setup(t, origin)
	owner, _ := f.register(t)
	other, _ := f.register(t)
	png, _ := os.ReadFile("../../../../tests/fixtures/landscape.png")
	w, id := f.upload(t, owner, "private.png", png, nil)
	if w.Code != 201 {
		t.Fatal(w.Code)
	}
	path := "/images/" + id
	for _, cookie := range []string{"", other} {
		expected := 404
		if cookie == "" {
			expected = 401
		}
		for _, method := range []string{"PATCH", "DELETE", "PUT"} {
			w = f.request(method, path, cookie, bytes.NewBufferString(`{"favorite":true,"user_id":"forged"}`), nil)
			if w.Code != expected {
				t.Fatal(method, w.Code, w.Body.String())
			}
		}
	}
	for _, body := range []string{`{}`, `null`, `{"favorite":"true"}`, `{"favorite":null}`} {
		w = f.request("PATCH", path, owner, bytes.NewBufferString(body), nil)
		if w.Code != 400 {
			t.Fatal(body, w.Code)
		}
	}
	w = f.request("PATCH", path, owner, bytes.NewBufferString(`{"favorite":true}`), nil)
	if w.Code != 200 || !bytes.Contains(w.Body.Bytes(), []byte(`"favorite":true`)) {
		t.Fatal(w.Code, w.Body.String())
	}
	w = f.request("GET", path+"/content", owner, nil, nil)
	if !bytes.Equal(w.Body.Bytes(), png) {
		t.Fatal("content changed")
	}
	w = f.request("DELETE", path, owner, nil, nil)
	if w.Code != 200 {
		t.Fatal(w.Code)
	}
	if w = f.request("GET", path+"/content", owner, nil, nil); w.Code != 404 {
		t.Fatal("deleted bytes still readable")
	}
}
