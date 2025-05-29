import "reflect-metadata";
import { AppComponent } from "./app/app.component";
import { Plateform } from "./core/plateform";

/*
  Au lieu de l'utilisatiion d'un contexte root, il serrait préférable de créer un namesace
  host (pour les directive) permettant de récupérer le component parent et l'injecter en tant que context. 

  Ce qu'il me manque c'est le systéme de RXJS.
  C'est à dire avoir la possibilité de créer des subjects réagissant au déclenchement d'un
  observer. 
  
  Création d'une abstraction au niveau des directives (via une interface), et permettre
  la personnalisation des selectors attaché aux différentes directives.

  // Ajout plus tard de la gestions des styless css 

  // LIMITATIONS  //
  Pour pouvoir modifier un element d'une liste de signaux, on peut le faire directement dans le update du signal. :/ 
  Les slot sont déja intégré indirectement : https://developer.mozilla.org/en-US/docs/Web/HTML/Element/slot
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  // Regarder si je peux pas by passe les limitations en utilisan les slot pour les viewchild de même componant imbriqués... 
  // Si celaa fonctionne on peut déja contourner certain probléme lié au *for
  

  ViewhChild: Enregistrer l'intégralité des éléments possédant un ref en plus des component. Passer l'élément principal 
              pour utiliser querySelectorAll ....  

  First: https://github.com/angular/angular/blob/main/packages/core/src/platform/platform_ref.ts#L41 -> bootstrapModule
         Compilation (comportement différents), chargement des ressources ect... 
         NgModuleFactory qui retourne un NgModuleRef
  Second: https://github.com/angular/angular/blob/main/packages/core/src/platform/bootstrap.ts#L73
           


  Formulaire: https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/attachInternals#browser_compatibility
              https://web.dev/articles/user-valid-and-user-invalid-pseudo-classes?hl=fr
              https://w3c.github.io/webcomponents-cg/2022.html#form-associated-custom-elements
              
  Custom element: https://developer.mozilla.org/en-US/docs/Web/API/CustomElementRegistry/upgrade
                  https://developer.mozilla.org/en-US/docs/Web/API/CustomElementRegistry/whenDefined#examples
                  

  Créer une erreur si le selecteur du component ne correspond au pattern (to-minuscule-whith-tiret)

  Les imports au niveau des components me servirons juste à restreindre 

  FIRST: 
  Optimissation de la mémoire également ! 
  Je ne peux y avoir que via @ViewChild. 
  Sur un element native, je peux spécifier une reference ou une classe pour 
  selectionner des élements. 
  Idem pour les élements standard (a spécifier). Je pense que cela se faira au niveau
  du template (#ref). Ils sont déja dans le dom, pas besoin d'être mémoriser. 
  On verra pour le standalone plus tard. Si j'ai besoin d'identifier des composnts 
  distincte mais possédant la même classe, j'utiliserais la reférence pour les identifier. 
  Cela ne concerne uniquemeent que le premier niveau
  Pour la recherche par reference plus de robustesse sur le nom (string tout le temps en minuscule)
  Faire attention à l'odre de rendu des components 


  le role de l'ElementRef est de conserver une reférence au dom. Que l'élément soit détruire ou non. 
*/

/*
  Je l'utiliserai au destroy pour automatiser le desabonnement de chaque événement. 
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

// Pour le liste dans les signaux. Si l'on veut que les modification
// d'un element individuel soi refléflé sur l'interface alors on devra spécifier une liste de signaux.

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

/*
  Attributes binding vs propery binding
  Lorsque on bind, je regarderais si l'attribut correspond à un attributs du dom (src, disables ect...).
  Je me baserais sur leur typage de base (src = string, disables = boolean).
  Sinon à voir pour les attribut... 
*/
