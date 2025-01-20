import "reflect-metadata";
import { AppComponent } from "./app/app.component";
import { Plateform } from "./core/plateform";

/*
  FIRST:  Revoir le systéme hierarchique de dépendance (la construction)
  le service component de base posséde ses propre enfant. 
  Pour avoir donc accés au enfant dans un parent
  j'appellerai le container parent de l'enfant et ainsi de suite. 
  Cela me permettra d'avoir un controle sur le scope. 
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
