# Blender: turn Poly Haven scans into light GLB packs for the web garden.
# usage: blender -b --factory-startup --python process.py -- RAW_DIR OUT_DIR pack [pack...]
import bpy, bmesh, sys, os, json, random, math
from mathutils import Vector

args = sys.argv[sys.argv.index('--') + 1:]
RAW, OUT, WANT = args[0], args[1], args[2:]

# pack -> { src, objects: {name: {thin:(keep, scale) | decimate:ratio}}, impostor: bool }
PACKS = {
    'pine': {'src': 'pine_sapling_medium', 'impostor': True, 'objects': {
        'pine_sapling_medium_a_LOD0': {'thin': (0.012, 3.0, 0.10, 1.9)},
        'pine_sapling_medium_b_LOD0': {'thin': (0.016, 2.8, 0.13, 1.75)},
        'pine_sapling_medium_c_LOD0': {'thin': (0.02, 2.6, 0.16, 1.6)}}},
    'pine_young': {'src': 'pine_sapling_small', 'objects': {
        'pine_sapling_small_a': {'thin': (0.08, 2.0)},
        'pine_sapling_small_b': {'thin': (0.08, 2.0)},
        'pine_sapling_small_c': {'thin': (0.08, 2.0)}}},
    'fern': {'src': 'fern_02', 'objects': {k: {} for k in ['fern_02_a', 'fern_02_b', 'fern_02_c', 'fern_02_d']}},
    'shrub': {'src': 'shrub_02', 'objects': {k: {'decimate': 0.6} for k in ['shrub_02_a', 'shrub_02_b', 'shrub_02_c', 'shrub_02_d']}},
    'understory': {'src': 'shrub_03', 'objects': {k: {} for k in ['shrub_03_a', 'shrub_03_b', 'shrub_03_c', 'shrub_03_d']}},
    'calathea': {'src': 'calathea_orbifolia_01', 'objects': {
        'calathea_orbifolia_01_a': {'decimate': 0.5}, 'calathea_orbifolia_01_b': {'decimate': 0.6}, 'calathea_orbifolia_01_c': {'decimate': 0.6}}},
    'grass': {'src': 'grass_medium_01', 'objects': {k: {} for k in [
        'grass_medium_01_tall_a_LOD0', 'grass_medium_01_tall_b_LOD0', 'grass_medium_01_tall_c_LOD0',
        'grass_medium_01_small_a_LOD0', 'grass_medium_01_small_b_LOD0', 'grass_medium_01_tiny_a_LOD0']}},
    'grass_tuft': {'src': 'grass_medium_02', 'objects': {k: {} for k in ['grass_medium_02_a', 'grass_medium_02_c', 'grass_medium_02_e']}},
    'celandine': {'src': 'celandine_01', 'objects': {k: {} for k in ['celandine_01_a_LOD0', 'celandine_01_b_LOD0', 'celandine_01_e_LOD0']}},
    'ursinia': {'src': 'flower_ursinia', 'objects': {k: {'decimate': 0.5} for k in ['flower_ursinia_c_LOD0', 'flower_ursinia_d_LOD0', 'flower_ursinia_e_LOD0']}},
    'periwinkle': {'src': 'periwinkle_plant', 'objects': {k: {'decimate': 0.4} for k in ['periwinkle_plant_04_LOD0', 'periwinkle_plant_05_LOD0', 'periwinkle_plant_06_LOD0']}},
    'weed': {'src': 'weed_plant_02', 'objects': {k: {'decimate': 0.5} for k in ['weed_plant_02_a_LOD0', 'weed_plant_02_b_LOD0', 'weed_plant_02_d_LOD0']}},
    'rock': {'src': 'rock_moss_set_02', 'objects': {k: {'decimate': 0.2} for k in [
        'rock_moss_set_02_rock07', 'rock_moss_set_02_rock08', 'rock_moss_set_02_rock09', 'rock_moss_set_02_rock10',
        'rock_moss_set_02_rock11', 'rock_moss_set_02_rock12', 'rock_moss_set_02_rock13']}},
    'boulder': {'src': 'rock_moss_set_01', 'objects': {k: {'decimate': 0.25} for k in [
        'rock_moss_set_01_rock03', 'rock_moss_set_01_rock04', 'rock_moss_set_01_rock06']}},
    'stump': {'src': 'tree_stump_01', 'objects': {'tree_stump_01': {'decimate': 0.12}}},
}


def tris(o):
    o.data.calc_loop_triangles(); return len(o.data.loop_triangles)


def thin(o, keep, scale, rng, keep_big=1.0, scale_big=1.0):
    """Keep a share of the small loose parts (needles) of the foliage material, enlarged to fill in."""
    twig = [i for i, s in enumerate(o.material_slots) if 'twig' in s.material.name]
    bm = bmesh.new(); bm.from_mesh(o.data); bm.verts.ensure_lookup_table()
    lab = [-1] * len(bm.verts); islands = []
    for v in bm.verts:
        if lab[v.index] != -1: continue
        n = len(islands); st = [v]; lab[v.index] = n; members = [v]
        while st:
            a = st.pop()
            for e in a.link_edges:
                b = e.other_vert(a)
                if lab[b.index] == -1: lab[b.index] = n; st.append(b); members.append(b)
        islands.append(members)
    kill = []
    for members in islands:
        f = members[0].link_faces
        if not f or f[0].material_index not in twig: continue   # bark: keep whole
        big = len(members) > 90                                   # a whole sprig rather than a loose needle
        if rng.random() > (keep_big if big else keep): kill.extend(members); continue
        if big: scale_now = scale_big
        else: scale_now = scale
        c = Vector((0, 0, 0))
        for v in members: c += v.co
        c /= len(members)
        for v in members: v.co = c + (v.co - c) * scale_now
    bmesh.ops.delete(bm, geom=kill, context='VERTS')
    bm.to_mesh(o.data); bm.free(); o.data.update()


def decimate(o, ratio):
    bpy.context.view_layer.objects.active = o
    m = o.modifiers.new('d', 'DECIMATE'); m.ratio = ratio
    bpy.ops.object.modifier_apply(modifier='d')


def render_impostors(o, pack, out, meta):
    sc = bpy.context.scene
    sc.render.engine = 'BLENDER_EEVEE_NEXT'
    sc.render.film_transparent = True
    sc.view_settings.view_transform = 'Standard'
    sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'
    if not sc.world:
        sc.world = bpy.data.worlds.new('w')
    sc.world.use_nodes = True
    bg = sc.world.node_tree.nodes['Background']; bg.inputs[0].default_value = (0.9, 0.95, 1, 1); bg.inputs[1].default_value = 1.1
    if 'sun' not in bpy.data.objects:
        sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN')); sun.data.energy = 2.2
        sun.rotation_euler = (math.radians(50), 0, math.radians(35)); sc.collection.objects.link(sun)
        cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); cam.data.type = 'ORTHO'; sc.collection.objects.link(cam); sc.camera = cam
    cam = bpy.data.objects['cam']
    for other in sc.objects:
        if other.type == 'MESH': other.hide_render = other is not o
    w = max(o.dimensions.x, o.dimensions.y) * 1.04; h = o.dimensions.z * 1.02
    sc.render.resolution_y = 1024; sc.render.resolution_x = max(64, int(round(1024 * w / h / 2) * 2))
    cam.data.ortho_scale = h; cam.data.clip_end = 200
    key = o.name.split('_')[-2] if o.name.endswith('LOD0') else o.name.split('_')[-1]
    for view, (pos, rz) in {'0': ((0, -60, h / 2), 0), '1': ((60, 0, h / 2), math.radians(90))}.items():
        cam.location = pos; cam.rotation_euler = (math.radians(90), 0, rz)
        name = f'{pack}_{key}_far{view}.png'
        sc.render.filepath = os.path.join(out, name); bpy.ops.render.render(write_still=True)
    meta[key] = {'width': round(w, 3), 'height': round(h, 3)}


for pack in WANT:
    cfg = PACKS[pack]
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=os.path.join(RAW, cfg['src'], cfg['src'] + '.gltf'))
    rng = random.Random(7)
    # the JPG glTFs drop the leaf cut-outs: wire the separate alpha map back in
    ap = os.path.join(RAW, cfg['src'], 'textures', cfg['src'] + '_alpha.jpg')
    if os.path.exists(ap):
        img = bpy.data.images.load(ap); img.colorspace_settings.name = 'Non-Color'
        for mat in bpy.data.materials:
            if not mat.use_nodes or 'bark' in mat.name or 'dead' in mat.name: continue
            bsdf = next((n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
            if not bsdf: continue
            base = bsdf.inputs['Base Color'].links[0].from_node if bsdf.inputs['Base Color'].links else None
            tex = mat.node_tree.nodes.new('ShaderNodeTexImage'); tex.image = img
            if base and base.type == 'TEX_IMAGE' and base.inputs['Vector'].links:
                mat.node_tree.links.new(base.inputs['Vector'].links[0].from_socket, tex.inputs['Vector'])
            mat.node_tree.links.new(tex.outputs['Color'], bsdf.inputs['Alpha'])
            mat.blend_method = 'HASHED'
            print('RESULT', pack, 'alpha ->', mat.name)
    keepers = []
    for o in list(bpy.context.scene.objects):
        if o.name not in cfg['objects']:
            bpy.data.objects.remove(o, do_unlink=True)
    meta = {}
    for name, opt in cfg['objects'].items():
        o = bpy.data.objects[name]; o.location = (0, 0, 0)
        before = tris(o)
        if cfg.get('impostor') and not os.path.exists(os.path.join(OUT, pack + '_far.json')): render_impostors(o, pack, OUT, meta)
        if 'thin' in opt: thin(o, opt['thin'][0], opt['thin'][1], rng, *opt['thin'][2:])
        if 'decimate' in opt: decimate(o, opt['decimate'])
        print('RESULT', pack, name, before, '->', tris(o), 'dim', [round(v, 2) for v in o.dimensions])
        keepers.append(o)
    for o in bpy.context.scene.objects: o.select_set(o in keepers)
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, pack + '.glb'), export_format='GLB', use_selection=True,
                              export_apply=True, export_yup=True, export_image_format='AUTO')
    if meta:
        json.dump(meta, open(os.path.join(OUT, pack + '_far.json'), 'w'))
    print('RESULT', pack, 'glb', round(os.path.getsize(os.path.join(OUT, pack + '.glb')) / 1e6, 2), 'MB')
