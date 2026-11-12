// How it works, the teaching approach, standards, privacy and accessibility.

import { h } from '../ui/dom.js';
import { LEVELS, topicList } from '../content/index.js';
import { TIERS, TARGET_SCORE, UP_STREAK, DOWN_STREAK } from '../core/engine.js';

const link = (href, text) => h('a', { href, rel: 'noopener noreferrer', target: '_blank' }, text, h('span', { class: 'sr-only' }, ' (opens in a new tab)'));

export default function aboutView(ctx) {
  ctx.title = 'How it works';
  const server = ctx.app.store.user?.where === 'server';
  return h(
    'div',
    { class: 'narrow stack-lg' },
    h('header', { class: 'stack' }, h('h1', null, 'How Math Trainer works'), h('p', null, 'A guide for students, parents and teachers.')),

    h(
      'section',
      { class: 'card stack', 'aria-labelledby': 'about-steps' },
      h('h2', { id: 'about-steps' }, 'Every topic has four steps'),
      h(
        'ol',
        null,
        h('li', null, h('strong', null, 'Learn. '), 'The rules, in plain language, with the words to know and the mistakes to watch for.'),
        h('li', null, h('strong', null, 'Examples. '), 'Worked problems, including word problems, opened one step at a time.'),
        h('li', null, h('strong', null, 'Try it. '), 'Interactive models: type your own numbers and watch the steps, the answer and the picture change.'),
        h('li', null, h('strong', null, 'Quiz. '), 'Multiple-choice questions that never repeat and that adjust to how you are doing.'),
      ),
    ),

    h(
      'section',
      { class: 'card stack', 'aria-labelledby': 'about-quiz' },
      h('h2', { id: 'about-quiz' }, 'How the quiz adapts and scores'),
      h('p', null, `Every quiz starts at Easy. ${UP_STREAK} correct answers in a row move you up one level. ${DOWN_STREAK} wrong answers in a row move you down one. Harder questions are worth more, and the quiz is finished at ${TARGET_SCORE} points.`),
      h(
        'div',
        { class: 'table-wrap' },
        h(
          'table',
          { class: 'data' },
          h('caption', null, 'Points for each level'),
          h('thead', null, h('tr', null, h('th', { scope: 'col' }, 'Level'), h('th', { scope: 'col' }, 'Right answer'), h('th', { scope: 'col' }, 'Wrong answer'))),
          h('tbody', null, TIERS.map((t) => h('tr', null, h('th', { scope: 'row' }, t.name), h('td', null, `+${t.right}`), h('td', null, `−${t.wrong}`)))),
        ),
      ),
      h('p', null, 'Your score never goes below 0. After a wrong answer you see the rule again and a worked solution, and a new question of the same kind comes back a little later so you can try the idea again.'),
      h('p', { class: 'muted' }, 'Finishing a quiz shows you can do the topic today. To remember it next month, use the mixed review on the progress page after a few days.'),
    ),

    h(
      'section',
      { class: 'card stack', 'aria-labelledby': 'about-research' },
      h('h2', { id: 'about-research' }, 'The teaching approach'),
      h('p', null, 'The design follows well-supported findings from education research:'),
      h(
        'ul',
        null,
        h('li', null, h('strong', null, 'Explain clearly, then show worked examples. '), 'Recommended by the U.S. Institute of Education Sciences practice guides for elementary math, fractions and algebra.'),
        h('li', null, h('strong', null, 'Pictures and number lines. '), 'Ten-frames, arrays, fraction bars, tape diagrams and graphs link the idea to the symbols.'),
        h('li', null, h('strong', null, 'Word problems by what is happening in the story, '), 'not by keywords, which research shows often point to the wrong operation.'),
        h('li', null, h('strong', null, 'Feedback that explains. '), 'Reviews of computer-based feedback find that an explanation teaches far more than "right" or "wrong" alone.'),
        h('li', null, h('strong', null, 'Recall, spaced out and mixed up. '), 'Flashcards return after growing gaps, missed question types come back, and reviews mix topics together.'),
        h('li', null, h('strong', null, 'Multiplication facts in a sensible order. '), 'Anchor facts first (×1, ×2, ×10, ×5), then the rest built from them. Timed rounds are optional, short and only compared with your own best.'),
        h('li', null, h('strong', null, 'Encouragement about the work, not the person. '), 'No leaderboards and no comparisons with other students.'),
      ),
      h('p', { class: 'small muted' }, 'Sources include the IES What Works Clearinghouse practice guides (', link('https://ies.ed.gov/ncee/wwc/PracticeGuides', 'ies.ed.gov'), '), Dunlosky and colleagues (2013) on learning techniques, and Van der Kleij and colleagues (2015) on feedback. The memory games are games: research has not shown that they improve general memory or grades, and we do not claim it.'),
    ),

    h(
      'section',
      { class: 'card stack', 'aria-labelledby': 'about-standards' },
      h('h2', { id: 'about-standards' }, 'Curriculum standards'),
      h('p', null, 'Topics follow widely used United States standards. Each topic page lists the standard codes it covers.'),
      h('div', { class: 'table-wrap' }, h('table', { class: 'data plain' }, h('thead', null, h('tr', null, h('th', { scope: 'col' }, 'Level'), h('th', { scope: 'col' }, 'Topics'), h('th', { scope: 'col' }, 'Aligned to'))), h('tbody', null, LEVELS.map((l) => h('tr', null, h('th', { scope: 'row' }, h('a', { href: `#/level/${l.id}` }, l.title)), h('td', null, String(topicList(l.id).length)), h('td', null, l.standards)))))),
      h('p', { class: 'small muted' }, 'Common Core codes are used for Grades 1 through Algebra 2, College Board AP topic numbers for Precalculus and Calculus 1–2, and OpenStax Calculus Volume 3 sections for Calculus 3. Some states use their own standards; the content is broadly the same, sometimes a grade earlier or later.'),
    ),

    h(
      'section',
      { class: 'card stack', 'aria-labelledby': 'about-privacy' },
      h('h2', { id: 'about-privacy' }, 'Accounts and privacy'),
      h(
        'ul',
        null,
        h('li', null, h('strong', null, 'No account is needed. '), 'Lessons, practice, quizzes and games all work for guests.'),
        h('li', null, h('strong', null, 'Guests: '), 'progress is kept only while the page is open. Close the tab or the app and it is gone.'),
        h('li', null, h('strong', null, '"Save my progress": '), 'an account is a made-up nickname and a secret word. No email, no real name, no birthday.'),
        h('li', null, h('strong', null, 'What is saved: '), 'points, completed topics, quiz history, current levels, weak areas, and progress in the extras. Nothing else.'),
        h('li', null, h('strong', null, 'Where: '), server ? 'on this site\'s server, so you can sign in from another device.' : 'in this browser on this device, or on the site\'s server if the site runs one (the sign-in window tells you which).'),
        h('li', null, h('strong', null, 'No adverts, no tracking, no outside scripts or fonts. '), 'Display settings are remembered on the device.'),
        h('li', null, h('strong', null, 'Leaving: '), 'download or delete your data any time from the account window. Server accounts that are not used for a long time are deleted automatically.'),
      ),
      h('p', { class: 'small muted' }, 'If you are under 13, ask a parent or teacher before making an account. Schools and families who host this app for children are responsible for meeting local privacy law.'),
    ),

    h(
      'section',
      { class: 'card stack', 'aria-labelledby': 'about-a11y' },
      h('h2', { id: 'about-a11y' }, 'Accessibility'),
      h(
        'ul',
        null,
        h('li', null, 'Everything works with a keyboard. In quizzes, press 1–4 or A–D to choose an answer and Enter to check it.'),
        h('li', null, 'Text size, light or dark colours, and timers can be changed from the "Aa" button at the top of every page.'),
        h('li', null, 'Every timer is optional, can be doubled, and stops while you read an explanation.'),
        h('li', null, 'Math is written with real math markup so screen readers can read it, and every picture has a text description.'),
        h('li', null, 'Lessons for Grades 1–8 can be read aloud by your device.'),
        h('li', null, 'Right and wrong are shown with words and symbols, never by colour alone. Animations are off if your device asks for reduced motion.'),
      ),
    ),

    h('section', { class: 'card stack', 'aria-labelledby': 'about-credits' }, h('h2', { id: 'about-credits' }, 'Credits'), h('p', null, 'Math typesetting by KaTeX (MIT licence). Text set in Andika by SIL International (Open Font Licence), a typeface designed for beginning readers. Both are served from this site.')),
    h('p', null, h('a', { class: 'btn btn-primary', href: '#/' }, 'Start learning')),
  );
}
