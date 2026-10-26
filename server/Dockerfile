FROM golang:1.26-alpine AS build
WORKDIR /src
COPY server/go.mod server/go.sum ./
RUN go mod download
COPY server/ ./
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /gallery-api ./cmd/api

FROM alpine:3.23
RUN addgroup -S gallery && adduser -S -G gallery gallery && mkdir /data && chown gallery:gallery /data
COPY --from=build /gallery-api /usr/local/bin/gallery-api
ENV DATA_DIR=/data PORT=3000
USER gallery
EXPOSE 3000
HEALTHCHECK --interval=5s --timeout=3s --start-period=5s --retries=12 \
  CMD wget -q -O /dev/null http://127.0.0.1:3000/api/health || exit 1
CMD ["gallery-api"]
