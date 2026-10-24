import type { ReactNode } from 'react';
import { ReadingSupportControls } from './ReadingSupportControls.js';
import { ReadingSupportSurface } from './ReadingSupportSurface.js';
export interface ReadingSupportProps { bookId: string; sectionId: string; children: ReactNode; }
/** Standalone wrapper. Integrated readers can place Controls separately above Surface. */
export function ReadingSupport({bookId, sectionId, children}: ReadingSupportProps): React.JSX.Element {
  return <><ReadingSupportControls bookId={bookId} /><ReadingSupportSurface bookId={bookId} sectionId={sectionId}>{children}</ReadingSupportSurface></>;
}
