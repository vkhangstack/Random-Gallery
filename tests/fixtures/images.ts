import { readFileSync } from "node:fs";
export const png = readFileSync(new URL("./landscape.png", import.meta.url));
export const jpeg = readFileSync(new URL("./portrait.jpg", import.meta.url));
export const webp = readFileSync(new URL("./square.webp", import.meta.url));
export const upload = (
  name = "landscape.png",
  buffer = png,
  mimeType = "image/png",
) => ({ name, buffer, mimeType });
export const batch = () =>
  Array.from({ length: 12 }, (_, i) =>
    i % 3 === 0
      ? upload(`image-${i}.png`)
      : i % 3 === 1
        ? upload(`image-${i}.jpg`, jpeg, "image/jpeg")
        : upload(`image-${i}.webp`, webp, "image/webp"),
  );
export function paddedPng(size: number) {
  return Buffer.concat([png, Buffer.alloc(size - png.length)]);
}
