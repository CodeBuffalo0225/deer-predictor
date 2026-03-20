# Customization Guide

All user preferences are stored in `server/data/settings.json`. You can edit this file directly
or use the Settings UI in the app (recommended).

## Settings Reference

### App Settings (`app`)
| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `name` | string | "Deer Predictor" | App name shown in header |
| `ownerName` | string | "" | Your name, shown on reports |
| `pin` | string | "" | Optional PIN lock |
| `theme` | string | "dark-tactical" | UI theme: dark-tactical, dark-natural, light-field |
| `units` | string | "imperial" | imperial (F, inHg) or metric (C, hPa) |

### Scoring (`scoring`)
| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `system` | string | "boone-crockett" | boone-crockett, pope-young, custom, off |
| `minimumToLog` | number | 100 | Minimum score to display |
| `customScoreLabel` | string | "Gross B&C" | Label when system is "custom" |

### Rut Dates (`rut`)
| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `overrideRegionalDates` | boolean | false | Use custom dates instead of regional lookup |
| `seekingStart` | string | "10-28" | MM-DD format |
| `chasingStart` | string | "11-03" | MM-DD format |
| `peakRutDate` | string | "11-08" | MM-DD format |
| `lockdownStart` | string | "11-12" | MM-DD format |
| `postRutStart` | string | "11-20" | MM-DD format |

When override is enabled, all rut phase calculations across the entire app use your custom dates.

### Notifications (`notifications`)
| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `frontAlerts` | boolean | true | Cold front movement alerts |
| `weeklyBriefing` | boolean | true | Auto-generated Monday briefing |
| `briefingDay` | string | "monday" | Day of week for briefings |
| `briefingTime` | string | "06:00" | Time for briefing generation |
| `newCamHitAlert` | boolean | false | Alert on new deer detections |

### Reports (`reporting`)
| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `defaultPredictionDays` | number | 7 | Default prediction window |
| `defaultModel` | string | "opus" | opus or sonnet |
| `streamingEnabled` | boolean | true | Stream report text in real time |
| `autoSaveReports` | boolean | true | Auto-save generated reports |
| `pdfColorAccent` | string | "#FF6B00" | Report accent color |
| `pdfShowPoweredBy` | boolean | true | Show branding in footer |
| `headerText` | string | "" | Custom report header |
| `footerText` | string | "" | Custom report footer |

### Map (`map`)
| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `defaultZoom` | number | 16 | Default map zoom level |
| `showSanctuaryZones` | boolean | true | Show sanctuary overlays |
| `markerScale` | number | 1.0 | Global marker size multiplier |
| `heatmapOpacity` | number | 0.65 | Activity heatmap opacity |

### Food Sources (`foodSources.calendar`)
Monthly food availability by type. Each month (09-12) has:
- `whiteOak`: none, early, good, cold
- `redOak`: none, early, good, cold
- `corn`: none, standing, harvested
- `beans`: none, standing, harvested
- `foodPlot`: boolean

This data is injected into every prediction report and weekly briefing.

### Markers (`markers`)
Per marker type customization:
- `color`: hex color string
- `icon`: icon name
- `size`: multiplier (0.5 - 2.0)
- `visible`: boolean

Available marker types: TRAIL_CAM, STAND, BLIND, SCRAPE, RUB, FOOD_PLOT, WATER_SOURCE,
BED, TRAVEL_CORRIDOR, PINCH_POINT, FENCE_CROSSING, RIDGE, SADDLE, CREEK, MINERAL_LICK,
ENTRY_ROUTE, EXIT_ROUTE, SANCTUARY, NEIGHBOR_BOUNDARY, OTHER
