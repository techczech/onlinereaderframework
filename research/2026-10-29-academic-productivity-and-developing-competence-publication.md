---
status: "published-verified"
title: "Academic Productivity and Developing Competence publication"
kind: "evidence"
created: "2026-10-29T18:40:12Z"
project: "/Users/dominiklukes/gitrepos/07_webapps-websites/05_publications/onlinereaderframework"
sources:
  - file: docs/release-practical-guides-2026-10-29/final/result-practical-guides-publication.md
  - url: "https://dominiklukes.net/books/academic-productivity/"
  - url: "https://dominiklukes.net/books/developing-competence/"
---

Academic Productivity is live at https://dominiklukes.net/books/academic-productivity/ with seven chapters. Developing Competence is live at https://dominiklukes.net/books/developing-competence/ with nine chapters, including Engagement Types and Accessibility. Both use author-selected cover2 artwork on their front pages and inside actual EPUB downloads. Original tools remain external links; original apps and Folios were not edited.

Reviewed reader source fa9891783b4f430af01c197a4142c368ff1b8426 produced clean-source editions passing the normal deploy verifier. Tree hashes: Academic Productivity 0e4cc1969aa3df9ffe3b611791a6160f98da3f83a5d3b49949382eff8f6b4b4c; Developing Competence 54c6b9edd3004f5d68f9acc8e83bc4a7036addf2cd1a1431f4d434cce5887e72. Real importer required those pinned trees. Website source 66987dd is pushed; its tree matches the isolated import commit 412bf1b. Production Cloudflare deployment is https://01ebfc48.dominiklukes-net.pages.dev/ . Preview f3b0017c passed delivery and mobile download checks first. No private integration history was pushed to the public reader repository.

Independent packaging and EPUB-cover reviews are clean in scope. Final clean builds and both deploy gates pass. Website build passes. The initial broad website run passed 1109 tests and failed an importer fixture assertion that expected replaced managed book-header blocks to remain a literal prefix. The test now compares byte-identical host-owned rules outside managed blocks; all 36 importer tests then pass. This test-only correction leaves the guarded importer implementation unchanged. Final imported local pages passed desktop/phone checks; actual local, preview and production EPUB downloads complete. Both production downloads pass installed EPUBCheck with zero errors/warnings and contain exact selected JPEG hashes and expected 7/9 chapter counts. Live chapter/export/image bytes and delivered CSP/nosniff/indexable headers were checked; Resources and Academic Productivity show cover cards, and Writing lists both book records. Existing personal-site book directories were checked unchanged before import commit; the three external book sites were not redeployed.

Initial clean verification correctly refused node_modules directory symlinks as untracked source. They were replaced by ignored real dependency directories with linked children, and both books were rebuilt with clean source flags. No gate was weakened. Initial extra delivery assertions assumed no-transform headers and images in the Writing list; these assumptions were corrected to the actual reviewed policy/template without production changes. Chapter verification uses canonical slash URLs because Cloudflare redirects explicit index.html requests.

Catalogue surfaces and reader deployments are registered and pushed in 2c8676a; unrelated staged catalogue contents were preserved. Backlog publishing handoff updated. Original unrelated website working edits and Czech candidate work remain untouched. Course Design remains a local verified candidate; Instructional Videos remains deferred. No actual speech, screen-reader, Safari/Firefox or physical-device acceptance is claimed.
