/** Set by the release build (`scripts/build-release.ts`) to the one book the output serves. Null in the demo and its dev server. */
declare const __READER_RELEASE_BOOK__: string | undefined;
export const RELEASE_BOOK: string | null = typeof __READER_RELEASE_BOOK__ === 'string' ? __READER_RELEASE_BOOK__ : null;
