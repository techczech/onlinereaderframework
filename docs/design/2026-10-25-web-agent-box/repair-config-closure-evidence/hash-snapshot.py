"""SHA-256 of the production sources this repair may touch, the reader's book data, and every earlier file in the web-agent-box design folder (the
original review, repair and closure evidence must stay byte-identical). Usage: python hash-snapshot.py <label> -> source-hashes-<label>.json"""
from pathlib import Path
import hashlib, json, sys
R=Path(__file__).resolve().parents[4]; E=Path(__file__).resolve().parent; D=E.parent
files=[*sorted((R/'packages/reader-core/src/agent-export').glob('*.*')),R/'packages/reader-core/src/original/agent/AgentAccess.tsx',R/'packages/reader-core/src/original/agent/agent-access.css',
 R/'packages/reader-core/src/original/types.ts',R/'packages/reader-core/src/original/Home.tsx',R/'packages/reader-core/src/original/frontpage/layouts.tsx',R/'apps/reader-demo/src/App.tsx',
 R/'apps/reader-demo/src/canonical-sites.ts',R/'apps/reader-demo/scripts/build-agent-files.ts',R/'apps/reader-demo/scripts/check-agent-access-ssr.tsx',
 *sorted((R/'apps/reader-demo/src/books').glob('*.json')),
 *sorted(p for p in D.rglob('*') if p.is_file() and E not in p.parents and p.name!='repair-config-closure.md')]
out={str(p.relative_to(R)):hashlib.sha256(p.read_bytes()).hexdigest() for p in files}
(E/f'source-hashes-{sys.argv[1]}.json').write_text(json.dumps(out,indent=1)+'\n');print(len(out),'files hashed')
