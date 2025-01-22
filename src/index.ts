import "reflect-metadata";
import { AppComponent } from "./app/app.component";
import { Plateform } from "./core/plateform";

/*
  FIRST: Optimissation de la mémoire également ! 
  Chaque component posséde son propre service. 
  les component sont totalement indépendant. Je ne peux pas avoir accés par exemple
  via l'injecteur de dépendance au childcomponent via le parent. Je ne peux y avoir
  que via @ViewChild et uniquement si je lui est explicité une référence.
  Idem pour les élements standard (a spécifier). Je pense que cela se faira au niveau
  du template (#ref). Ils sont déja dans le dom, pas besoin d'être mémoriser. 
  On verra pour le standalone plus tard. 


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
