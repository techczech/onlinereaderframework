---
title: Online Reader Framework v1 and three book web editions
date: 2026-10-27
status: published-and-live-verified
---

# Published reader framework and books

The author authorised the web replacements and MIT framework release on 27 October. All three books are live at their existing public addresses. The former original applications remain available through their retained Cloud Run service addresses; the old Linguistics Pages deployment and local archives are recorded in receipt-retired-book-editions-2026-10-27.md.

- Deliberate Practice: https://deliberatepractice.dominiklukes.net/ ; production deployment https://b739ad88.deliberatepractice.pages.dev/ .
- Building Your Language Muscle: https://buildingyourlanguagemuscle.edutools.fyi/ ; production deployment https://9e943f5a.languagemuscle.pages.dev/ .
- Linguistics: https://linguistics.dominiklukes.net/ ; production deployment https://217c7b45.linguistics-stack-exchange-answers.pages.dev/ .
- Framework project site: https://techczech.github.io/onlinereaderframework/ .
- MIT v1.0.0 release: https://github.com/techczech/onlinereaderframework/releases/tag/v1.0.0 .
- Personal website link: https://dominiklukes.net/resources/online-reader/ , also listed in https://dominiklukes.net/resources/ .

## Frozen source and publication boundary

The private integration source was frozen at 8bd5f8f5acb993f1779b7cfa09f2296154c244b4. The public repository received only the reviewed 125-file allowlisted source projection, as public commit f8453b87307b8910ca096e3b832e36adc8ad0b9f. No private working branch/history, manuscript JSON, internal report or research folder was pushed. The previous public framework head is retained under archive/pre-v1-2026-10-27. The standalone source archive SHA-256 is 502b7a14a3eb030a34a1038d249b2cd0f50a910a89883f365b2e6b9c29988e0b; the public GitHub asset has the same bytes. Software is MIT; book and third-party font terms remain separate. No npm publication occurred.

The personal-site change is commit f726445, deployed at https://91a777ac.dominiklukes-net.pages.dev/ . Only the existing framework catalogue entry changed. The project page and release notes link Foundations of Readability, Academic Reading Framework and Principles of Readability. Book-site Built with links are deferred as requested.

## Verification and limits

The final independent guard review closes all material findings in scope. The complete unit suite passes; the 18 release tests pass. The clean source was rebuilt, all three deployment verifiers printed PASS, deployable, and the source exporter completed an isolated install/build/public tests/native import with no input drift.

After the DNS handover, 29 public HTML/agent/crawler/download responses matched the local release files byte for byte. Initial requests during domain activation included 522 responses; those negative results were preserved separately. Final checks include the old Linguistics PDF, EPUB and llms-full.txt. All three unknown-path checks return 404. GitHub Pages HTML/CSS, the source archive, and both personal-site resource pages match their expected bytes. ChatGPT-User and OAI-SearchBot user agents fetched the full-text endpoint successfully. A Python-urllib user agent received 403, and the hosted web-fetch tool reported all four tested URLs inaccessible (including GitHub Pages); no blanket claim that every hosted assistant can fetch them is made.

Terra observed each book at desktop and phone widths, chapter navigation, formatting changes/reset, voice selectors, correct agent prompts and three EPUB downloads without console/request errors. Paragraph dimming, quote-image preview and outline collapse/expand were not completed because its selector timed out. No audible speech, screen reader or real phone run was made. These are explicitly bounded observations, not a whole-application verdict. Screens and the observation note are in evidence-reader-v1-preview-2026-10-27/; final publication evidence is in evidence-reader-v1-publication-2026-10-27/.

Original manuscripts, source JSON, old guide repositories and original services were not edited or deleted. No paid narration, store submission or editorial expansion was performed.
