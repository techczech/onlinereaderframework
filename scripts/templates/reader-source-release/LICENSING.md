# Reader source licensing status

No software licence has been selected for this framework or its reused original application code. No software licence grant is added by this review draft. The author must choose the software licence and actual public scope before any release.

Third-party dependencies retain their own terms. The core lockfile records the exact resolved dependencies; this candidate does not vendor their JavaScript, host tools or installed dependency directories. Inspect the applicable notices in the installed packages before any later binary or bundled distribution.

The standalone build copies the font packages' actual LICENSE files for Inter, Merriweather and Material Symbols Outlined. Those notices are retained under packages/reader-core/notices and reproduced alongside the generated fonts in dist/fonts. They apply to those fonts, not to the framework's software. No inferred or later third-party licence text has been substituted.

The earlier encode-utf8 1.0.3 notice question is avoided by the existing qrcode 1.5.4 dependency, which removes that package. Tailwind's development dependency dlv 1.1.3 still has an incomplete supplied-notice record; its implementation is not shipped in this source candidate. This is a recorded limitation, not a new grant or a claim of completed legal clearance.
