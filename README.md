# The Signal — Dylan from 2045

Free weekly brief from Dylan from 2045.

- Landing: https://dylan2045ad.github.io/dylan2045-ad/
- Free issue: https://payhip.com/b/4tHmb
- Field Kit ($17): https://payhip.com/b/V472q

The homepage reads [`data/issues.json`](data/issues.json) and features the highest issue number: cover, title, date, and teaser. Older issues stay in the archive. The rest of the creator hub stays at [`hub.html`](hub.html).

GitHub Pages publishes the `main` branch from the repository root. The same files are what Netlify serves.

Do not commit the full issue text. `data/issues.json` stores a short teaser only.

## Add Issue 06

1. Add the cover image to the repo.
2. Edit `data/issues.json` and add an object with the next number:

```json
{
  "number": 6,
  "title": "Issue title",
  "date": "YYYY-MM-DD",
  "teaser": "One or two public sentences. Not the full issue.",
  "cover": "your-cover.jpg",
  "url": "https://payhip.com/b/4tHmb"
}
```

3. Commit that change and push to `main`.
4. [`.github/workflows/signal-release.yml`](.github/workflows/signal-release.yml) runs because `data/issues.json` changed. It creates GitHub Release `signal-issue-06` titled `The Signal — Issue 06: …`. The notes include the teaser (capped at 400 characters), the Payhip link, and the Pages URL. If tag `signal-issue-06` already exists, the workflow does nothing.

The same push updates the Pages site, so the landing shows Issue 06 without a separate deploy step.

## Get release notifications

Open https://github.com/dylan2045ad/dylan2045-ad and choose **Watch → Custom → Releases**. GitHub notifies you when a new issue ships.
