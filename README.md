# Saturday 5K Pace Planner

Enter a 5K PB (or recent time), your age, the age-grading category, a target time and a course profile. You get:

1. **Age-graded %** for both your PB/recent time and your target, using the published 2025 road age-grade tables.
2. **Per-km target splits** for 5 km, adjusted for the course (flat, rolling, hilly or your own per-km elevation list) with a positive, even or negative split. Splits are whole seconds and add up **exactly** to your target; each row shows split (= pace per km), pace per mile and cumulative time.
3. A **shareable result card**: a downloadable PNG (drawn on a canvas) and copyable text.

Works for any 5K, including weekly timed runs. It runs entirely in your browser: no login, no analytics, no scraping, no network calls (the Vercel config sets a Content-Security-Policy with `connect-src 'none'`).

Part of **Sport Builds**, one vibe-coded sports app a week. Build notes and honest failure log: [docs/BUILD_LOG.md](docs/BUILD_LOG.md).

## Run it

No build step. It is plain HTML + ES modules.

```bash
npm start            # serves the folder on http://localhost:5173 (any static server works)
npm test             # unit tests (node, no dependencies)
```

## Age-grading source, licence and caveats

- **Data:** road running age-grade tables, **2025 edition**, by **Alan Jones** (with Tom Bernhard, who supplied the single-age bests). Approved on 10 Jan 2025 by the Masters Long Distance Running Council (MLDR) of USA Track & Field. They continue the WMA/USATF 2010, 2015 and 2020 road tables.
- **Where from:** <https://github.com/AlanLyttonJones/Age-Grade-Tables> (commit `4aac6737cb9f216c90a0a610355667cd3d921c61`). This app uses the plain-text 5 km file `2025 Files/AgeGrade.zip` > `AgeGrade.5k` (copied to `data/AgeGrade.5k`): open standard 12:49 (men) / 13:54 (women) and one factor per year of age 5 to 99.
- **Licence:** the repository is dedicated to the public domain under **CC0 1.0 Universal** (GitHub detects `cc0-1.0`; copy in `data/LICENSE-CC0-AgeGrade-Tables.md`). No permission is needed; attribution is given anyway.
- **Not official:** this app is not an official World Masters Athletics (WMA) or USATF product. As far as I could find, the World Masters Athletics documents page lists the 2010 road standards and the 2023 *combined-events* factors, but no 2025 5K road factor table, and the 2025 edition was approved by USATF's MLDR rather than WMA. The 2025 road tables come from the source above.
- **Formulas:** age standard = open standard / age factor; age grade % = age standard / time x 100; age-graded time = time x age factor.
- **Is anything approximated?** The age-grade numbers are the published table values, not an approximation. Ages 8 to 99 are accepted. Different table editions (2010, 2015, 2020, 2025) give different percentages for the same time, so a figure from another calculator may differ.
- **The course-profile model IS an approximation.** Terrain adjustment uses a documented rule of thumb: +3.3% time per 1% uphill grade, up to 1.8% faster per 1% downhill (benefit capped at 8%), applied per km from net elevation change. The flat/rolling/hilly presets are illustrative shapes (net metres per km: rolling 8, -8, 8, -8, 0; hilly 20, -10, 25, -20, -15). Positive/negative split styles tilt pace linearly across the 5 km (Subtle/Standard/Bold = about 2% / 4% / 6% difference between first and last km). These are planning heuristics, not measured physiology.

### Validation

`npm test` checks the age-grade code against:

- the published `AgeGrade.5k` file itself (all 190 factors);
- the separately published age-standard-in-seconds spreadsheet (agrees to within 1 s for ages 8 to 99);
- two published worked examples: a man aged 50 running 25:00 = **58.42%** (age standard 14:36, factor 0.8775, graded time 21:56) and a woman aged 50 running 25:00 = **64.71%** (age standard 16:11);
- published 5K age-standard times for men and women at ages 20 to 90 (26 values).

Those worked examples come from a third-party calculator that publishes its working from the same 2025 tables, so this confirms the implementation matches the tables as published, not an independent calculation of the tables. See the build log for details.

## Data and privacy

Only public data and invented example inputs are used (the sample 24:30 / 23:45 values are made up). Nothing you type leaves your browser. No STATSports, employer or other private material is used.

## Disclaimer

A planning aid, **not coaching or medical advice**. Paces are estimates; weather, course and fitness vary. Check with a qualified professional before changing your training, and stop if something feels wrong.

## Layout

```
index.html, style.css      mobile-first UI
src/agegrade.js            age factor / standard / percent
src/agegrade-data.js       GENERATED from data/AgeGrade.5k (tools/gen-data.mjs)
src/splits.js              time parsing, terrain + split model, exact-sum rounding
src/plan.js                input validation, plan assembly, share text
src/card.js                canvas result card + PNG download
src/app.js                 DOM wiring
test/run.mjs               unit tests
tools/                     data generator, headless browser check + screenshots
docs/                      BUILD_LOG.md, screenshots
```

Code: MIT. Age-grade data: CC0 1.0.
