# Trail Camera Format Support

Deer Predictor auto-parses date/time from trail camera filenames and EXIF data.

## Supported Filename Patterns

### Reconyx
```
RCNX0001_20231015_063012.JPG
```
Format: `RCNX{seq}_{YYYYMMDD}_{HHMMSS}`

### Browning
```
BTC-2023-10-15_06-30-12.JPG
```
Format: `BTC-{YYYY}-{MM}-{DD}_{HH}-{MM}-{SS}`

### Generic Date Pattern
```
IMG_20231015_063012.jpg
2023-10-15_06-30-12.jpg
```
Format: `{YYYYMMDD}_{HHMMSS}` or `{YYYY}-{MM}-{DD}_{HH}-{MM}-{SS}`

## EXIF Extraction

For cameras that embed EXIF data, the app reads:
- **DateTimeOriginal** — capture timestamp
- **GPSLatitude / GPSLongitude** — location (if available)
- **Make / Model** — camera identification

## Priority Order

1. EXIF DateTimeOriginal (most reliable)
2. Filename pattern parsing
3. File modification date (fallback)

## Bulk Import

When using Historical Bulk Import, organize photos by year:

```
/trail-cam-archive/
├── 2021/
│   ├── east-ridge-cam/
│   └── food-plot-cam/
├── 2022/
│   └── ...
└── 2023/
    └── ...
```

The app will:
1. Auto-create seasons for each year folder
2. Parse dates from filenames and EXIF
3. Backfill weather data for each photo
4. Queue all photos for AI analysis
5. Generate embeddings for the vector store

## Tips

- Use the original camera filenames when possible
- If renaming, keep the date/time in the filename
- JPG and PNG formats are supported
- Maximum recommended batch: 500 photos per upload
