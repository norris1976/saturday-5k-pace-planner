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
6. Elevation column wrapped ("+8 / m") on a 390px screen; fixed with `white-space: nowrap` on table cells.
7. The word for the weekly-timed-run brand must not appear anywhere in the repo. My own tests/guards contained it as a literal string, so I rewrote the guard regex so the repo no longer contains the word at all (a `grep -ri` over the repo now finds nothing).

## Stage 5: GitHub + Vercel (08:29 to 08:31)
Instruction used: "Create a public repo under norris1976 and push; create a Vercel project linked to it and deploy to production; verify the public URL without auth."
- Auth found on the box: `gh` already logged in as `norris1976`; Vercel CLI logged in to Tim's team ("Tim Norris' projects", same team as Half-Time Pulse). No credentials were printed or copied anywhere.
- `gh repo create norris1976/saturday-5k-pace-planner --public --push`: worked first time.
- `vercel link` created the project and **auto-connected the GitHub repo**; `vercel deploy --prod` took about 5 s (no build step, static files).
- **Gotcha worth a line in the newsletter:** the project's Vercel Authentication setting is "all deployments except custom domains". The per-deployment URL (`...-gz7fbyw7p-nozza-dev-projects.vercel.app`) returns **302** to a login page, but the production alias `saturday-5k-pace-planner.vercel.app` returns **200** with no auth. The public link to share is the production alias. I did not change the project's protection setting.
- `vercel link` also dropped a `.env.local` with an OIDC token into the folder. It was auto-added to `.gitignore` (`.env*`) and is not committed. Checked with `git status` before every commit.

## Stage 6: live verification (08:30)
- Same headless-Chrome script run against the production URL: loaded, entered a sample run (24:30 PB, 23:45 target, age 42, men's category, rolling, negative), results rendered, splits sum to 23:45, PNG download is a real PNG (89504E47 signature), clipboard copy works, custom-elevation and validation error paths work, **0 external requests, 0 console errors**.
- Sample result: age grade 57.8% (target) vs 56.0% (PB); splits 4:57, 4:42, 4:51, 4:37, 4:38 (km 3 is the last climb; km 4 and 5 are the downhill and flat finish).

## Timings
| Stage | Start | End | Notes |
|---|---|---|---|
| 0 Kickoff + env check | 08:22 | 08:22 | gh/Vercel already authenticated |
| 1 Source + licence research | 08:22 | 08:27 | longest stage by wall-clock; most of it was ruling sources out |
| 2-3 Design + code + tests | 08:27 | 08:28 | 21 tests green first time |
| 4 UI + headless checks + fixes | 08:28 | 08:29 | 5 small fixes |
| 5 GitHub + Vercel | 08:29 | 08:31 | |
| 6 Live verify + docs | 08:30 | see final entry | |

## Decisions and honest caveats (for the newsletter)
- **Not a "WMA" table, strictly.** Age-grade data is the 2025 road tables by Alan Jones (CC0), approved by USATF's MLDR; it continues the WMA/USATF tables. Said on the page and in the README.
- **Terrain adjustment is a rule of thumb**, labelled as such. The flat/rolling/hilly presets are illustrative shapes, not real courses.
- **Validation is against the tables as published, not an independent derivation**: files from the source repo (text + spreadsheet) and a third-party worked example. No official calculator comparison was possible from the box.
- Whole-second splits: sums are exact; the price is that on some courses a split can be 1 s off its "ideal" value.
- Not done: mile/imperial input, a pacing-chart print view, saving plans (would need storage; the brief said no login/no data).

## Final entry
- **End: 08:31** (Europe/London). Total elapsed from kickoff 08:22: about 9 minutes. Final live check after the last push: production URL 200, headless run OK, 0 external requests, 22/22 unit tests passing.
