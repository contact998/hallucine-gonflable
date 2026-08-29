/*
 * Le chargeur de modèles 3D, avec de quoi les déplier.
 *
 * Les fichiers servis depuis R2 sont repliés (`EXT_meshopt_compression`) : ils
 * pèsent deux fois et demie moins, et un `GLTFLoader` nu ne sait pas les lire.
 * Il ne s'en plaint pas d'une manière qu'on remarque — la promesse est rejetée,
 * la scène reste vide, et rien d'autre dans l'application ne change. D'où ce
 * fichier : PERSONNE ne construit un `GLTFLoader` à la main dans ce module,
 * tout le monde passe par ici.
 *
 * Le décodeur est un singleton de three (un module WebAssembly, monté une fois
 * pour la page) : le partager entre les visualiseurs évite d'en compiler un par
 * scène. Il exige `'wasm-unsafe-eval'` dans la CSP de l'application qui
 * l'héberge — sans quoi le navigateur refuse de le monter, avec pour seule
 * trace un message dans la console.
 */
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
/** Un `GLTFLoader` qui sait lire les modèles repliés de R2. */
export const chargeurGLB = () => new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
