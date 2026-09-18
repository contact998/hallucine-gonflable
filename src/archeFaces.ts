/*
 * Les deux faces imprimées d'une arche : où elles sont sur le modèle, et
 * comment le visuel s'y projette.
 *
 * Le modèle du fournisseur n'a NI coordonnées de texture NI découpe en pièces :
 * c'est un tube nu (voir archeGlb.ts). Impossible, donc, de poser une image
 * « sur le bandeau » comme on la pose sur un pan de tente, qui porte son
 * gabarit. On fait comme l'atelier : une PROJECTION PLANE. Vue de face, l'arche
 * tient dans un rectangle largeur × hauteur ; la maquette du client est dessinée
 * dans ce rectangle, et chaque point de la face avant prend la couleur du point
 * de la maquette qui est devant lui.
 *
 * Quelle face est « avant » ? Pas la normale : la CAO en a retourné une partie
 * vers l'intérieur du tube (mesuré le 18/09/2026 sur le GLB droite : 14 183
 * triangles sur 56 422 ont des normales contraires à leur sens de parcours).
 * On lit la POSITION : l'axe du boudin est dans le plan y = 0 (le chargeur
 * recentre le modèle), donc un triangle franchement devant ce plan appartient à
 * la face avant, franchement derrière à la face arrière, et entre les deux ce
 * sont les flancs — le dessus, le dessous, l'intérieur de l'ouverture — qui
 * gardent la teinte unie.
 *
 * Chaque maille est découpée une fois, au chargement, en trois groupes de
 * triangles — flanc, avant, arrière — qui reçoivent chacun leur matière.
 *
 * ⚠️ Le fichier porte aussi une MEMBRANE : une toile plane, dans le plan
 * médian y = 0, tendue dans l'ouverture entre les deux pans coupés intérieurs
 * (mesuré le 18/09/2026 sur le GLB droite : 58 triangles, un trapèze de z 1,66 à
 * 2,15 m). Rien de tel sur l'arche réelle ni sur les planches Bayes — c'est une
 * face interne de l'export CAO. Vue de face, elle bouchait le haut du passage
 * d'un panneau de la teinte. Aucune surface du boudin n'est à la fois dans le
 * plan médian ET parallèle à lui (les flancs y sont perpendiculaires) : ces
 * triangles-là sont retirés de l'index, et ne se dessinent plus.
 */
import * as THREE from "three";
import type { MesuresArche } from "./arche.js";

/** Les trois matières d'une arche, dans l'ordre des groupes de triangles. */
export const GROUPE_FLANC = 0;
export const GROUPE_AVANT = 1;
export const GROUPE_ARRIERE = 2;

/**
 * Part de la demi-profondeur au-delà de laquelle un triangle appartient à une
 * face : 0,5, c'est ± 60° autour de l'axe avant sur un boudin rond — ce que
 * l'œil lit comme « la face » de l'arche, et ce que Bayes imprime.
 */
export const SEUIL_FACE = 0.5;

/** Un triangle de la membrane médiane (voir l'en-tête) : ses trois sommets à
 *  moins d'un dixième de demi-profondeur du plan y = 0, et sa normale le long
 *  de y — à plat dans le plan médian. */
export function estMembrane(profondeurs: readonly [number, number, number], normaleY: number): boolean {
  return profondeurs.every((s) => Math.abs(s) < 0.1) && Math.abs(normaleY) > 0.9;
}

/** Le groupe d'un triangle, d'après la profondeur de son centre (−1 = tout
 *  devant, +1 = tout derrière). La caméra de face est côté y négatif. */
export function groupeDeProfondeur(s: number): number {
  if (s < -SEUIL_FACE) return GROUPE_AVANT;
  if (s > SEUIL_FACE) return GROUPE_ARRIERE;
  return GROUPE_FLANC;
}

/**
 * Découpe chaque maille du groupe en flanc / avant / arrière et pose la
 * projection plane : `uv` pour la face avant, `uv1` — le même, en miroir — pour
 * la face arrière, qui se lit depuis l'autre côté.
 *
 * À appeler UNE fois, sur le groupe tel que `chargerArcheGlb` le rend : centré
 * en x et en y, pieds à z = 0, avant toute mise à l'échelle. Les mesures sont
 * celles du chargeur, dans le repère de ce groupe.
 */
export function preparerFacesArche(groupe: THREE.Object3D, m: MesuresArche): void {
  groupe.updateMatrixWorld(true);
  const versGroupe = groupe.matrixWorld.clone().invert();
  const demiProfondeur = m.profondeurMM / 2;
  const deja = new Set<THREE.BufferGeometry>();
  const p = new THREE.Vector3();

  groupe.traverse((o) => {
    const maille = o as THREE.Mesh;
    if (!maille.isMesh) return;
    /* Une géométrie partagée par deux mailles recevrait deux projections
       contradictoires : la seconde travaille sur sa copie. */
    if (deja.has(maille.geometry)) maille.geometry = maille.geometry.clone();
    const geo = maille.geometry;
    deja.add(geo);

    const rel = versGroupe.clone().multiply(maille.matrixWorld);
    const pos = geo.getAttribute("position");
    const n = pos.count;
    const uv = new Float32Array(n * 2);
    const uv1 = new Float32Array(n * 2);
    const profondeur = new Float32Array(n);
    const dansGroupe = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      p.fromBufferAttribute(pos, i).applyMatrix4(rel);
      p.toArray(dansGroupe, i * 3);
      const u = p.x / m.largeurMM + 0.5;
      const v = p.z / m.hauteurMM;
      uv[2 * i] = u;
      uv[2 * i + 1] = v;
      uv1[2 * i] = 1 - u;
      uv1[2 * i + 1] = v;
      profondeur[i] = p.y / demiProfondeur;
    }
    geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    geo.setAttribute("uv1", new THREE.BufferAttribute(uv1, 2));

    /* Les triangles, rangés par groupe : trois plages contiguës de l'index. */
    const index = geo.index ? Array.from(geo.index.array as ArrayLike<number>) : Array.from({ length: n }, (_, i) => i);
    const parGroupe: number[][] = [[], [], []];
    const sa = new THREE.Vector3(), sb = new THREE.Vector3(), sc = new THREE.Vector3();
    for (let t = 0; t + 2 < index.length; t += 3) {
      const a = index[t], b = index[t + 1], c = index[t + 2];
      sa.fromArray(dansGroupe, a * 3);
      sb.fromArray(dansGroupe, b * 3).sub(sa);
      sc.fromArray(dansGroupe, c * 3).sub(sa);
      const normale = sb.cross(sc);
      const longueur = normale.length();
      if (longueur > 0 && estMembrane([profondeur[a], profondeur[b], profondeur[c]], normale.y / longueur)) continue;
      const s = (profondeur[a] + profondeur[b] + profondeur[c]) / 3;
      parGroupe[groupeDeProfondeur(s)].push(a, b, c);
    }
    const trie = parGroupe.flat();
    geo.setIndex(n > 65535 ? new THREE.BufferAttribute(new Uint32Array(trie), 1) : new THREE.BufferAttribute(new Uint16Array(trie), 1));
    geo.clearGroups();
    let debut = 0;
    parGroupe.forEach((liste, g) => {
      if (liste.length) geo.addGroup(debut, liste.length, g);
      debut += liste.length;
    });
  });
}

/**
 * La matière d'une arche : un tissu mat, vu des deux côtés, dont la normale
 * regarde TOUJOURS la caméra.
 *
 * Le fichier a des normales retournées par endroits (voir l'en-tête). En double
 * face, three.js oriente la normale d'après le sens de parcours du triangle —
 * juste quand normale et parcours s'accordent, faux sinon : ces triangles-là
 * sortaient sombres, en plaques. Sur une surface fermée, tout ce qu'on voit fait
 * face à l'œil : on retourne donc la normale qui s'en détourne. La retouche se
 * pose DANS le bloc d'origine de three.js ; si une version future le réécrit,
 * elle ne s'applique plus et la matière retombe sur le rendu standard — jamais
 * sur un shader cassé.
 */
export function matiereArche(): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.82, metalness: 0, side: THREE.DoubleSide });
  m.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <normal_fragment_begin>",
      THREE.ShaderChunk.normal_fragment_begin.replace(
        "vec3 normal = normalize( vNormal );",
        "vec3 normal = normalize( vNormal );\n\tif ( dot( normal, vViewPosition ) * faceDirection < 0.0 ) normal = - normal;",
      ),
    );
  };
  m.customProgramCacheKey = () => "arche-normale-vers-oeil";
  return m;
}
