# NAIP National Dashboard

A visualization layer over real, already-generated data from the NAIP project's
Weeks 1-4 (national hazard detection, water accounting, crop intelligence, locust
risk, exposure-risk fusion, and the insurance trigger-contract engine). No new
modeling happens in this repo -- every view reads real JSON/CSV output already
produced and reported in the project's status reports (`naip/docs/STATUS_WEEK*.md`,
`naip/docs/FINAL_REPORT.md`).

This is a **separate repository** from the original `MSG-SEVIRI-Product-Dashboard`
(the 12-city pilot hazard dashboard), which is untouched by this project.

## Views

| Route | What it shows |
|---|---|
| `/hazards` | 126-district hazard alert feed (Week 1) as a choropleth |
| `/water-stress` | Muridke Distributary head-to-tail stress gradient, SRTM-elevation-verified (Week 2) |
| `/locust` | 3-region breeding-risk screen; Cholistan's proxy boundary shown on the map itself (Week 3) |
| `/crop-classifier` | Irrigated-vs-not classifier, honest accuracy-vs-baseline comparison (Week 2) |
| `/exposure-risk` | Hazard x crop-calendar fusion, raw vs. plausibility-filtered (Week 3/4) |
| `/trigger-engine` | Real, audited insurance trigger-contract events, basis risk stated per record (Week 4) |
| `/demo-walkthrough` | The real Layyah/2026-07-06 end-to-end demo scenario |

## Data

Real source files are pulled from the main `naip/` project directory via
`prepare_data.py` into `public/data/`. Re-run it after regenerating any upstream
output:

```bash
python prepare_data.py
```

## Development

```bash
npm install
npm run dev
```

## Deployment

Static export via GitHub Actions to GitHub Pages on push to `main`
(`.github/workflows/deploy.yml`), same pattern as the existing MSG-SEVIRI dashboard.
