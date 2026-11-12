import json,sys,os,urllib.request
files,raw=sys.argv[1],sys.argv[2]
KEY={'periwinkle_plant':'opacity','pine_sapling_medium':'twig_alpha'}
for i in ['grass_medium_01','grass_medium_02','fern_02','shrub_02','shrub_03','calathea_orbifolia_01','celandine_01','flower_ursinia','periwinkle_plant','weed_plant_02','pine_sapling_medium']:
    d=json.load(open(os.path.join(files,i+'.json')))
    url=d[KEY.get(i,'Alpha')]['1k']['jpg']['url']
    assert url.startswith('https://dl.polyhaven.org/')
    p=os.path.join(raw,i,'textures',i+'_alpha.jpg')
    req=urllib.request.Request(url,headers={'User-Agent':'garden-site-builder/1.0'})
    open(p,'wb').write(urllib.request.urlopen(req).read()); print(i, os.path.getsize(p))
