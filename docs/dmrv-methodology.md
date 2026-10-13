# CIP dMRV monitoring demonstration — sources, logic and proposed operating model

**Version:** v0, updated 6 October 2026\
**Pilot:** Entooma Sidai, Narok County, Kenya  
**Delivery:** Local meeting demonstration. Public deployment is pending a separate decision.  
**Purpose:** Demonstrate monitoring, review and investor communication within the existing data room. This is not an operational monitoring service or an assurance opinion.

## 1. What this version contains

The existing project navigation now includes **Monitoring · DEMO** for the simulated CIP team and **Integrity & risk · DEMO** for simulated project viewers. **Sources & methodology** is available to both audiences. The original portfolio, evidence, financials, document index and geographic overview remain the entry points for project diligence.

Two explicitly separated modes use the same interface:

| Mode | Content | Interpretation |
| --- | --- | --- |
| Frozen source snapshot | The existing shapefile-derived perimeter, calculated surrounding ring, NASA POWER precipitation, extracted Sentinel-2 NDVI and NASA FIRMS VIIRS observations | Real source material with provisional geography and automatic, unreviewed climate, NDVI and FIRMS signals |
| Illustrative scenario | Synthetic detections, monthly values, visit concepts and response notes | Workflow examples only; no statements about actual project conditions |

The default is the source snapshot. Switching to the illustrative scenario changes every displayed example signal, including rainfall, and shows a persistent **DEMO · ILLUSTRATIVE SCENARIO** banner. The JSON for examples is separate from the source JSON. Review edits are held in browser memory and reset on reload; they never alter source files.

FIRMS has 12 complete months in both zones, with 1,251 automatic, unreviewed satellite observations. GFW remains **pending**, not zero. NDVI has 12 months extracted at 250 m, unreviewed, no baseline, for the provisional project perimeter and its 10 km outside-only ring. KoBoToolbox is not connected; field cards describe example checklists and do not claim visits or survey counts.

## 2. Dates, provenance and reproducibility

The snapshot preparation date is **2026-10-05**. The analysis window is the twelve complete calendar months before that date: **2025-10 through 2026-09**. Each source has its own retrieval date, coverage and review state. The snapshot date must never be presented as the date of the latest satellite observation.

The team source snapshot is `data/monitoring/entooma-sidai.json`. Before replacement, its exact bytes and SHA-256 are saved under `data/monitoring/staging/snapshot-backups/`. `data/monitoring/investor-source-readiness.json` and `illustrative-investor-readiness.json` contain only source metadata and explicitly released example responses; neither contains FIRMS/NDVI values, automatic points, event-file pointers or monthly arrays. Surrounding-ring files are content-addressed and the snapshot pointer is replaced atomically after acquisition succeeds. It records the boundary file and SHA-256, buffer method, selected climate point, request URL, raw-response hash, units, baseline period and per-month missing values. Source responses are retained locally under ignored `data/monitoring/raw/`; no raw response archive is included in an investor release. Retain those files separately for reproducibility before cleaning the working copy.

The implementation is based on the public repository `danicollante/cip-investor-data-room-review`. The source perimeter is unchanged. The missing original data-room build pipeline has not been reconstructed.

## 3. Spatial scope

The current GeoJSON comes from the existing data room's conversion of **entooma_sidai_target_area_03.13.2026**. This working copy contains the converted geometry, not the original `.shp/.shx/.dbf/.prj` bundle. The original conversion provenance is retained in the project record.

The file states **652,022 ha**, while CIP's confirmed project area is **500,000 ha**. These are different claims. No coordinate change or rescaling is made to force the polygon to match the confirmed area. Spatial results from this geometry are provisional and must be recomputed after an approved perimeter replaces it.

The surrounding zone is calculated as follows:

1. Union the valid source polygon features in WGS84. Invalid or empty geometry stops the preparation script; it is not silently repaired.
2. Project to a local **azimuthal equidistant** CRS centered on the polygon centroid.
3. Buffer outward by **10,000 meters**, using 32 segments per quadrant.
4. Subtract the project polygon, producing an outside-only ring, and transform it back to WGS84.

The ring is an operational screening aid. It is **not** an approved leakage area, a legal boundary or a replacement for a methodology-specific leakage assessment. The projection provides a practical local approximation; final operational use requires GIS review of distance and topology. Inside-perimeter classification takes precedence for points on the boundary. The shapefile discrepancy affects both inside and outside assignments.

The map uses local vector files and optional [OpenStreetMap tiles](https://www.openstreetmap.org/copyright). Tiles require internet access. Local polygons and real or illustrative markers remain visible if the tile service fails. A marker indicates a detection location, not an affected-area outline.

## 4. Source register and signal logic

### Fire — NASA FIRMS VIIRS

[NASA FIRMS API tutorial and availability guidance](https://firms.modaps.eosdis.nasa.gov/content/academy/data_api/firms_api_use.html) and [area API](https://firms.modaps.eosdis.nasa.gov/api/area/).

The extracted feed is NASA FIRMS VIIRS 375 m, covering **1 October 2025–30 September 2026** for S-NPP, NOAA-20 and NOAA-21. Retrieval completed **6 October 2026 UTC**. All 237 planned chunks were validated (234 new requests and three revalidated phase-1 samples). Every month requires all planned chunks for all three satellites; a complete zero is allowed, while any missing or failed chunk makes that month unavailable rather than zero. This integration performs no new provider request.

Processing allocation is explicit:

| Satellite | October 2025–June 2026 | July–September 2026 |
| --- | --- | --- |
| S-NPP | VIIRS_SNPP_SP | VIIRS_SNPP_NRT |
| NOAA-20 | VIIRS_NOAA20_SP | VIIRS_NOAA20_NRT |
| NOAA-21 | VIIRS_NOAA21_NRT | VIIRS_NOAA21_NRT |

SP ends on 30 June and NRT begins on 1 July for each transitioning satellite, with no date gap or overlap. NOAA-21 uses NRT throughout, so the earlier months still combine SP and NRT **across different satellites**, as documented. Exact duplicates use satellite, instrument, UTC date, UTC acquisition time and coordinates; different satellites and passes remain separate observations. No filter by provider **type** or **confidence** was applied. SP type values and NRT absence of type remain in point provenance. Provider confidence is distinct from CIP review.

The primary chart is **distinct cell-days per month and zone**. Transform each observation point from WGS84 to **EPSG:32736**, using longitude/latitude axis order. The existing analysis grid has origin `(0,0)`, cell size **375 m**, column `floor(easting/375)` and row `floor(northing/375)`. Count each `(cell column, cell row, UTC date)` once per zone, across satellites and passes; different days count separately. `days_with_detection` counts distinct UTC dates. Point-in-polygon assignment uses the perimeter first and then the outside-only ring. This is an analysis convention, not a native VIIRS pixel identity or footprint.

Density uses the areas recorded in this snapshot:

```
zone_area_km2 = boundary.area_ha / 100                 # project
zone_area_km2 = boundary.buffer_area_ha / 100          # outside-only ring
cell_days_per_1000_km2 = distinct_cell_days * 1000 / zone_area_km2
```

The denominators are **6,520.22 km²** for the provisional perimeter (`652,022 ha`) and **5,799.548 km²** for the ring (`579,954.8 ha`). Both areas are provisional. Density is a normalized count, not burned area; never multiply cell-days by cell area to estimate burned hectares.

`entooma-sidai.json` contains 24 monthly zone aggregates, completeness and provenance, without point events. `data/monitoring/entooma-sidai-fire-events.json` contains the 1,251 validated point observations and their raw-row/request/response lineage. The team requests this file only when entering **Monitoring**, not on the methodology page or in any investor view. The browser verifies its SHA-256 and matching period, geometry hashes and source-results hash before using it. Month and zone filters apply to chart, table and map; All 12 months uses small semitransparent markers. Popups show acquisition date/time UTC, satellite, SP/NRT product and provider confidence. Real-event review controls are disabled. The original illustrative data and its in-memory review queue are unchanged.

Before integration the importer rechecks all chunk hashes and daily coverage, point locations/identities/lineage, and monthly metrics against raw evidence. Retention requires matching periods and **both** project and ring hashes. Otherwise fire returns to pending and its point file is not loaded. Snapshot bytes are backed up with SHA-256 and replaced atomically; point files are also replaced atomically and their hash is recorded in the snapshot. Invalid evidence aborts before replacing the snapshot. Only the fire branch changed during this integration; NDVI and rainfall were retained exactly.

**Satellite detections, not unique fires, burned area or risk. Rangeland burning can be pastoral or managed; detections are signals for review.**

**Current state:** 12 months extracted in both zones, automatic, not reviewed; no actual fire-risk conclusion. Investor source readiness is **“extracted, automatic, not reviewed”**, with no automatic chart, numeric table or points.

### Vegetation disturbance — GFW / Global Nature Watch

[Official integrated disturbance alerts description](https://globalnaturewatch.org/blog/data-and-tools/integrated-deforestation-alerts/).

The current integrated layer combines GLAD-L, GLAD-S2, RADD and DIST-ALERT. DIST-ALERT extends coverage beyond forests, relevant to rangelands. Source confidence indicates satellite evidence, not a human-confirmed impact. Coverage and contributing systems vary spatially.

The planned extraction must retain the dataset version, spatial mask, date convention and confidence class. The integrated layer handles repeat disturbances with a 180-day event rule; its displayed dates cannot simply be treated as an immutable full history. Preserve versioned extracts for longitudinal monitoring.

Monthly totals, when implemented, will describe **alert footprint hectares**, not certified forest loss or carbon loss. Intersect pixel footprints with each zone in a documented projected or geodesic area method and avoid double counting overlapping systems. A point export alone is insufficient for hectare totals. v0 does not implement this raster extraction.

**Current state:** versioned, clipped extraction pending; no actual disturbance areas are displayed.

### Rainfall — NASA POWER

[NASA POWER monthly API documentation](https://power.larc.nasa.gov/docs/services/api/temporal/monthly/).

The public request uses **PRECTOTCORR**, with source units checked as **mm/day**. Values are grid-based precipitation context at a single point chosen from the provisional polygon centroid. They are not a polygon-weighted rainfall estimate or a field measurement.

The calculation is:

```
monthly_total_mm = monthly_mean_mm_per_day × actual_calendar_days_in_month
seasonal_baseline_mm = mean(same-calendar-month totals for 1991–2020)
anomaly_pct = 100 × (monthly_total_mm − seasonal_baseline_mm) / seasonal_baseline_mm
```

Leap-year February uses 29 days. A source fill value, missing value or negative value becomes `null`. Every baseline month requires all 30 historical years; otherwise acquisition fails. No interpolation is performed. Percentage anomaly is unavailable if the baseline is zero.

**Current state:** 11 of 12 months are available. September 2026 is unavailable in the retrieved response. Climate is marked **partial** and automatic. A rainfall anomaly alone is not a drought classification or an investor risk rating.

### Vegetation vigor — Sentinel-2

[Copernicus Sentinel-2 documentation](https://documentation.dataspace.copernicus.eu/Data/SentinelMissions/Sentinel2.html).

**Current state:** **12 months extracted at 250 m, unreviewed, no baseline**. Observation window: **October 2025–September 2026**. Retrieved **2026-10-05**. There are 24 separate month/zone rows for `project` and `ring_10km`; these are automatic observations, not reviewed findings.

The source is **Copernicus Sentinel-2 L2A**. NDVI = `(B08 − B04) / (B08 + B04)` using harmonized surface reflectance. The exact evalscript is retained in `data/monitoring/staging/ndvi-phase2/ndvi-monthly.evalscript.js`. Mosaicking is **ORBIT**, with `leastRecent` overlap ordering. For each 250 m grid pixel, valid NDVI observations during the UTC month are reduced to their **temporal median**; an even sample count uses the average of the two middle values. Spatial median, mean, P25 and P75 are then calculated separately for each zone. This is not a last-valid-pixel composite.

Samples require input `dataMask=1`. SCL classes 0, 1, 3, 8, 9, 10 and 11 are excluded (no data, saturated/defective, shadow, clouds, cirrus and snow/ice), as are non-positive denominators or non-finite NDVI. SCL 7 remains eligible, an explicit quality assumption. Negative NDVI and water pixels are retained. ORBIT can group observations by day; independent-acquisition completeness is not claimed. Nearest-neighbour downsampling on EPSG:32736 grids is explicit: a 250 m sample does not average every native 10 m pixel within that cell.

Valid coverage is `100 × (sampleCount − noDataCount) / geometryPixelCount`. It means at least one usable observation per AOI grid pixel during the month. The **30% coverage threshold is an initial unvalidated assumption**. Below it, all NDVI statistics remain null with reason `cobertura insuficiente`, while the valid percentage is retained. Missing geometry counts cause null values with reason `cobertura no verificable`. No interpolation or seasonal baseline is added.

**NDVI measures vegetation vigor; it does not establish biomass, carbon or grazing compliance. No seasonal baseline yet; read alongside rainfall.**

The team card shows monthly medians with visible Y-axis values, zone and month filters, and an expandable table containing median, P25/P75 and valid coverage. It is labeled **Automatic · unreviewed**, with source and retrieval date. The illustrative mode uses separate invented NDVI values and an **Example values** label; it never falls back to real NDVI if an example is missing. Investor profiles load a metadata-only readiness projection, never either real or illustrative NDVI time series, and show **extracted, automatic, not reviewed** without a risk rating.

The snapshot importer checks 24 unique month/zone pairs, the complete period, both geometry-file hashes, resolution, evalscript lineage, coverage and nullable statistics. The imported results-file SHA-256 and per-row payload, raw-response, geometry and evalscript hashes are retained. Retention requires the same period and provisional perimeter hash; NDVI also requires the same ring hash. Changed geometry or period resets incompatible evidence to pending.

### Field evidence — KoBoToolbox

[KoBoToolbox API guidance](https://support.kobotoolbox.org/api.html).

Future observations should carry project and visit IDs, observation and submission dates, consent status, permitted location detail, evidence references and reviewer. Restrict personal data and sensitive locations. Changes to a submitted form require reconciliation with the review record. Provider API availability does not establish that project surveys are reusable.

**Current state:** example checklist cards only; no API connection, actual visits, photos or personal information.

## 5. Review, risk and investor inclusion

Review states are **New**, **Confirmed**, **False positive** and **In follow-up**. These are workflow states, not certification states.

In the illustrative scenario, a reviewed state requires an explanatory note. Investor inclusion is a separate explicit checkbox. An investor response appears only when all of the following are present:

- A reviewed state other than `new`.
- A non-empty interpretation/response note.
- Reviewer and review date.
- Explicit `published: true`, meaning included in this **local demo**, not published online.

Changing a record back to New removes the reviewed identity and excludes it from the investor presentation. Confirmation does not automatically release a record. Reloading restores the predefined synthetic scenario. The two sample responses shipped with the scenario are clearly fictional; their reviewer is “CIP reviewer (simulated)”.

The investor view shows reviewed responses and source readiness, not raw automatic alert tables or NDVI curves. Switching profiles replaces the loaded source objects with audience-specific files; investor navigation does not request the team snapshot, real FIRMS point file or illustrative NDVI series. This is a payload separation in the local demo, not server-side access control. **No category-level traffic-light thresholds are approved**, so actual categories remain **Not assessed**. A reviewed false positive for one detection cannot establish overall low risk. A risk conclusion would need adequate source coverage, approved criteria, context and an accountable reviewer. The provisional boundary is itself an unresolved limitation.

Role changes reproduce an audience experience only. A static site cannot protect hidden JSON, notes or raw datasets with client-side filtering. Production must enforce permissions on the server and generate a sanitized investor artifact. This local demonstration does not establish authentication or authorization.

## 6. Proposed refresh cadence

These are planning assumptions, not active schedules or service guarantees. Revisit them after source coverage, project workload and ownership are validated.

| Component | Proposed acquisition | Human action | Investor update |
| --- | --- | --- | --- |
| FIRMS | Daily, with overlap and duplicate checks | Prompt triage for material signals; weekly queue reconciliation | After review and release approval; meaningful change only |
| Integrated disturbance alerts | Weekly, subject to upstream availability | Weekly review, with field follow-up as needed | Reviewed summary, with dated source coverage |
| Rainfall | Monthly after upstream publication | Check completeness and seasonal context | Monthly or quarterly reviewed narrative |
| Sentinel-2 NDVI | Monthly composite | Check cloud coverage and ecological plausibility | Only after adequate coverage and interpretation |
| Field submissions | After each visit; weekly reconciliation | Consent, location and evidence review | Selected approved evidence |
| Land-cover context | Annual, versioned | Compare coverage and methodology | Annual context update |
| Project perimeter | On approved revision | GIS and project-owner approval; re-run spatial results | Explicit version-change note |

The original scope suggested S3 and less than 1 GB/year for the portfolio. Storage volume is **not validated**: raster composites, photos, retained versions and raw extracts can dominate costs. Estimate storage after the artifact-retention policy and project count are agreed.

## 7. Tentative operational flow

**Acquire → preserve raw evidence → validate → spatially intersect → queue → human review → approve release → publish a version.**

1. **Acquisition:** request documented periods and datasets using secrets in a restricted runtime; record retrieval time, source versions and a content hash. Do not put keys in static JSON or browser code.
2. **Validation:** check geometry, source coverage, time ranges, units, missing data and duplicates. Fail without overwriting the last accepted snapshot. Detect changed upstream observations on later runs.
3. **Processing:** intersect with an approved boundary version; separate inside and surrounding zones; preserve automatic status and provider confidence.
4. **Review:** assign an accountable reviewer; record evidence, interpretation, uncertainty, action and timestamps in restricted storage. Escalate material findings according to agreed criteria.
5. **Release approval:** approve a summary for a defined audience. Consent and sensitivity checks apply to field evidence and exact locations. Review completion and release approval are distinct decisions.
6. **Publication:** create an immutable sanitized investor version and annex, with last-review and source-coverage dates. Preserve an internal audit trail and a rollback path. Refresh a frozen public artifact only after approval.
7. **Exceptions:** missed extraction or review leaves the prior released version intact and marks freshness/coverage explicitly. Retractions or corrections need versioned explanations.

Suggested roles are **source operator**, **project reviewer**, **GIS approver** and **investor-release approver**. CIP has not assigned those roles in this demo. Weekly review effort depends on actual alert volume; the scope's estimate of approximately 15 minutes is not a validated commitment.

## 8. Local run and refresh

No application build or backend is required. From the repository directory:

```sh
python3 -m http.server 8765 --bind 127.0.0.1
```

Open `http://127.0.0.1:8765/#/project/entooma-sidai/monitoring`. Use **Preview as** to switch between CIP team and an investor profile. The local server must remain running while the demo is shown.

For spatial and source preparation:

```sh
python3 -m venv .venv
.venv/bin/python -m pip install -r scripts/requirements-dmrv.txt
.venv/bin/python scripts/prepare_dmrv_snapshot.py --snapshot-date 2026-10-05 --power
```

`--power` makes one public NASA request. Omitting it rebuilds geography and retains previously extracted climate data when the period and perimeter match, and fire/NDVI when the period and both perimeter/ring hashes match. A changed period or geometry requires fresh extraction; automatic resetting to pending prevents reuse of incompatible evidence.

To integrate the validated staged FIRMS extraction, without network requests:

```sh
.venv/bin/python -B scripts/prepare_dmrv_snapshot.py \
  --snapshot-date 2026-10-05 \
  --firms-results data/monitoring/staging/firms-phase2/monthly-results.json
```

Keep the sibling `observations.json`, `provenance.json` and `run.json`, and the ignored raw CSVs, for offline evidence validation. Authentication URLs are never copied into the snapshot or event file. Original request hashes refer to URLs with the MAP_KEY replaced by `<MAP_KEY>`; source URLs point only to public NASA documentation. The legacy CSV helper has manually attested coverage; it is not the evidence used in this integration.

GFW raster processing and KoBo synchronization remain unimplemented. Sentinel-2 composites have been extracted separately and are imported without remote requests using:

```sh
.venv/bin/python scripts/prepare_dmrv_snapshot.py \
  --snapshot-date 2026-10-05 \
  --ndvi-results data/monitoring/staging/ndvi-phase2/monthly-results.json
```

The flag validates source results, retains compatible fire/climate evidence, creates an exact prior-snapshot backup with SHA-256, generates metadata-only investor projections, and atomically replaces the snapshot. An invalid schema aborts without replacing the prior snapshot; incompatible period or geometry leaves NDVI pending. Refresh the illustrative scenario separately if the demo period changes; examples do not follow source updates.

The printable annex is a dated, manually curated artifact. Reconcile its coverage statement and date after any source refresh; printing it does not approve publication. Review it in the investor audience before release.

## 9. Decisions before operating or publishing

- Approved final perimeter and the owner of GIS changes.
- Actual FIRMS/GFW acquisition access and spatial coverage checks.
- Review and materiality thresholds appropriate to this rangeland project.
- Reviewer, release approver, cadence and escalation responsibilities.
- Field-data availability, consent and permitted investor location detail.
- Restricted hosting and server-side authorization; sanitized public artifact policy.
- Whether an open-data operating model is sufficient, or selected projects need a commercial monitoring provider.

Open monitoring complements formal project documentation and verification. It does not replace Verra/VVB verification, determine issued credits, or certify permanence or project performance.
