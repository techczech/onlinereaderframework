"""Focused source-binding regressions; no conversion or external dependencies."""
import json, runpy, tempfile, unittest
from pathlib import Path
from collections import Counter
ROOT=Path(__file__).resolve().parents[1]
module=runpy.run_path(str(ROOT/'scripts/semantic-czech-navigator.py'))
baseline=json.loads((ROOT/'source/annotations/binding-czech-semantic-snapshot.json').read_text())['html']
class BindingTests(unittest.TestCase):
 def test_nested_identity(self):
  ranges=module['table_ranges'](baseline)
  self.assertEqual(len(ranges),308)
  self.assertTrue(any(a<c<d<b for a,b in ranges for c,d in ranges))
 def test_reject_stale_text(self):
  with self.assertRaisesRegex(AssertionError,'Stale'):module['integrate'](ROOT,[],baseline+' ',[])
 def test_reject_invalid_annotation(self):
  for kind in ['source_id','hash','span','identity']:
   with self.subTest(kind=kind), tempfile.TemporaryDirectory(dir=ROOT/'research') as temp:
    root=Path(temp);dest=root/'source/annotations';dest.mkdir(parents=True)
    for name in ['review-czech-heading-roles.json','review-czech-table-capabilities.json']:
     data=json.loads((ROOT/'source/annotations'/name).read_text())
     if 'tables' in data:
      record=data['tables'][9]
      if kind=='source_id':record['source_id']='wrong-source'
      if kind=='hash':record['locator']['sha256']='0'*64
      if kind=='span':record['source_cells'][1][1]['colspan']=2
      if kind=='identity':record['required_columns']=[]
     (dest/name).write_text(json.dumps(data))
    with self.assertRaises(AssertionError):module['integrate'](root,[],baseline,[])
 def test_compatibility_and_roles(self):
  book=json.loads((ROOT/'book-czech-navigator.json').read_text());units=[u for s in book['sections'] for u in [s,*s.get('children',[])]]
  self.assertEqual(len(units),22)
  self.assertEqual(book['compatibility']['anchorOwners']['gender'],'nouns')
  self.assertEqual(len(book['appearance']['tableReviews']),20)
  roles=json.loads((ROOT/'source/heading-roles-czech-navigator.json').read_text())['headings']
  counts=Counter(r['semantic_role'] for r in roles)
  self.assertEqual(counts['table-group-label'],21);self.assertEqual(counts['empty-table-cell'],42)
  self.assertEqual(sum(r['review_status']=='reviewed-ambiguity' for r in roles),9)
if __name__=='__main__':unittest.main()
