from pathlib import Path
import ast
from html.parser import HTMLParser
source=Path(__file__).with_name('build-czech-navigator.py').read_text()
node=next(n for n in ast.parse(source).body if isinstance(n,ast.ClassDef) and n.name=='AnchorIds')
namespace={'HTMLParser':HTMLParser}
exec(compile(ast.Module(body=[node],type_ignores=[]),'anchor-parser','exec'),namespace)
parser=namespace['AnchorIds']()
parser.feed('<table id="real" data-semantic-table-id="fabricated"><td id="cell">x</td></table><a id="single"></a>')
assert parser.ids==['real','cell','single'],parser.ids
print('Actual id attributes retained; data-semantic-table-id excluded.')
