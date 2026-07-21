import subprocess, tempfile, pathlib
from html.parser import HTMLParser
class P(HTMLParser):
 def __init__(self): super().__init__(); self.s=[]; self.cur=None; self.text=[]; self.depth=0
 def handle_starttag(self,t,a):
  if t=='script': self.cur=(dict(a),[])
  elif not self.cur: self.depth+=1
 def handle_endtag(self,t):
  if t=='script' and self.cur: self.s.append((self.cur[0],''.join(self.cur[1]))); self.cur=None
  elif not self.cur: self.depth=max(0,self.depth-1)
 def handle_data(self,d):
  if self.cur:self.cur[1].append(d)
  else:self.text.append(d)
for f in ['local-ide.html','public/local-ide.html']:
 p=P(); p.feed(pathlib.Path(f).read_text()); main=[x[1] for x in p.s if 'StickShift Tool Identity Declaration' in x[1]]
 assert len(main)==1 and all(m in main[0] for m in ['function escapeInlineScriptBreakouts','function validateLegacyCompatibility','function validateCompiledPdfJs','window.__LOCAL_HTML_IDE_READY__ = true']), f+' truncated main script'
 for attrs,body in p.s:
  typ=attrs.get('type','').lower()
  if typ in ('text/plain','text/markdown','application/json'): continue
  with tempfile.NamedTemporaryFile('w',suffix='.js') as x:
   x.write(body);x.flush(); assert subprocess.run(['node','--check',x.name],capture_output=True).returncode==0, f+' invalid script'
 leaked=''.join(p.text)
 assert not any(x in leaked for x in ['function validateLegacyCompatibility','function validateCompiledPdfJs','window.__LOCAL_HTML_IDE_READY__']), f+' leaked script source'
print('html shell integrity passed')
