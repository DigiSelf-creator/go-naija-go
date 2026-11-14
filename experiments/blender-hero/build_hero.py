"""
Gidi Dash: Blender 3D hero test (decision 60, part 2). Test only, not used by the game.

Builds one of our own heroes (Adult, Male, skin tone 5, low cut, green jersey) out of
simple low-poly parts, poses it in a run cycle plus jump, fall and land, and renders
sideways sprite frames with a transparent background.

Rebuild with plain Python (no Blender app needed):
    pip install bpy            # Blender 5.3 as a Python module
    python3 build_hero.py --out frames             # 13 frames at 1x and 2x
    python3 build_hero.py --out frames --shot      # also the 512 px hero shot
    python3 build_hero.py --out frames --layers    # also skin / hair / outfit as separate layers
    python3 build_hero.py --out frames --skin 2 --hair 1 --outfit 1   # another look

Look: toon shading done with emission (works on CPU Cycles, no GPU needed), plus
an inverted-hull ink outline. Colours come from src/art/hero.ts (SKINS, HAIRS, OUTFITS).
Units: 1 Blender unit = 1 game unit (u). Feet at z = 0, facing +X, camera on -Y.
"""
import argparse
import math
import os
import sys

import bpy  # noqa: E402  (bpy first, it sets up bmesh)
import bmesh
from mathutils import Vector

# ---------- our colours (copied from src/art/hero.ts and palette.ts) ----------
INK = '#1d1a14'
WHITE = '#ffffff'
LIP = '#d9705f'
SKINS = [
    ('#f1c9a5', '#dcae86'), ('#d9a172', '#c0875a'), ('#a8693f', '#8d5530'),
    ('#7a4a2a', '#653b20'), ('#4b2c1a', '#3a2113'),
]
HAIRS = [  # id, colour, accent (only low cut and afro are built in this test)
    ('lowcut', '#1b1410', '#4a382c'), ('afro', '#20140e', '#3d2a1d'),
]
OUTFITS = [  # a (top), b (trim), legs, shoes
    ('jersey', '#0e7a3e', '#ffffff', '#0e7a3e', '#f4f4f4'),
    ('ankara', '#e0572b', '#2b59c3', '#2b59c3', '#3b2a20'),
]

LIGHT = Vector((0.55, -0.55, 0.65)).normalized()  # from up, front, camera side


def lin(hexc, k=1.0):
    """sRGB hex to linear RGBA, optionally lightened (k > 1) or darkened (k < 1)."""
    h = hexc.lstrip('#')
    out = []
    for i in (0, 2, 4):
        c = int(h[i:i + 2], 16) / 255.0
        c = min(1.0, c * k) if k <= 1 else c + (1 - c) * (k - 1)
        out.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
    return (*out, 1.0)


# ---------- materials ----------
def toon(name, base, shade=None, bands=None):
    """
    Flat toon: shade / base / highlight steps from N.L, a thin rim on the lit edge.
    bands: optional list of (axis, lo, hi, colour) in object space; inside the range
    the colour replaces base (stripes, cuffs, soles).
    """
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    N = nt.nodes
    L = nt.links
    out = N.new('ShaderNodeOutputMaterial')
    emit = N.new('ShaderNodeEmission')
    L.new(emit.outputs[0], out.inputs[0])

    geo = N.new('ShaderNodeNewGeometry')
    dot = N.new('ShaderNodeVectorMath')
    dot.operation = 'DOT_PRODUCT'
    dot.inputs[1].default_value = LIGHT
    L.new(geo.outputs['Normal'], dot.inputs[0])

    # base colour, with object-space bands painted over it
    col_socket = None
    base_rgb = N.new('ShaderNodeRGB')
    base_rgb.outputs[0].default_value = lin(base)
    col_socket = base_rgb.outputs[0]
    if bands:
        tc = N.new('ShaderNodeTexCoord')
        sep = N.new('ShaderNodeSeparateXYZ')
        L.new(tc.outputs['Object'], sep.inputs[0])
        for axis, lo, hi, c in bands:
            gt = N.new('ShaderNodeMath')
            gt.operation = 'GREATER_THAN'
            gt.inputs[1].default_value = lo
            lt = N.new('ShaderNodeMath')
            lt.operation = 'LESS_THAN'
            lt.inputs[1].default_value = hi
            src = sep.outputs['XYZ'.index(axis.lstrip('|'))]
            if axis.startswith('|'):
                ab = N.new('ShaderNodeMath')
                ab.operation = 'ABSOLUTE'
                L.new(src, ab.inputs[0])
                src = ab.outputs[0]
            L.new(src, gt.inputs[0])
            L.new(src, lt.inputs[0])
            both = N.new('ShaderNodeMath')
            both.operation = 'MULTIPLY'
            L.new(gt.outputs[0], both.inputs[0])
            L.new(lt.outputs[0], both.inputs[1])
            mix = N.new('ShaderNodeMix')
            mix.data_type = 'RGBA'
            L.new(both.outputs[0], mix.inputs['Factor'])
            L.new(col_socket, mix.inputs['A'])
            mix.inputs['B'].default_value = lin(c)
            col_socket = mix.outputs['Result']

    # shade and highlight are the base darkened / lightened, so bands shade too
    dark = N.new('ShaderNodeMix')
    dark.data_type = 'RGBA'
    dark.blend_type = 'MULTIPLY'
    dark.inputs['Factor'].default_value = 1.0
    L.new(col_socket, dark.inputs['A'])
    k = 0.72
    if shade:  # use the hand-picked shade ratio from hero.ts
        b = lin(base)
        s = lin(shade)
        k = sum(s[i] / max(b[i], 1e-4) for i in range(3)) / 3
    dark.inputs['B'].default_value = (k, k, k, 1)
    hi = N.new('ShaderNodeMix')
    hi.data_type = 'RGBA'
    hi.blend_type = 'MULTIPLY'  # same hue, lighter: no grey plastic sheen on dark skin
    hi.inputs['Factor'].default_value = 1.0
    L.new(col_socket, hi.inputs['A'])
    hi.inputs['B'].default_value = (1.7, 1.6, 1.5, 1)

    # step 1: shade vs base
    st1 = N.new('ShaderNodeMath')
    st1.operation = 'GREATER_THAN'
    st1.inputs[1].default_value = -0.08
    L.new(dot.outputs['Value'], st1.inputs[0])
    m1 = N.new('ShaderNodeMix')
    m1.data_type = 'RGBA'
    L.new(st1.outputs[0], m1.inputs['Factor'])
    L.new(dark.outputs['Result'], m1.inputs['A'])
    L.new(col_socket, m1.inputs['B'])
    # step 2: small highlight
    st2 = N.new('ShaderNodeMath')
    st2.operation = 'GREATER_THAN'
    st2.inputs[1].default_value = 0.82
    L.new(dot.outputs['Value'], st2.inputs[0])
    m2 = N.new('ShaderNodeMix')
    m2.data_type = 'RGBA'
    L.new(st2.outputs[0], m2.inputs['Factor'])
    L.new(m1.outputs['Result'], m2.inputs['A'])
    L.new(hi.outputs['Result'], m2.inputs['B'])
    # rim: lit side, grazing to the camera; helps dark skin read against dark ink
    lw = N.new('ShaderNodeLayerWeight')
    lw.inputs['Blend'].default_value = 0.5
    r1 = N.new('ShaderNodeMath')
    r1.operation = 'GREATER_THAN'
    r1.inputs[1].default_value = 0.78
    L.new(lw.outputs['Facing'], r1.inputs[0])
    r2 = N.new('ShaderNodeMath')
    r2.operation = 'GREATER_THAN'
    r2.inputs[1].default_value = 0.25
    L.new(dot.outputs['Value'], r2.inputs[0])
    r3 = N.new('ShaderNodeMath')
    r3.operation = 'MULTIPLY'
    L.new(r1.outputs[0], r3.inputs[0])
    L.new(r2.outputs[0], r3.inputs[1])
    m3 = N.new('ShaderNodeMix')
    m3.data_type = 'RGBA'
    L.new(r3.outputs[0], m3.inputs['Factor'])
    L.new(m2.outputs['Result'], m3.inputs['A'])
    L.new(hi.outputs['Result'], m3.inputs['B'])
    L.new(m3.outputs['Result'], emit.inputs['Color'])
    return m


def flat(name, hexc):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    e = nt.nodes.new('ShaderNodeEmission')
    e.inputs['Color'].default_value = lin(hexc)
    nt.links.new(e.outputs[0], out.inputs[0])
    return m


def ink_mat():
    """Inverted hull: back faces of the outer shell show as ink, front faces see through."""
    m = bpy.data.materials.new('ink')
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    geo = nt.nodes.new('ShaderNodeNewGeometry')
    mix = nt.nodes.new('ShaderNodeMixShader')
    e = nt.nodes.new('ShaderNodeEmission')
    e.inputs['Color'].default_value = lin(INK)
    tr = nt.nodes.new('ShaderNodeBsdfTransparent')
    nt.links.new(geo.outputs['Backfacing'], mix.inputs[0])
    nt.links.new(e.outputs[0], mix.inputs[1])
    nt.links.new(tr.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], out.inputs[0])
    return m


# ---------- meshes ----------
def lathe(name, profile, seg=12):
    """Revolve a (radius, z) profile round Z. First and last points are poles (radius 0)."""
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    rings = []
    for r, z in profile:
        if r < 1e-6:
            rings.append([bm.verts.new((0, 0, z))])
        else:
            rings.append([bm.verts.new((r * math.cos(2 * math.pi * i / seg), r * math.sin(2 * math.pi * i / seg), z)) for i in range(seg)])
    for a, b in zip(rings, rings[1:]):
        if len(a) == 1:
            for i in range(seg):
                bm.faces.new((a[0], b[(i + 1) % seg], b[i]))
        elif len(b) == 1:
            for i in range(seg):
                bm.faces.new((a[i], a[(i + 1) % seg], b[0]))
        else:
            for i in range(seg):
                bm.faces.new((a[i], a[(i + 1) % seg], b[(i + 1) % seg], b[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me)
    bm.free()
    for p in me.polygons:
        p.use_smooth = True
    return me


def capsule_profile(r_top, r_bot, length, cap=3):
    prof = [(0.0, r_top)]
    for k in range(1, cap + 1):
        a = (math.pi / 2) * (1 - k / cap)
        prof.append((r_top * math.cos(a), r_top * math.sin(a)))
    for k in range(0, cap):
        a = -(math.pi / 2) * (k / cap)
        prof.append((r_bot * math.cos(a), -length + r_bot * math.sin(a)))
    prof.append((0.0, -length - r_bot))
    return prof


def sphere_profile(r, rings=8):
    return [(r * math.sin(math.pi * k / rings), r * math.cos(math.pi * k / rings)) for k in range(rings + 1)]


INKM = None
PARTS = {'skin': [], 'hair': [], 'outfit': []}


def obj(name, me, mat, parent, loc=(0, 0, 0), scale=(1, 1, 1), rot=(0, 0, 0), line=0.8, layer='outfit'):
    o = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(o)
    o.parent = parent
    o.location = loc
    o.scale = scale
    o.rotation_euler = rot
    me.materials.append(mat)
    me.materials.append(INKM)
    if line > 0:
        s = o.modifiers.new('outline', 'SOLIDIFY')
        s.thickness = -line / max(scale)
        s.offset = -1
        s.use_flip_normals = True
        s.material_offset = 1
        s.use_rim = False
        s.use_even_offset = True
    PARTS[layer].append(o)
    return o


def empty(name, parent, loc=(0, 0, 0)):
    e = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(e)
    e.parent = parent
    e.location = loc
    e.rotation_mode = 'XYZ'
    return e


# ---------- the hero ----------
def build(skin_i, hair_i, outfit_i):
    global INKM
    INKM = ink_mat()
    sk, sk_shade = SKINS[skin_i]
    hair_id, hair_c, hair_acc = HAIRS[hair_i]
    oid, top, trim, legs_c, shoe_c = OUTFITS[outfit_i]

    m_skin = toon('skin', sk, sk_shade)
    m_skin_far = toon('skin_far', sk, sk_shade)
    m_top = toon('top', top, bands=[('|X', -1, 0.75, trim)])
    m_sleeve = toon('sleeve', top, bands=[('Z', -9, -3.0, trim)])
    m_shorts = toon('shorts', legs_c, bands=[('|X', -1, 0.55, trim)])
    m_shin = toon('shin', sk, sk_shade, bands=[('Z', -20, -5.2, '#f4f4f4'), ('Z', -6.8, -6.1, top)])
    m_shoe = toon('shoe', shoe_c, bands=[('Z', -9, -2.3, '#c9c4b8'), ('X', 0.6, 1.7, top)])
    m_white = flat('eyewhite', WHITE)
    m_pupil = flat('pupil', INK)
    m_lip = toon('lip', LIP)
    m_hair = toon('hair', hair_c)

    root = empty('root', None, (0, 0, 21))
    obj('pelvis', lathe('pelvis', sphere_profile(4.4)), m_shorts, root, (0, 0, 0.6), (0.95, 1.05, 0.8))

    torso = empty('torso', root, (0, 0, 0))
    obj('chest', lathe('chest', capsule_profile(4.9, 4.4, 9.5)), m_top, torso, (0.2, 0, 12.4), (0.86, 1.0, 1.0))
    neck = empty('neck', torso, (0.9, 0, 14.0))
    obj('neckm', lathe('neckm', capsule_profile(2.1, 2.1, 2.5)), m_skin, neck, (0, 0, 2.2), line=0.4, layer='skin')
    head = empty('head', neck, (0.8, 0, 7.6))
    R = 7.2
    obj('skull', lathe('skull', sphere_profile(R, 10), 16), m_skin, head, (0, 0, 0), (1.0, 0.98, 1.04), layer='skin')
    obj('jaw', lathe('jaw', sphere_profile(4.6, 8), 14), m_skin, head, (1.5, 0, -2.6), (1.0, 1.2, 0.9), layer='skin')
    obj('nose', lathe('nose', sphere_profile(1.35, 6), 10), m_skin, head, (7.0, -0.8, -0.4), (1.0, 1.0, 1.15), line=0.3, layer='skin')
    obj('ear', lathe('ear', sphere_profile(1.7, 6), 10), m_skin, head, (-0.6, -6.9, -0.4), (0.8, 0.45, 1.15), line=0.35, layer='skin')
    # hair: a shell over the skull, cut along a sloping hairline
    hr = R + 0.55
    hme = lathe('hairm', sphere_profile(hr, 12), 18)
    bm = bmesh.new()
    bm.from_mesh(hme)
    cut = [v for v in bm.verts if v.co.z < max(-5.0, -1.2 + 0.6 * v.co.x)]
    bmesh.ops.delete(bm, geom=cut, context='VERTS')
    bm.to_mesh(hme)
    bm.free()
    obj('hair', hme, m_hair, head, (-0.3, 0, 0.35), (1.0, 0.98, 1.04), line=0.45, layer='hair')
    # face: eye, brow, smile (camera side), far eye just peeks
    for side, yy in (('n', -1), ('f', 1)):
        ex, ey, ez = 5.5, 3.0 * yy, 1.0
        obj('eye' + side, lathe('eye' + side, sphere_profile(1.9, 6), 10), m_white, head, (ex, ey, ez), (0.6, 0.8, 1.15), line=0.3, layer='skin')
        obj('pup' + side, lathe('pup' + side, sphere_profile(1.1, 6), 10), m_pupil, head, (ex + 0.85, ey + 0.15 * yy, ez - 0.1), (0.55, 0.8, 1.1), line=0, layer='skin')
        obj('glint' + side, lathe('glint' + side, sphere_profile(0.28, 4), 8), m_white, head, (ex + 1.35, ey - 0.2 * yy, ez + 0.5), line=0, layer='skin')
        obj('brow' + side, lathe('brow' + side, capsule_profile(0.42, 0.42, 2.2, 2), 8), m_pupil, head, (ex + 0.1, ey * 1.4, ez + 2.7), (1, 1, 1), (math.radians(-90) * yy + math.radians(-8) * yy, 0, 0), line=0, layer='skin')
    # smile: a short bent tube, rose
    cu = bpy.data.curves.new('smile', 'CURVE')
    cu.dimensions = '3D'
    cu.bevel_depth = 0.34
    cu.bevel_resolution = 2
    sp = cu.splines.new('POLY')
    pts = [(5.3, -3.7, -2.5), (6.0, -2.2, -3.5), (6.2, -0.4, -3.2)]
    sp.points.add(len(pts) - 1)
    for p_, c_ in zip(sp.points, pts):
        p_.co = (*c_, 1)
    so = bpy.data.objects.new('smile', cu)
    bpy.context.scene.collection.objects.link(so)
    so.parent = head
    cu.materials.append(m_lip)
    PARTS['skin'].append(so)

    def leg(side, y, far):
        hip = empty('hip' + side, root, (0, y, 0))
        ms = m_skin_far if far else m_skin
        obj('thigh' + side, lathe('thigh' + side, capsule_profile(2.75, 2.15, 9.5)), ms, hip, layer='skin')
        obj('shorts' + side, lathe('shorts' + side, capsule_profile(3.5, 3.2, 4.6)), m_shorts, hip, (0, 0, -0.4))
        knee = empty('knee' + side, hip, (0, 0, -9.5))
        obj('shin' + side, lathe('shin' + side, capsule_profile(2.15, 1.65, 8.5)), m_shin, knee, layer='outfit' if False else 'skin')
        ankle = empty('ankle' + side, knee, (0, 0, -8.5))
        bpy.ops.mesh.primitive_cube_add(size=1)
        c = bpy.context.active_object
        me = c.data
        bpy.data.objects.remove(c)
        sh = obj('shoe' + side, me, m_shoe, ankle, (1.15, 0, -1.2), (6.6, 4.0, 3.6))
        bv = sh.modifiers.new('round', 'BEVEL')
        bv.width = 0.32
        bv.segments = 3
        sh.modifiers.move(len(sh.modifiers) - 1, 0)
        for p in me.polygons:
            p.use_smooth = True
        return hip, knee, ankle

    def arm(side, y, far):
        sh = empty('shoulder' + side, torso, (0.4, y, 12.6))
        ms = m_skin_far if far else m_skin
        obj('upper' + side, lathe('upper' + side, capsule_profile(2.1, 1.65, 7.0)), ms, sh, layer='skin')
        obj('sleeve' + side, lathe('sleeve' + side, capsule_profile(2.75, 2.45, 3.6)), m_sleeve, sh, (0, 0, 0.2))
        el = empty('elbow' + side, sh, (0, 0, -7.0))
        obj('fore' + side, lathe('fore' + side, capsule_profile(1.65, 1.35, 5.6)), ms, el, layer='skin')
        obj('hand' + side, lathe('hand' + side, sphere_profile(1.95, 6), 10), ms, el, (0, 0, -6.4), (1, 0.9, 1.05), layer='skin')
        return sh, el

    rig = {'root': root, 'torso': torso, 'neck': neck, 'head': head}
    # far side first is irrelevant in 3D; near side faces the camera (-Y)
    rig['hipF'], rig['kneeF'], rig['ankleF'] = leg('F', 2.4, True)
    rig['hipN'], rig['kneeN'], rig['ankleN'] = leg('N', -2.4, False)
    rig['shF'], rig['elF'] = arm('F', 5.0, True)
    rig['shN'], rig['elN'] = arm('N', -5.0, False)
    return rig


# ---------- poses ----------
def R(d):
    return math.radians(d)


def set_pose(rig, P):
    """
    P: degrees. thigh/shoulder 'fwd' swings the limb forward; knee bends the shin
    back; elbow bends the forearm forward; foot tips the toe down; lean tips the
    body forward. Rotation about Y: + swings a hanging limb backward.
    """
    rig['root'].location = (0, 0, 21 + P.get('bob', 0))
    rig['root'].rotation_euler = (0, 0, 0)
    rig['torso'].rotation_euler = (0, R(P.get('lean', 10)), R(P.get('twist', 0)))
    rig['neck'].rotation_euler = (0, R(-P.get('lean', 10) * 0.6), 0)
    rig['head'].rotation_euler = (0, R(P.get('nod', 0)), 0)
    for s in 'NF':
        rig['hip' + s].rotation_euler = (0, R(-P['thigh' + s]), 0)
        rig['knee' + s].rotation_euler = (0, R(P['knee' + s]), 0)
        rig['ankle' + s].rotation_euler = (0, R(P.get('foot' + s, 0) - P['thigh' + s] * 0 ), 0)
        rig['sh' + s].rotation_euler = (R(4 if s == 'F' else -4), R(-P['arm' + s] - P.get('lean', 10)), 0)
        rig['el' + s].rotation_euler = (0, R(-P['elbow' + s]), 0)


def run_pose(p):
    a = 2 * math.pi * p
    P = {'lean': 12, 'twist': 7 * math.cos(a)}
    for s, off in (('N', 0.0), ('F', math.pi)):
        b = a + off
        P['thigh' + s] = 6 + 40 * math.cos(b)
        swing = max(0.0, -math.sin(b))  # thigh moving forward: the leg is in the air
        P['knee' + s] = 14 + 100 * swing ** 0.8 + 10 * max(0.0, math.sin(b))
        P['foot' + s] = 10 * swing - 8 * max(0.0, math.cos(b))
        P['arm' + s] = -38 * math.cos(b)
        P['elbow' + s] = 82 + 14 * math.cos(b)
    P['bob'] = 1.3 * abs(math.sin(a)) - 0.4
    return P


POSES = {
    'jump': {'lean': 6, 'bob': 0.5, 'thighN': 80, 'kneeN': 95, 'thighF': -12, 'kneeF': 55, 'footN': 15, 'footF': 25,
             'armN': 155, 'elbowN': 25, 'armF': -35, 'elbowF': 60, 'nod': -6},
    'fall': {'lean': 4, 'bob': 0, 'thighN': 35, 'kneeN': 28, 'thighF': 8, 'kneeF': 40, 'footN': -10, 'footF': 5,
             'armN': 95, 'elbowN': 20, 'armF': 70, 'elbowF': 25, 'nod': 4},
    'land': {'lean': 22, 'bob': -3.2, 'thighN': 52, 'kneeN': 88, 'thighF': 30, 'kneeF': 70, 'footN': -15, 'footF': -8,
             'armN': -25, 'elbowN': 55, 'armF': 30, 'elbowF': 50, 'nod': 6},
    'stand': {'lean': 2, 'bob': 0, 'thighN': 2, 'kneeN': 4, 'thighF': -2, 'kneeF': 4,
              'armN': 6, 'elbowN': 18, 'armF': -4, 'elbowF': 14},
}


# ---------- render ----------
def setup_scene(transparent=True):
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.samples = 24
    sc.cycles.use_denoising = False
    sc.cycles.max_bounces = 2
    sc.cycles.transparent_max_bounces = 16
    sc.cycles.filter_width = 1.0
    sc.render.film_transparent = transparent
    sc.view_settings.view_transform = 'Standard'
    sc.view_settings.look = 'None'
    sc.render.image_settings.file_format = 'PNG'
    sc.render.image_settings.color_mode = 'RGBA'
    sc.render.image_settings.compression = 100
    sc.world = bpy.data.worlds.new('w')
    sc.world.color = (0, 0, 0)
    return sc


def camera(yaw=22, pitch=6, target=(0, 0, 28), scale=64.0):
    cam = bpy.data.cameras.new('cam')
    cam.type = 'ORTHO'
    cam.ortho_scale = scale
    co = bpy.data.objects.new('cam', cam)
    bpy.context.scene.collection.objects.link(co)
    bpy.context.scene.camera = co
    d = 200
    y, p = R(yaw), R(pitch)
    # camera sits on -Y (sees the hero's right side), turned yaw degrees toward the front
    pos = Vector(target) + Vector((math.sin(y) * math.cos(p), -math.cos(y) * math.cos(p), math.sin(p))) * d
    co.location = pos
    co.rotation_euler = (Vector(target) - pos).to_track_quat('-Z', 'Y').to_euler()
    return co, cam


def render(sc, path, w, h):
    sc.render.resolution_x = w
    sc.render.resolution_y = h
    sc.render.resolution_percentage = 100
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)


def frames_list():
    fr = [('run%02d' % i, run_pose(i / 10)) for i in range(10)]
    fr += [('jump', POSES['jump']), ('fall', POSES['fall']), ('land', POSES['land'])]
    return fr


def set_layer(only):
    """Show one part layer; every other part becomes a holdout (cuts it out, keeps occlusion)."""
    for name, objs in PARTS.items():
        for o in objs:
            o.is_holdout = (only is not None and name != only)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', required=True)
    ap.add_argument('--skin', type=int, default=4)
    ap.add_argument('--hair', type=int, default=0)
    ap.add_argument('--outfit', type=int, default=0)
    ap.add_argument('--shot', action='store_true')
    ap.add_argument('--layers', action='store_true')
    ap.add_argument('--only', default='', help='comma list of frame names to render')
    ap.add_argument('--scales', default='1,2', help='pixels per game unit, e.g. 1,2 or 8')
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
    a = ap.parse_args(argv)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    import addon_utils
    addon_utils.enable('cycles')
    sc = setup_scene()
    rig = build(a.skin, a.hair, a.outfit)
    os.makedirs(a.out, exist_ok=True)

    # in-game box: 48 x 64 u (code art box is 41 x 59.5), feet 4 u above the bottom
    co, cam = camera(target=(0, 0, 28), scale=64.0)
    cam.shift_x = 0.0
    want = [s for s in a.only.split(',') if s]
    for name, P in frames_list():
        if want and name not in want:
            continue
        set_pose(rig, P)
        for k in [int(x) for x in a.scales.split(',')]:
            render(sc, os.path.join(a.out, '%s_%dx.png' % (name, k)), 48 * k, 64 * k)
        if a.layers:
            for layer in PARTS:
                set_layer(layer)
                render(sc, os.path.join(a.out, 'layer_%s_%s_2x.png' % (layer, name)), 96, 128)
            set_layer(None)

    if a.shot:
        set_pose(rig, run_pose(0.75))
        co2, cam2 = camera(yaw=30, pitch=8, target=(1.5, 0, 27), scale=60.0)
        sc.cycles.samples = 64
        render(sc, os.path.join(a.out, 'hero_shot_512.png'), 512, 512)


if __name__ == '__main__':
    main()
