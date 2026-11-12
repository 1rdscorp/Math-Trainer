# Teaching approach and curriculum standards

This is the research the app was designed from, and what each finding turned into. It was gathered
before any content was written.

**How it was checked.** The build environment could run web searches but could not open most primary
documents directly (the IES, W3C, College Board and Common Core sites were outside its network
allowlist). Findings below therefore rest on search results for the cited sources plus one primary
source read in full (the OpenStax calculus repository). Effect sizes and ratings are quoted as the
sources report them; check the original before citing a number elsewhere. Where the evidence is
contested or thin, this page says so.

## What the research says, and what the app does

### 1. Explain clearly, then show worked examples

- The U.S. Institute of Education Sciences (IES) practice guide *Assisting Students Struggling with
  Mathematics: Intervention in the Elementary Grades* (2021) makes six recommendations, all rated
  strong evidence: systematic instruction, clear mathematical language, concrete and semi-concrete
  representations, number lines, deliberate word-problem instruction, and timed activities to build
  fluency.
- *Organizing Instruction and Study to Improve Student Learning* (IES, 2007) recommends alternating
  worked examples with problems to solve, combining graphics with words, and spacing practice.
- *Teaching Strategies for Improving Algebra Knowledge* (IES, 2015) recommends solved problems and
  attention to structure (minimal evidence rating, meaning few qualifying studies, not evidence against).
- A 2023 meta-analysis (Barbieri and colleagues) puts the worked-example effect in mathematics at
  about g = 0.48. Whether adding "explain this step" prompts helps is disputed.

**In the app:** every topic runs Learn → Examples → Try it → Quiz. Rules are stated as things to do,
with the vocabulary defined. Worked examples open one step at a time so the student can predict the
next step, without being forced to type an explanation. Pictures (ten-frames, base-ten blocks,
arrays, fraction bars, tape diagrams, number lines, graphs, geometric figures) sit beside the symbols.

### 2. Feedback that explains

- Van der Kleij and colleagues (2015) reviewed 40 studies of computer-based feedback: explanatory
  feedback had the largest effect (about 0.49), giving the correct answer less (0.32), and
  right/wrong alone almost none (0.05).
- Wisniewski, Zierer and Hattie (2020): feedback works on average (d ≈ 0.48), and praise aimed at
  the person is the least useful kind.
- Shute (2008): keep feedback specific, about the task, in small pieces, without comparison to peers.

**In the app:** after a wrong answer the student sees the correct answer, the rule again, and a
worked solution for that exact question. Where a wrong choice comes from a known slip (adding
denominators, forgetting to distribute), a one-line note explains that slip. The feedback stays on
screen until dismissed. A fresh question of the same kind comes back two questions later.

### 3. Adaptive difficulty

- Mastery learning programmes show positive effects on achievement (Kulik, Kulik and
  Bangert-Drowns, 1990).
- The "85% rule" (Wilson and colleagues, 2019) is a mathematical result about machine-style
  learners, not a classroom finding. Evidence from practice (Rosenshine 2012; the Math Garden study by
  Jansen and colleagues, 2013) points the same way: students do well, and stay, when most answers
  are right.
- In ASSISTments data, three correct in a row predicted the next answer well (Kelly and colleagues,
  2015). Long streak requirements frustrate students; Khan Academy abandoned ten in a row.

**In the app:** the tier rules were given in the product specification (up after 3 right in a row,
down after 2 wrong in a row; +5/+10/+15/+20 and −2/−4/−6/−8; never below 0; finish at 100) and are
implemented exactly. Two things follow from the research. Under these rules a student settles near
60% correct, lower than the 80% or so that the studies favour, so the app softens the experience
around them: a point loss is shown quietly next to the explanation (no buzzers, no red flashes), and a
student who keeps slipping is pointed back to the examples and the interactive model. And 100 points
is treated as "you can do this today", with a mixed review offered for later.

### 4. Multiplication facts and timing

- Fact order: start with ×2, ×5 and ×10 (and ×1 and squares), then derive the rest with strategies
  such as double-a-double, ten groups minus one, five groups plus one (Kling and Bay-Williams, 2015;
  expert consensus rather than trials).
- IES 2021, recommendation 6 (strong evidence): short timed activities build fluency for content the
  student already understands, with immediate correction. A randomised study with first graders
  (Fuchs and colleagues, 2013) found speeded practice beat untimed practice for arithmetic.
- Contested: NCTM's 2023 position says timed *tests* should be avoided. The few experiments that
  exist do not show that timing itself causes anxiety.

**In the app:** the table can be explored cell by cell, with an array and a derived-fact strategy for
every fact. Practice levels follow the order above. Practice is untimed by default; a 60-second round
is opt-in, the clock stops while an explanation is being read, and results are compared only with the
student's own best. Every timer in the app can be doubled or switched off.

### 5. Retrieval, spacing, interleaving

- Dunlosky and colleagues (2013) rate practice testing and distributed practice as high-utility
  techniques, and interleaving as moderate.
- Rohrer and colleagues (2020): interleaved practice in 54 seventh-grade classes, 61% versus 38% on a
  test a month later.
- No trial fixes the ideal intervals for children; Leitner boxes are an engineering convention.

**In the app:** flashcards use six Leitner boxes at 1, 2, 4, 8, 16 and 30 days, graded by correctness
and speed rather than self-rating; a miss returns the card to box 1 and repeats it in the session;
only a few new cards are added each time. Quizzes vary the question type from one question to the
next. The mixed review draws questions from several past topics.

### 6. Memory games: what can honestly be claimed

- Working-memory training improves the trained tasks but does not transfer to arithmetic or reading
  (Melby-Lervåg and Hulme, 2013; Sala and Gobet, 2017; Simons and colleagues, 2016). A two-year trial
  with 452 first graders found no academic benefit (Roberts and colleagues, 2016).
- The U.S. Federal Trade Commission has acted against "brain training" products for unsupported claims.

**In the app:** flashcards and mental-math rounds practise math facts, which is what the evidence
supports. Number recall, pattern memory and matching pairs are presented as games. The app says
plainly that they are not shown to improve general memory, attention or grades.

### 7. Word problems and representations

- Schema-based instruction (teaching the structure of a problem) has strong support (IES 2021;
  Peltier and Vannest, 2017).
- Keyword strategies fail: on released test items a keyword pointed to the right operation less
  than half the time for one-step problems and under 10% for multi-step ones (Powell and
  colleagues, 2022).
- Concrete–representational–abstract sequencing and concreteness fading are supported (Bouck and
  colleagues, 2018; Fyfe and colleagues, 2014). Trials of tape diagrams specifically are few.

**In the app:** word-problem solutions start by naming what is happening (parts put together, an
amount compared, equal groups, a rate over time), never a keyword. Authors are told not to teach
keywords. Interactive word-problem models redraw the diagram from the student's own numbers.

### 8. Tone and motivation

- Praise for effort and process holds up better than praise for ability, though growth-mindset
  interventions as a whole have small and disputed effects (Macnamara and Burgoyne, 2023; Yeager
  and colleagues, 2019).
- Gamification gives small learning gains; leaderboards can reduce motivation (Sailer and Homner,
  2020; Hanus and Fox, 2015). No controlled study of point penalties in children's learning apps
  was found.
- Teenagers dislike being talked down to (Nielsen Norman Group).

**In the app:** messages name the work ("Your steps worked"), not the person. Wrong answers get "Not
yet" and an explanation. There are no leaderboards and nothing compares students. Wording is short
and warm for the early grades and matter-of-fact from middle school up.

### 9. Designing for children

- Young children need large touch targets and do better with tapping than dragging (Nielsen Norman
  Group; Anthony and colleagues, 2013). Simplified wording raises math scores slightly, most for
  weaker readers and English learners (Abedi and Lord, 2001). Read-aloud helps in the elementary
  grades (Buzick and Stone, 2014).

**In the app:** nothing requires dragging; answer buttons are larger in the Grades 1–5 lessons;
number entry has an on-screen pad; Grades 1–8 lessons and questions can be read aloud by the device;
lesson text for the early grades uses short sentences. The typeface is Andika, designed by SIL for
beginning readers (plain zero, the letter shapes children are taught, distinct I, l and 1).

### 10. Accessibility

- WCAG 2.2 AA criteria that matter most here: timing adjustable (2.2.1), contrast (1.4.3, 1.4.11),
  reflow at 320 CSS pixels (1.4.10), focus visible and not obscured (2.4.7, 2.4.11), target size
  (2.5.8), use of colour (1.4.1), status messages (4.1.3), accessible authentication (3.3.8).
- Studies do not find a benefit from "dyslexia fonts" once spacing is matched, so text-size control
  matters more than a special font.

**In the app:** keyboard operation throughout (1–4 or A–D to choose, Enter to check), visible focus,
light and dark themes checked for contrast, text size control, reduced-motion support, live-region
announcements, real tables and form controls, math rendered with MathML alongside the visual form,
a spoken-text label on every answer choice, and a text description for every picture. An automated
audit (axe-core) runs in the end-to-end tests.

### 11. Children's privacy

- The U.S. COPPA rule was amended in 2025 (effective June 2025, compliance by April 2026): among
  other things it requires a retention policy and no indefinite retention. GDPR Article 8 sets a
  parental-consent age between 13 and 16 depending on the country.

**In the app:** no account is ever required. An account is a made-up nickname (a generator is
offered) and a secret word; no email, name, birthday, location or free text is collected. There are
no third-party scripts, fonts, analytics or adverts. On static hosting, accounts never leave the
device. With the optional server, passwords are hashed with scrypt, accounts can be downloaded or
deleted by their owner, and accounts unused for 400 days are deleted automatically. This is a
design choice, not legal advice: anyone hosting the app for children remains responsible for the
law that applies to them.

## Curriculum standards

| Level | Aligned to | How topics cite it |
| --- | --- | --- |
| Grades 1–5 | Common Core State Standards for Mathematics, grades 1–5 | `CCSS 3.OA.C.7` |
| Grades 6–8 | Common Core, grades 6–8 | `CCSS 7.RP.A.2` |
| Algebra 1, Geometry, Algebra 2 | Common Core high-school standards, traditional pathway (Appendix A) | `CCSS A-REI.B.4` |
| Precalculus | Common Core "(+)" standards and the College Board AP Precalculus framework | `AP Precalculus 3.9`, `CCSS F-TF.C.9` |
| Calculus 1 | College Board AP Calculus, units 1–5 and most of unit 6 | `AP Calculus 3.1` |
| Calculus 2 | AP Calculus BC (units 6–10) plus standard college topics that AP omits | `AP Calculus 6.11`, `OpenStax Calculus Vol. 2 §3.3` |
| Calculus 3 | No national standard exists; OpenStax *Calculus Volume 3*, chapters 2–6 | `OpenStax Calculus Vol. 3 §4.6` |

Notes:

- The emphasis within each grade follows the "major work of the grade" (Student Achievement
  Partners): for example, addition and subtraction within 20 in grades 1–2, multiplication and
  fractions in grades 3–5, ratios and proportional reasoning in grades 6–7, linear relationships in
  grade 8.
- Probability and statistics, which Common Core spreads across courses, are placed in Grades 6–8,
  Algebra 1 (describing data) and Algebra 2 (conditional probability, counting, the normal
  distribution).
- Not every state uses Common Core. Texas (TEKS), Virginia and Florida (B.E.S.T.) have their own
  standards, and several states revised theirs in 2025–2026. The content is broadly the same, with
  some topics a grade earlier or later; high-school course structure varies most.
- Which Appendix A course each high-school code belongs to, and a few standard numbers inside
  clusters, could not be confirmed against the primary documents from the build environment. Topic
  files list the codes their content actually covers; treat them as a guide and check them against
  your own state's documents before relying on them for reporting.

The full topic list, with the codes for each topic, is in the app on each level page and in
`public/js/content/catalog.js`.
