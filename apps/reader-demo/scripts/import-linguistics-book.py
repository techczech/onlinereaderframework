"""Read the validated site model without building or changing author input."""
from pathlib import Path
import hashlib
import json
import sys

site = Path(sys.argv[1]).resolve()
sys.path.insert(0, str(site))
from sitegen.book import load_book, DEFAULT_SOURCE, DEFAULT_CONFIG, COLLECTED_NAME, THEMES_NAME, MANIFEST_NAME, EDITS_NAME

book = load_book(DEFAULT_SOURCE, DEFAULT_CONFIG)

def md_label(text):
    return str(text).replace('\\', '\\\\').replace('[', '\\[').replace(']', '\\]')

sections = []
for theme in book.sections:
    answers = []
    for a in theme.answers:
        # Keep the authored answer byte-for-byte inside the displayed content.
        attribution = f'Original answer: [Linguistics Stack Exchange](<{a.published_url}>). Licence: [{md_label(a.licence)}](<{a.licence_url}>).'
        if a.question:
            attribution += f' Original question by [{md_label(a.question.asker)}](<{a.question.asker_link}>): [{md_label(a.question.title)}](<{a.question.link}>).'
        if a.editors:
            attribution += ' Contributing editors: ' + ', '.join(f'[{md_label(e.name)}](<{e.link}>)' if e.link else md_label(e.name) for e in a.editors) + '.'
        content = '# ' + a.title + '\n\n' + a.body_md + '\n\n---\n\n' + attribution
        if a.question_summary:
            content = '> ' + a.question_summary + '\n\n' + content
        answers.append({'id': a.slug, 'title': a.title, 'category': theme.title, 'content': content, 'format': 'markdown'})
    sections.append({'id': 'theme-' + theme.slug, 'title': theme.title, 'category': theme.title, 'content': '', 'format': 'markdown', 'children': answers})
inputs = sorted(set([*getattr(book, 'input_files', []), DEFAULT_CONFIG]))
# The model tracks its physical inputs. Include every answer even in older adapters.
inputs = sorted(set(inputs + list((DEFAULT_SOURCE / 'answers').glob('*.md')) + list((DEFAULT_SOURCE / 'questions-of-answers').glob('*.md')) + [DEFAULT_SOURCE / n for n in (COLLECTED_NAME, THEMES_NAME, MANIFEST_NAME, EDITS_NAME)]))
sources = [{'book': 'linguistics', 'repository': 'writing' if p.is_relative_to(DEFAULT_SOURCE) else 'linguistics-stack-exchange-answers',
            'source': str(p.relative_to(DEFAULT_SOURCE)) if p.is_relative_to(DEFAULT_SOURCE) else p.name,
            'sha256': hashlib.sha256(p.read_bytes()).hexdigest()} for p in inputs if p.is_file()]
print(json.dumps({'book': {'id': 'linguistics', 'title': book.title, 'subtitle': book.subtitle, 'author': book.author,
                           'description': book.subtitle, 'sourceUrl': book.base_url, 'sections': sections},
                  'answerCount': len(book.answers), 'sources': sources}, ensure_ascii=False))
