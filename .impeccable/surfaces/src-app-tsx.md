---
version: 1
slug: "src-app-tsx"
primary_target: "src/App.tsx"
related_targets: ["src/styles.css","src/components/Room.tsx"]
---

# Homepage and research room

Mode: Operate on the homepage; Read during discussion. The user explicitly requests a fresh frontend implementation and delegates final composition selection.

## Direction contract

THESIS: Research questions gather into a discussion. A live, editable question index is the first useful surface, replacing the old sidebar/marketing-hero/card arrangement.

OWN-WORLD: Cold white plane, storm-black heavy Chinese typography, cobalt actions and teal reviewer identity. Letter fragments disperse from the active question and regroup; real controls remain steady and readable. Thin boundaries, no ornamental illustration.

STORY: Browse or rotate a question, edit it in the working sheet, configure three agents and start. The transcript then becomes a quiet, single-column reading stream beside a private tutor.

FIRST VIEWPORT: Full-width header, 96px at the approved 1505px desktop width and proportional above 1301px; 78px on tablet and 68px on phone; left question index takes approximately 31% of the desktop width, right drafting sheet 69%. The active subject is large black type. Materials and start sit below it; editable roles and stop settings follow. Question selection triggers one brief glyph transition. Reduced motion shows the complete stable text. Mobile stacks the writing sheet before the question index.

FORM: User selected challenger Alphabet Storm, seed f409c59e; assistant selected composition index under explicit delegation, approved comp .impeccable/mocks/index.png. Rebuild UI structure and CSS from scratch; retain tested domain services. Correct generated-copy defects: PDF/text/links only; no fabricated account/history data. Long input must remain readable without oversized type.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Research loop extension · 2026-09-13

THESIS: Every discussion should lead to a retrievable understanding, with a short path from question to evidence, follow-up, notes and return.

OWN-WORLD: Inherit Alphabet Storm's cold paper, ink typography, cobalt action and teal second role. Keep the existing homepage composition and quiet reading stream; extend open rows and fine rules across supporting states.

STORY: Choose a question or resume a real saved session. Navigate the conversation by speaker and round, inspect evidence, collect useful passages into personal notes, then find those notes again in history.

FIRST VIEWPORT: Preserve the visible topic and primary action established by the critique fixes. Recent research lives below the question index. The room exposes a compact conversation index and direct notes/materials entry points. History provides search and three task-based filters above readable session rows. Phone actions wrap and panels retain accessible close/recovery controls.

FORM: Extension of the existing approved surface, not a replacement identity or composition tournament. Reuse incumbent assets and motion; no new comp or raster asset is required for these functional additions. User confirmed the complete research loop as priority.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

### Implementation record

The extension adds up to three recent non-demo sessions beneath the index. History searches titles, notes, source titles, complete stored discussion text and tutor text, with all / notes / bookmarks filters; source bodies are excluded. The room exposes round-and-speaker navigation plus direct source and note panels. Completion provides a note-entry action. Bookmarked discussion or tutor content can be appended as Markdown quotes while preserving manual notes; identical quoted content already present disables re-collection. No internal identifier or metadata is added to note content. Notes export contains the session heading and notes only; full JSON backup remains available separately. Material text and URL drafts survive tab switching during the current dialog lifetime.

These additions reuse the incumbent tokens, controls, open rows, fine rules and mobile panel behavior. They introduce no durable visual-system change, new identity, font or raster asset. `DESIGN.md` and its sidecar remain unchanged for this ordinary extension. Build, test and browser evidence and outstanding review limits are recorded in `VALIDATION.md`; documentation reconciliation is in `.impeccable/review/documentation-check.md`. The extension's independent `finish-verdict.md` records ship after the sole excerpt-marker P2 was resolved on desktop and phone. That verdict is scoped to supplied captures and code, with the stated real-service/device limits; no deployment occurred.
