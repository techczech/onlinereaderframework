---
title: Archived web editions before the reader upgrade
date: 2026-10-27
status: archived-before-publication
---

# Archived book web editions

The original applications and manuscript sources were not changed. Old Cloud Run services remain deployed; the old Linguistics Pages deployment is retained. These addresses were checked before any production switch. The two Google-hosted applications remain dependent on their original service; their source archives are not represented as complete offline captures.

## Recovery addresses

- Linguistics: https://7362d02d.linguistics-stack-exchange-answers.pages.dev/ (curl exit 0, HTTP 200).
- Deliberate Practice: https://guide-to-deliberate-practice-cjmr775lua-uw.a.run.app/ (curl exit 0, HTTP 200).
- Language Muscle: https://building-your-language-muscle-cjmr775lua-uw.a.run.app/ (curl exit 0, HTTP 200).

## Local archives

Archives are retained under `build/retired-web-editions-2026-10-27/`, outside public release output. The manifest there records each archive digest.

- `retired-linguistics-full-static-site.tar.gz` preserves full former static build. SHA-256: `af887f0958ab6e86df355d7594deba7c2d2e991ee9fd3a8dbb434c6afea69d53`.
- `retired-deliberate-practice-source.tar.gz` preserves original source HEAD; original Cloud Run service retained separately. SHA-256: `2ceeae8b03fe932bfcd80833c2c4dfc180754d93fda813259ced6297d2925fd8`. Original source commit: `336987aff54358e4d107ef84875279093818e64d`.
- `retired-language-muscle-source.tar.gz` preserves original source HEAD; original Cloud Run service retained separately. SHA-256: `11781ea8b889a10684c6802254443c8d333e87db7787006731312f6085ee4e75`. Original source commit: `ec845f4673a8abce2a2855e3079d6867370e6abc`.

The earlier root-page captures in the same folder are partial captures only. The Linguistics tarball contains the former full static build, including its EPUB/PDF. No archived private source tarball is to be included in the public framework source release.
