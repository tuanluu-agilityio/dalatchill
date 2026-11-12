import json,sys,os,urllib.request
src,dst=sys.argv[1],sys.argv[2]
ids=sys.argv[3:]
for i in ids:
    d=json.load(open(os.path.join(src,i+'.json'),encoding='utf-8'))
    e=d['gltf']['1k']['gltf']
    items=[(i+'.gltf',e['url'])]+[(k,v['url']) for k,v in e.get('include',{}).items()]
    tot=0
    for rel,url in items:
        rel=rel.replace(chr(92),'/')
        if '..' in rel or rel.startswith('/') or not url.startswith('https://dl.polyhaven.org/'): print('SKIP',rel,url); continue
        p=os.path.join(dst,i,rel); os.makedirs(os.path.dirname(p),exist_ok=True)
        if not os.path.exists(p):
            req=urllib.request.Request(url,headers={'User-Agent':'garden-site-builder/1.0'})
            with urllib.request.urlopen(req) as r, open(p,'wb') as f: f.write(r.read())
        tot+=os.path.getsize(p)
    print(i,len(items),'files',round(tot/1e6,1),'MB')
