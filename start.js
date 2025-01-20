import { exec } from "child_process";

// Ouvrir Chrome avec l'URL de votre application
exec('start chrome http://localhost:3000', (err) => {
    if (err) {
        console.error(`Erreur lors de l'ouverture de Chrome: ${err}`);
    }
});

// Démarrer un serveur simple avec http-server ou live-server
exec('npx http-server-spa dist ./src/index.html 3000', (err) => {
    if (err) {
        console.error(`Erreur lors du démarrage du serveur: ${err}`);
    }
});

