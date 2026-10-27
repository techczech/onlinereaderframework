/** Physical guard of the release write path. Every write, rename or deletion of the release build goes through `assertReleasePath` first.
 * A path passes only when it lies lexically inside <repo>/build/release-books, every component from <repo>/build down to it that exists on disk
 * is a real folder (or, for the last component, a real file when a file is expected), none is a symbolic link, and the release root resolves to
 * the same place through `realpath`. A symlink anywhere in that chain is refused, so nothing is emptied, renamed or written through one. */
import fs from 'node:fs';
import path from 'node:path';

export const releaseRootOf = (repo: string): string => path.join(repo, 'build', 'release-books');

const lstat = (target: string): fs.Stats | undefined => {
  try { return fs.lstatSync(target); } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined; throw error; }
};

export function assertReleasePath(repo: string, target: string, expect: 'directory' | 'file' | 'any' = 'any'): void {
  const root = releaseRootOf(repo);
  const inside = path.relative(root, path.resolve(target));
  if (target.split(/[\\/]/).includes('..') || inside.startsWith('..') || path.isAbsolute(inside)) throw new Error(`Refusing a path outside the release folder: ${target}`);
  const parts = inside ? inside.split(path.sep) : [];
  const chain = [path.join(repo, 'build'), root, ...parts.map((_, index) => path.join(root, ...parts.slice(0, index + 1)))];
  for (const [index, component] of chain.entries()) {
    const stats = lstat(component);
    if (!stats) break;
    if (stats.isSymbolicLink()) throw new Error(`Refusing a symbolic link in the release path: ${component}`);
    const last = index === chain.length - 1;
    if (!last && !stats.isDirectory()) throw new Error(`Not a folder in the release path: ${component}`);
    if (last && expect === 'directory' && !stats.isDirectory()) throw new Error(`Expected a folder: ${component}`);
    if (last && expect === 'file' && !stats.isFile()) throw new Error(`Expected a regular file: ${component}`);
  }
  if (lstat(root) && fs.realpathSync(root) !== path.join(fs.realpathSync(repo), 'build', 'release-books')) throw new Error('The release folder does not resolve inside this repository.');
}

/** Every file below a folder, in a fixed order; refuses symbolic links and anything that is neither a file nor a folder. */
export function* walkFiles(directory: string): Generator<string> {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const full = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Symbolic link in an edition: ${full}`);
    if (entry.isDirectory()) yield* walkFiles(full);
    else if (entry.isFile()) yield full;
    else throw new Error(`Not a regular file in an edition: ${full}`);
  }
}
