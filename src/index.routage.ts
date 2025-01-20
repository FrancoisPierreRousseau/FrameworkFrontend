//////////////////////////////////////////////////////////////////////////
// ROUTAGE
//////////////////////////////////////////////////////////////////////////

// Fonction pour rendre le contenu en fonction de la route
function renderPage(page: string) {
  const content = document.getElementById("content");
  if (page === "home") {
    content!.innerHTML = "<h1>Bienvenue sur la page d'accueil!</h1>";
  } else if (page === "about") {
    content!.innerHTML = "<h1>À propos de nous</h1>";
  } else {
    content!.innerHTML = "<h1>Page non trouvée</h1>";
  }
}

// Fonction pour gérer la navigation
function navigate(page: string) {
  window.history.pushState({}, "", page);
  renderPage(page);
}

// Écouter les clics sur les liens de navigation
document
  .getElementById("homeLink")
  ?.addEventListener("click", () => navigate("home"));
document
  .getElementById("aboutLink")
  ?.addEventListener("click", () => navigate("about"));

// Gérer l'historique de navigation
window.addEventListener("popstate", () => {
  renderPage(window.location.pathname.substring(1));
});

// Rendu initial
renderPage(window.location.pathname.substring(1) || "home");
