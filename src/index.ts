import "reflect-metadata";
import { AppComponent } from "./app/app.component";
import { Plateform } from "./core/plateform";

/*
  Formulaire: https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/attachInternals#browser_compatibility
  
  FIRST: Optimissation de la mémoire également ! 
  Je ne peux y avoir que via @ViewChild. 
  Sur un element native, je peux spécifier une reference ou une classe pour 
  selectionner des élements. 
  Idem pour les élements standard (a spécifier). Je pense que cela se faira au niveau
  du template (#ref). Ils sont déja dans le dom, pas besoin d'être mémoriser. 
  On verra pour le standalone plus tard. Si j'ai besoin d'identifier des composnts 
  distincte mais possédant la même classe, j'utiliserais la reférence pour les identifier. 


  Faire attention à l'odre de rendu des components 
*/

// Utilisation de decorateur
// Conserver les routes dans une classe statique.
// Gérer le processus de construction du routing pour rendre la component final en créeant des
// étapes, en fonction de l'url tappé par l'utilisateur.

// Monopage doit gérer la destruction des composants
// Le routage doit supprimer toute l'anciienne page
// A chaque disconecter supprimer les événements

// Normalement c'est un module de renseigner, pour l'instant je me concentre
// sur un component

new Plateform(AppComponent).render("app");

// Un mecansime intéréssant et de pouvoir souscrir à un événement du renderer via un observer/subscrible

// lA SOLUTION
/*
    J'aurais un événement keydown au niveau du document centralisant tout les événement keydown
    Cela serra géré par un keydownEventService utilisant le renderer. 
    Quand je ferais un listen ou autre, j'enregistrer dans map<>, le handler, le raccourcis, l'élément et la classe
    pour choisir le bon déclencheur. this correspond à l'élement courrant (celui utilisé pour la selection) et target, l'élément focusable. 
    Si j'attache au niveau d'un element enfant, je pourrait faire le choix de bloquer la propa jusqu'au document.  
*/

/*
  Reflechir à la réaactivité (computed de vue.js par exemple).
  On s'en fou de réagir dés qu'un composant mute, on veut juste savoir si une propriété à été 
  muté... non ?  
  Les propriété calculé sont renvoyé uniquement si une de leur reférence (source) change. 
*/
