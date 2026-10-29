"""Apply reviewed decisions only to the reproducible first-builder snapshot."""
import hashlib, json, re, html as entities

def sha(value):
    return hashlib.sha256(value.encode()).hexdigest()

def table_ranges(text):
    stack, ranges = [], []
    for m in re.finditer(r'</?table\b[^>]*>', text):
        if m[0].startswith('</'):
            ranges.append((stack.pop(), m.end()))
        else:
            stack.append(m.start())
    assert not stack
    return sorted(ranges)

def integrate(root, sections, baseline, old_roles):
    headings = json.loads((root/'source/annotations/review-czech-heading-roles.json').read_text())
    tables = json.loads((root/'source/annotations/review-czech-table-capabilities.json').read_text())
    expected = 'a337af674418ef36b08ad11214780c315f3ac603068f8926c206e327c7418e33'
    assert headings['source_sha256'] == tables['source_sha256'] == sha(baseline) == expected, 'Stale semantic review source binding'
    (root/'source/annotations/binding-czech-semantic-snapshot.json').write_text(json.dumps({'sha256': expected, 'html': baseline}, ensure_ascii=False))
    roles = headings['headings']
    by_id = {r['id']: r for r in roles}
    assert len(by_id) == len(roles) == 481
    for m in re.finditer(r'<h([1-6])\b([^>]*)>(.*?)</h\1>', baseline, re.S):
        ident = re.search(r'id="([^"]*)"', m[2])[1]
        assert sha(m[0]) == by_id[ident]['source_locator']['heading_sha256'], ident
    ranges = table_ranges(baseline)
    assert len(ranges) == len(tables['tables']) == 308
    reviews, replacements = [], []
    for (a,b), record in zip(ranges, tables['tables']):
        original = baseline[a:b]
        assert sha(original) == record['locator']['sha256'], 'Table content mismatch'
        assert re.search(r'<table[^>]*id="([^"]+)"', original)[1] == record['source_id'], 'Wrong table source id'
        if not record['capabilities']['filter']:
            continue
        assert record['header_associations_status'] == 'explicit'
        assert record['required_columns'] == [0]
        assert not re.search(r'rowspan=|colspan=|<table', original[original.index('>')+1:])
        rows = record['source_cells']; width = len(rows[0])
        assert all(len(r) == width and all(c['rowspan'] == c['colspan'] == 1 for c in r) for r in rows)
        assert len(record['groups']) == len(rows)-1
        assert len(record['capabilities']['sort']) == width
        # Stable semantic identity is additional: preserve every existing source anchor.
        changed = original.replace('>', ' data-semantic-table-id="'+record['id']+'">', 1)
        ri = ci = 0
        def row(match):
            nonlocal ri, ci
            ri += 1; ci = 0
            def cell(m):
                nonlocal ci
                ci += 1; key = f'r{ri}c{ci}'; cid = record['id']+'-'+key
                tag, attrs, body = m.groups()
                extra = ' id="'+cid+'"'
                if key in record['header_cells'] or key == record['axis_corner']:
                    tag = 'th'; extra += ' scope="col"'
                elif key in record['row_header_cells']:
                    tag = 'th'; extra += ' scope="row"'
                if key in record['headers']:
                    extra += ' headers="'+' '.join(record['id']+'-'+v for v in record['headers'][key])+'"'
                return '<'+tag+attrs+extra+'>'+body+'</'+tag+'>'
            return re.sub(r'<(td|th)([^>]*)>(.*?)</\1>', cell, match[0], flags=re.S)
        changed = re.sub(r'<tr\b[^>]*>.*?</tr>', row, changed, flags=re.S)
        # textContent includes source whitespace; bind the exact DOM text, not cleaned labels.
        from html.parser import HTMLParser
        class Text(HTMLParser):
            def __init__(self): super().__init__(); self.parts=[]
            def handle_data(self, data): self.parts.append(data)
        parser=Text();parser.feed(changed)
        bound_cells=[]
        for row_match in re.finditer(r'<tr\b[^>]*>.*?</tr>', changed, re.S):
            bound_row=[]
            for cm in re.finditer(r'<(td|th)([^>]*)>(.*?)</\1>', row_match[0], re.S):
                cp=Text();cp.feed(cm[3])
                scope=re.search(r'scope="(row|col)"',cm[2])
                bound_row.append(dict(text=''.join(cp.parts),tag=cm[1],role=scope[1] if scope else 'data'))
            bound_cells.append(bound_row)
        reviews.append(dict(id=record['source_id'], source=''.join(parser.parts), columns=[c['text'] for c in rows[0]], reason=record['reason'], cells=bound_cells, requiredColumns=record['required_columns'], cellPrefix=record['id'], headers=record['headers'], rowHeaders=record['row_header_cells'], columnHeaders=record['header_cells']))
        replacements.append((original,changed))
    assert len(reviews) == 20
    def map_content(content):
        for original, changed in replacements:
            content = content.replace(original, changed)
        def heading(m):
            attrs,body=m[2],m[3]; ident=re.search(r'id="([^"]+)"',attrs)[1]; role=by_id[ident]
            if role['role']=='lead-in':
                return '<p'+attrs+'><strong>'+body+'</strong></p>'
            return '<h'+str(role['level'])+attrs+'>'+body+'</h'+str(role['level'])+'>'
        return re.sub(r'<h([1-6])([^>]*)>(.*?)</h\1>',heading,content,flags=re.S)
    for section in sections:
        section['content']=map_content(section['content'])
        for child in section.get('children',[]): child['content']=map_content(child['content'])
    return roles, reviews
