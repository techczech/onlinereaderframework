// SCRATCH REHEARSAL ONLY (bun). Runs the site importer of a scratch copy of the website against rehearsal copies of the two editions. The editions were
// built from an uncommitted working tree, so the real reader verifier refuses them; this rehearsal stubs that one check and says so. It proves the site
// integration path (copy, _headers block, record, build), never that an edition is deployable.
// Usage: bun rehearsal-import.ts <scratch host> <rehearsal reader root>
const [host, reader] = process.argv.slice(2);
const { importReaderBooks } = await import(`${host}/scripts/import-reader-books.ts`);
const result = importReaderBooks({ hostRoot: host, readerRoot: reader, verifyReader: (_root: string, book: string) => ({ ok: true, output: `${book}: verifier STUBBED for scratch rehearsal` }) });
console.log(JSON.stringify(result, null, 1));
process.exitCode = result.ok ? 0 : 1;
