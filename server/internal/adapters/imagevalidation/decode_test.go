package imagevalidation

import (
	"context"
	"os"
	"testing"
)

func TestSupportedAndCorruptImages(t *testing.T) {
	for _, name := range []string{"landscape.png", "portrait.jpg", "square.webp"} {
		b, err := os.ReadFile("../../../../tests/fixtures/" + name)
		if err != nil {
			t.Fatal(err)
		}
		if _, err = (Validator{}).Validate(context.Background(), b); err != nil {
			t.Fatal(name, err)
		}
	}
	for _, b := range [][]byte{nil, []byte("corrupt"), []byte("<svg></svg>"), make([]byte, 10*1024*1024+1)} {
		if _, err := (Validator{}).Validate(context.Background(), b); err == nil {
			t.Fatal("accepted invalid image")
		}
	}
}
