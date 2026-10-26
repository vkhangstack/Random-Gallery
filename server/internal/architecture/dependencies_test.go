package architecture

import (
	"encoding/json"
	"io"
	"os/exec"
	"strings"
	"testing"
)

func TestDependenciesPointInward(t *testing.T) {
	cmd := exec.Command("go", "list", "-json", "../...")
	raw, err := cmd.Output()
	if err != nil {
		t.Fatal(err)
	}
	decoder := json.NewDecoder(strings.NewReader(string(raw)))
	for {
		var p struct {
			ImportPath string
			Imports    []string
		}
		if err = decoder.Decode(&p); err == io.EOF {
			break
		}
		if err != nil {
			t.Fatal(err)
		}
		core := strings.Contains(p.ImportPath, "/internal/domain") || strings.Contains(p.ImportPath, "/internal/application")
		for _, dep := range p.Imports {
			if core && (strings.Contains(dep, "/adapters/") || dep == "net/http" || dep == "database/sql" || strings.Contains(dep, "modernc.org")) {
				t.Fatalf("%s imports %s", p.ImportPath, dep)
			}
			if strings.Contains(p.ImportPath, "/domain") && strings.Contains(dep, "/application") {
				t.Fatal("domain imports application")
			}
			if strings.Contains(p.ImportPath, "/adapters/httpapi") && strings.Contains(dep, "/adapters/sqlite") {
				t.Fatal("HTTP imports SQLite")
			}
		}
	}
}
