
function initMobileMenu() {
    const menuToggle = document.getElementById('menu-toggle');
    const mainNav = document.getElementById('main-nav');
    const menuIcon = document.getElementById('menu-icon');

    if (menuToggle && mainNav && menuIcon) {
        menuToggle.addEventListener('click', () => {
            
            if (mainNav.classList.contains('active')) {
                closeMobileMenu(); 
            } else {
                mainNav.classList.add('active');
                document.body.classList.add('no-scroll');
                menuIcon.classList.remove('fa-bars');
                menuIcon.classList.add('fa-xmark');
                menuToggle.setAttribute('aria-expanded', 'true');
            }
            
            applyClickFeedback(menuToggle);
        });
    }
}


function highlightActiveLink() {
    const currentPath = window.location.pathname;
    let currentPageFile = currentPath.substring(currentPath.lastIndexOf('/') + 1);
    
    if (currentPageFile === '' || currentPageFile === '/') {
        currentPageFile = 'index.html'; 
    }

    const navLinks = document.querySelectorAll('#main-nav ul li a');

    // 💡 NOUVEAUTÉ : D'abord, retirer la classe active de tous les liens
    navLinks.forEach(link => {
        link.classList.remove('active-page');
    });

    // Ensuite, appliquer la classe active uniquement au lien correspondant
    navLinks.forEach(link => {
        const linkFile = link.getAttribute('href'); 
        if (linkFile === currentPageFile) {
            link.classList.add('active-page');
        }
    });
}



let lastScrollY = 0;
let mainHeader = null; 

function handleScrollHeader() {
    if (!mainHeader) {
        mainHeader = document.getElementById('header-placeholder') 
                   ? document.getElementById('header-placeholder').querySelector('#main-header') 
                   : null;

        if (!mainHeader) return;
    }

    const currentScrollY = window.scrollY;

    if (currentScrollY > lastScrollY && currentScrollY > 100) { 
        mainHeader.classList.add('header-hidden');
    } 
    else if (currentScrollY < lastScrollY) {
        mainHeader.classList.remove('header-hidden');
    }

    lastScrollY = currentScrollY;
}


function initHeaderInteractivity() {
    const btnConnexion = document.querySelector('.btn-connexion');
    if (btnConnexion) {
        btnConnexion.addEventListener('click', function() {
            applyClickFeedback(this);
        });
    }

    initMobileMenu(); 

    const logoLink = document.querySelector('.header-left a'); 
    if (logoLink) {
        logoLink.addEventListener('click', function(event) {
            event.preventDefault(); // <-- Stop au rechargement classique
            applyClickFeedback(this.querySelector('.logo') || this);
            navigateTo(logoLink.getAttribute('href')); // <-- Navigation fluide
        });
    }
}



document.addEventListener('DOMContentLoaded', () => {
    loadComponent('header-placeholder', 'assets/components/header.html', () => {
        initHeaderInteractivity();
        highlightActiveLink();

        document.querySelectorAll('#main-nav a').forEach(link => {
        link.addEventListener('click', (event) => {
            const url = link.getAttribute('href');
            
            // Si c'est un lien interne (pas un lien externe ou un # ancre)
            if (url && !url.startsWith('#') && !url.startsWith('http')) { 
                event.preventDefault(); // Bloque la navigation classique
                navigateTo(url);        // Utilise la navigation fluide
                closeMobileMenu();      // Ferme le menu après le clic
            }
        });
    });
    });
    
    loadComponent('footer-placeholder', 'assets/components/footer.html');
    
    loadMembers();

    document.addEventListener('click', (event) => {
        const menuToggle = document.getElementById('menu-toggle');
        const mainNav = document.getElementById('main-nav');
        
        if (mainNav && mainNav.classList.contains('active')) {
            
            const isClickInsideMenu = mainNav.contains(event.target);
            const isClickOnToggle = menuToggle.contains(event.target);
            
            if (!isClickInsideMenu && !isClickOnToggle) {
                closeMobileMenu();
            }
        }
    });
    
    window.addEventListener('scroll', handleScrollHeader);
});


function applyClickFeedback(element) {
    const feedbackColor = 'rgba(0, 0, 0, 0.2)'; // Couleur du flash
    const duration = 300; // 300 millisecondes (0.3s)

    // 1. Sauvegarder la couleur de transition existante (si elle existe)
    const originalTransition = element.style.transition;
    
    // 2. Appliquer la couleur immédiatement (style inline = priorité absolue)
    element.style.backgroundColor = feedbackColor;
    
    // 3. (Optionnel mais recommandé) Rendre la transition instantanée pour le retour
    element.style.transition = 'background-color 0.3s ease-out';

    // 4. Retirer la couleur après le délai défini
    setTimeout(() => {
        // Supprimer la couleur inline pour que le CSS reprenne le contrôle
        element.style.backgroundColor = ''; 
        
        // Restaurer la transition originale après un petit délai
        setTimeout(() => {
            element.style.transition = originalTransition;
        }, 300); // 300ms pour s'assurer que l'effet est parti avant de restaurer
        
    }, duration);
}

function closeMobileMenu() {
    const mainNav = document.getElementById('main-nav');
    const menuToggle = document.getElementById('menu-toggle');
    const menuIcon = document.getElementById('menu-icon');

    if (mainNav && mainNav.classList.contains('active')) {
        mainNav.classList.remove('active');
        document.body.classList.remove('no-scroll');
        
        // Remettre l'icône à 'fa-bars' (menu)
        if (menuIcon) {
            menuIcon.classList.remove('fa-xmark');
            menuIcon.classList.add('fa-bars');
        }
        
        // Mettre à jour l'état ARIA
        if (menuToggle) {
            menuToggle.setAttribute('aria-expanded', 'false');
        }
    }
}


async function navigateTo(url) {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) {
        // Fallback: Si le conteneur n'existe pas, on recharge normalement
        window.location.href = url;
        return;
    }
    
    try {
        const response = await fetch(url);
        const html = await response.text();
        
        // 1. Parser le contenu et extraire uniquement la nouvelle section principale
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        const newMainContent = tempDiv.querySelector('#main-content');

        if (newMainContent) {
            // 2. Remplacer l'ancien contenu par le nouveau
            mainContent.innerHTML = newMainContent.innerHTML;
            
            // 3. Mettre à jour l'URL sans recharger la page
            history.pushState(null, '', url);
            
            if (url.includes('membres.html')) {
                loadMembers(); 
            }

            if (url.includes('jeu.html')) {
                initGame(); 
            }

            // 5. Mettre à jour l'état actif dans la navigation
            highlightActiveLink();

            // 6. Remonter en haut
            window.scrollTo(0, 0); 
        } else {
             window.location.href = url; // Rechargement en cas d'erreur de parsing
        }

    } catch (error) {
        console.error('Erreur de navigation fluide :', error);
        window.location.href = url; // Rechargement en cas d'échec
    }
}


function initGame() {
    if (typeof startGameEngine === 'function') { 
        startGameEngine(); 
    }
}