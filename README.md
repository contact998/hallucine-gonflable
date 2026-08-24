# @hallucine/gonflable

Le module de la **tente gonflable X**, en un seul exemplaire, installé par le site public *et* par le CRM.

Avant lui, les deux outils avaient divergé en silence : le calculateur du CRM interdisait trois compositions que le site vendait déjà. Le commercial et le client ne parlaient plus de la même tente. Ce paquet existe pour que cela ne puisse plus arriver.

## Ce qu'il contient

| Fichier | Rôle |
|---|---|
| `composition.ts` | la composition d'une tente et les règles de fabrication qui la valident |
| `config.ts` | le code de configuration, celui qui voyage dans les devis |
| `couleurs.ts` | les teintes disponibles |
| `pose.ts` | les modes de pose |
| `visuel.ts` | la pose d'un visuel sur une paroi |
| `vue3d.ts` + `Viewer.tsx` | le visualiseur 3D |

## Ce qu'il ne contient pas, volontairement

**Aucun prix, aucun coût, aucune marge.** Ils appartiennent au catalogue du CRM. Le module sait seulement fabriquer les clés qui permettent de les y lire — il n'a donc aucun moyen d'exposer un prix d'achat à un client. C'est ce qui autorise ce dépôt à être public.

## Installation

Pas de registre npm : le paquet s'installe **depuis GitHub, à une version marquée**.

```
"@hallucine/gonflable": "github:contact998/hallucine-gonflable#v0.37.0"
```

`react` et `three` sont des dépendances de **pair**, et optionnelles : chaque application fournit les siennes, on n'embarque pas un second exemplaire de three.js.

## Les trois règles qui cassent la production quand on les oublie

**1. Le site et le CRM restent sur exactement la même version.** Mettre à jour l'un sans l'autre, c'est recréer la divergence que ce module supprime — et ça dérive tout seul, sans que rien ne le signale. Le 11/08/2026 le site est resté en `v0.6.0` pendant que le CRM passait en `v0.7.0`. Devant tout écart de comportement entre le configurateur du site et le composeur du CRM, **comparer les deux `package.json` avant toute autre hypothèse**.

**2. `dist/` est versionné. Toute modification de `src/` exige `npm run build` dans le même commit.** Le `dist/` a été mis sous contrôle de version — et le script `prepare` retiré — parce qu'un paquet git sans `dist/` force pnpm à réinstaller les devDependencies chez le consommateur, sans lockfile, en résolvant au plus frais. Le 08/08/2026 une publication de `nanoid` vieille de seize heures a fait échouer la politique d'approvisionnement de Railway et bloqué toutes les mises en ligne du site. `src/dist-a-jour.test.ts` recompile dans un dossier temporaire et compare, pour qu'un `dist/` oublié tombe au test plutôt qu'en production.

**3. Les imports relatifs portent leur `.js`, et le `tsconfig` reste en `NodeNext`.** Le paquet est `"type": "module"` et `tsc` recopie les spécificateurs tels quels. Un `export * from "./composition"` sans extension passe le build du site (Vite tolère) mais **tue le conteneur au démarrage** : le serveur est construit avec `--packages=external`, donc Node résout le paquet lui-même à l'exécution, et Node ESM exige l'extension. Le symptôme côté Railway est trompeur — déploiement en échec, build réussi et image poussée, aucune ligne de log d'exécution. Ne pas revenir à `"bundler"` : c'est ce réglage qui fait refuser à la compilation ce que Node refuserait à l'exécution.

## Commandes

```bash
npm run check   # typage, sans émettre
npm test        # vitest
npm run build   # produit dist/ — obligatoire avant tout commit touchant src/
```

## Publier une version

1. Modifier `src/`, puis `npm run build` — **dans le même commit**.
2. `npm run check && npm test`.
3. Monter le champ `version` du `package.json`.
4. Marquer le commit (`vX.Y.Z`) et pousser le tag.
5. Mettre à jour la référence **dans le site et dans le CRM**, ensemble.
