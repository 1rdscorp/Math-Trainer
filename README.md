# Math Trainer

A web app for learning and practising math, from 1st grade through Calculus 3. It runs in any
modern browser on a phone or a computer, needs no account, and has no adverts or tracking.

## What is in it

- **Nine levels**: Grades 1–5, Grades 6–8, Algebra 1, Geometry, Algebra 2, Precalculus, Calculus 1,
  Calculus 2 and Calculus 3. Each has a list of topics aligned to common curriculum standards.
- **Every topic has four steps**
  1. **Learn**: the rules in plain language, with vocabulary and common mistakes.
  2. **Examples**: worked problems, including word problems, opened one step at a time.
  3. **Try it**: interactive models. Type your own numbers and the steps, the answer and the picture
     update as you type.
  4. **Quiz**: multiple-choice questions, generated fresh each time and never repeated in a run.
- **Quizzes adapt.** Four tiers (Easy, Medium, Hard, Challenge). The quiz starts at Easy, moves up
  after 3 correct answers in a row and down after 2 wrong in a row. Points are +5/−2, +10/−4,
  +15/−6 and +20/−8; the score never drops below 0; the quiz is complete at 100 points. A wrong
  answer shows the rule again and a worked solution, then a new question.
- **Placement quiz**: a short adaptive quiz that suggests a level and a first topic.
- **Multiplication table**: an explorable 1–12 grid, practice that is untimed by default with
  optional timed rounds, and a quiz. Levels follow a research-based order of facts.
- **Memory training**: spaced-repetition flashcards for math facts, number recall, pattern memory,
  matching pairs and mental-math rounds, each with difficulty that scales.
- **Progress**: points, completed topics, quiz history, current tier and weak areas, plus a mixed
  review of past topics.
- **Accessible**: keyboard operable, screen-reader labels for math, light and dark themes, adjustable
  text size, optional timers, read-aloud for Grades 1–8.

## Run it

You need [Node.js](https://nodejs.org) 20 or newer. Nothing has to be installed to run the app.

```bash
npm start
```

Then open <http://localhost:3000>.

### Or host it as plain files

The app is the `public/` folder: static HTML, CSS and JavaScript with no build step. Upload that
folder to any static host (GitHub Pages, Netlify, an S3 bucket, a school web server). Everything
works; "Save my progress" then keeps accounts on the student's own device instead of on a server.

## Accounts are optional

| | Where progress lives | Kept after closing the app? |
| --- | --- | --- |
| Guest (default) | This browser tab only | No. The app says so on the start page, the progress page and in the footer. |
| "Save my progress", static hosting | This browser, on this device | Yes, on this device |
| "Save my progress", with the server | The server's `DATA_DIR` | Yes, on any device |

An account is a made-up nickname and a secret word. No email, real name or other personal detail is
asked for, and there is no password reset (there is nothing to send it to). Students can download or
delete their data from the account window. If a guest signs in, the progress from that visit is
added to the account.

### Server settings

| Variable | Default | Meaning |
| --- | --- | --- |
| `PORT` | `3000` | Port to listen on |
| `HOST` | `0.0.0.0` | Interface to bind |
| `DATA_DIR` | `server/data` | Where accounts are stored (one JSON file per account) |
| `ACCOUNTS` | on | Set to `off` to serve the app without the account API |
| `RETENTION_DAYS` | `400` | Accounts unused for this long are deleted; `0` keeps them forever |
| `TRUST_PROXY` | off | Set to `1` behind a reverse proxy that sets `X-Forwarded-For` / `X-Forwarded-Proto` |

Secret words are hashed with scrypt. Sessions are HttpOnly, SameSite cookies. Serve the app over
HTTPS in production so the cookie is marked Secure. If you host this for children, you are
responsible for the privacy law that applies to you (for example COPPA or GDPR); see
[docs/pedagogy-and-standards.md](docs/pedagogy-and-standards.md#11-childrens-privacy).

## How it was designed

Teaching methods and curriculum standards were researched before the content was written. The
findings, and what each one turned into, are in
[docs/pedagogy-and-standards.md](docs/pedagogy-and-standards.md).

## Project layout

```
public/                 the app (static files)
  index.html, css/      shell and styles
  js/app.js             start-up and routing
  js/core/              logic with no DOM: quiz engine, progress, storage, placement,
                        times table, spaced repetition, pictures
  js/ui/, js/views/     screens
  js/content/           the curriculum
    lib/                helpers for writing topics
    levels/<level>/     one file per topic
  vendor/               KaTeX and the Andika typeface (served locally)
server/server.js        static file server and account API (no dependencies)
scripts/                content validator, sample printer, catalogue builder
test/                   unit tests
e2e/                    browser tests, including an accessibility audit
docs/                   authoring guide; research and standards
```

## Working on it

```bash
npm install            # only needed for the tests and content tools
npm test               # unit tests, server tests and validation of every topic
npm run validate       # deeper content check; add a level or level/topic to narrow it
npm run sample -- g1-5/fractions-add-sub --models    # print real questions to read
npm run catalog        # rebuild the menu data after adding or renaming topics
npm run e2e            # browser tests (needs Playwright: npm i -D playwright)
```

To add or change a topic, read [docs/authoring-topics.md](docs/authoring-topics.md). The validator
runs every question generator hundreds of times, renders every formula, checks answers numerically
where a check is supplied, and fuzzes every interactive model.

## Licences

The app is under the [MIT licence](LICENSE). It bundles [KaTeX](https://katex.org) (MIT) and the
[Andika](https://software.sil.org/andika/) typeface (SIL Open Font Licence); their licence files are
in `public/vendor/`.
