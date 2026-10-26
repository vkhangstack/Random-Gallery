# Image fixtures

landscape.png (48×32) and portrait.jpg (32×48) were generated with ffmpeg color sources.
square.webp is a 1×1 solid-color WebP fixture. All fixtures contain only solid colors.
images.ts creates mixed batches and exact-size files by padding valid PNG data after its end;
browsers decode the original PNG while size validation measures the complete file.
Performance tests generate 100 entries in memory; no 200 MiB fixture bundle is committed.
