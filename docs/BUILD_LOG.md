# Build log: Saturday 5K Pace Planner

Raw notes for the Sport Builds newsletter issue. Written as the build happened, failures included.
Times are Europe/London (GMT, UTC+0) on Mon 26 Oct 2026.

## Stage 0: brief and kickoff
- **Start: 08:22** (clock on the build box).
- Instruction given to the build agent (summarised from the Editor-approved brief): build "Saturday 5K Pace Planner" from user-entered PB/recent time, age, category, target time and course profile. Output: WMA-style age-grade %, per-km target splits that sum exactly to the target, shareable PNG card plus copyable text. No scraping, no external calls, no analytics, no login. Cite and licence-check the age-grading source. If no usable 5K table exists, label an approximation and do not invent numbers. Validate against published examples. Keep this log honest. Use only the neutral wording "works for any 5K, including weekly timed runs"; no brand names or logos of any weekly-run organisation.
- Environment check: Node 20, `gh` already logged in as `norris1976`, Vercel CLI present, Python 3 but no Playwright installed (noted for later).

## Stage 1: age-grading source and licence research (08:22 to 08:27, ~5 min)
Prompt/instruction to self: "Find a clearly usable published 5K age-factor table, check its licence, and do not invent numbers."

What I did and found:
- First search surfaced the **WMA 2023 age-factor PDF**, but it is for *combined-events scoring* (track and field events), not road 5K. Not usable for a road 5K.
- The WMA documents page links "Road Age Standards (2010)" (+ explanation PDF), but the current page I could fetch no longer shows a direct link to the road tables, and the 2010 edition is 16 years old.
- The source that is actually current and clearly licensed: **Alan Jones's `Age-Grade-Tables` repository** (the author of the WMA/USATF road tables). Latest edition is **2025**, approved 2025-01-10 by the USATF Masters Long Distance Running Council. **Licence: CC0 1.0 Universal** (GitHub API reports `cc0-1.0`; LICENSE.md in the repo is the CC0 text). Public-domain dedication, so reuse is fine; I attribute anyway.
- The repo ships a plain-text file for scoring software, `AgeGrade.5k` (open standards M 12:49, F 13:54 and one factor per age 5 to 99) and spreadsheets (`MaleRoadStd2025.xlsx`, `FemaleRoadStd2025.xlsx`). I used the text file as the data source and the spreadsheets as an independent cross-check.
- Caveat to be honest about in the newsletter: the brief says "published WMA age-grading factors". The 2025 edition was approved by **USATF's MLDR**, not WMA. It continues the WMA/USATF road tables (2010/2015/2020), and the WMA site as far as I could find only lists the 2010 road standards and the 2023 combined-events factors. The page and README say this plainly and say the app is not an official WMA/USATF product. Decision: use the 2025 tables, not invent or approximate anything for the age grade.
- Rejected: third-party calculators' tables (some had inconsistent factors; one site's worked example used a different factor for a 50-year-old man than the official file), and Runalyze's PHP library (its tables are CC-BY-4.0 and it is an older edition).

## Stage 2: architecture decisions (08:27)
- Plain HTML + ES modules, no bundler, no framework. Pure logic in `src/` so Node tests can import the exact files the browser runs.
- Whole-second splits with **largest-remainder rounding** so splits sum exactly to the target (avoids the classic off-by-one-second bug).
- Terrain model: documented rule of thumb (+3.3% time per 1% uphill, 1.8% faster per 1% downhill, capped at 8%). Flagged as an approximation on the page and README. Elevation input = net metres per km (10 m per km = 1%).
- Split style: linear tilt across the 5 km, strength selectable (about 2% / 4% / 6% first-to-last km).
- Strict CSP in `vercel.json` (`connect-src 'none'`) so "no external calls" is enforced by the browser rather than just claimed.
- Category wording: "Men's category" / "Women's category" (matching the tables) as asked.

## Stage 3: first build + tests (08:27 to 08:28)
Instruction used: "Write the age-grade, split and plan modules, then unit tests that include published worked examples and a check against the source files, then the UI."
- Wrote a generator (`tools/gen-data.mjs`) that turns `data/AgeGrade.5k` into `src/agegrade-data.js`, so the numbers are never typed by hand.
- Tests (`node test/run.mjs`, dependency-free): data integrity vs the text file (190 factors), vs the xlsx age-standard seconds (within 1 s, ages 8 to 99), two published worked examples (M50 25:00 = 58.42%, F50 25:00 = 64.71%), 26 published age-standard times, properties, 5,000 randomised exact-sum split cases, strategy/terrain direction checks, validation.
- **Result: 21/21 passed on the first run.** I do not entirely trust that, so I checked the checks: the published worked examples are from a third-party calculator that uses the same 2025 tables, so they confirm my implementation matches the tables, but are not an independent derivation. I could not get an official calculator (Howard Grubb's page, linked from the repo) to respond from the build box, so there is no first-party example to compare against. Recorded as a limitation.

## Stage 4: UI + headless browser check (08:28)
Tooling: Playwright wasn't installed; installed `playwright-core` outside the repo and drove the box's existing Google Chrome.
What broke / what I fixed:
1. **Redundant column.** Over 1 km, "pace per km" is identical to the split, so the table had two identical columns. Changed to Split (pace /km) + Pace /mile.
2. **Share card footer clipped** on the right (text ran off the 1080px canvas) and then **overlapped the last table row** after I reflowed it. Fixed by splitting the footer into three lines and tightening the row pitch.
3. **A tooling gotcha (not an app bug):** I re-ran the screenshot after fixing the card and looked at the file, but my image viewer returned the *old* picture because it cached by file path. I only noticed because the "fix" showed no change while the file timestamp was new. Lesson: view re-rendered screenshots under a new filename.
4. **Copy-to-clipboard check was a false negative:** my script read the status text before the async clipboard write finished. Added a wait for the status message.
5. Band label for scores under 60% was "keep building", which reads as patronising. Changed to "under 60%".
