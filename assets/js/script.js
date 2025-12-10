
function initMobileMenu() {
    const menuToggle = document.getElementById('menu-toggle');
    const mainNav = document.getElementById('main-nav');
    const menuIcon = document.getElementById('menu-icon');

    if (menuToggle && mainNav && menuIcon) {
        menuToggle.addEventListener('click', () => {
            mainNav.classList.toggle('active');
            applyClickFeedback(menuToggle);

            if (mainNav.classList.contains('active')) {
                menuIcon.classList.remove('fa-bars');
                menuIcon.classList.add('fa-xmark');
            } else {
                menuIcon.classList.remove('fa-xmark');
                menuIcon.classList.add('fa-bars');
            }

            const isExpanded = menuToggle.getAttribute('aria-expanded') === 'true' || false;
            menuToggle.setAttribute('aria-expanded', !isExpanded);
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



document.addEventListener('DOMContentLoaded', () => {
    
    // ... (Votre fonction setTimeout) ...

    setTimeout(() => {
        initMobileMenu(); 
        highlightActiveLink();
        loadMembers();
        
        // 💡 AJOUT : Gestion du feedback pour les autres éléments cliquables du header
        
        // 1. Bouton de Connexion
        const btnConnexion = document.querySelector('.btn-connexion');
        if (btnConnexion) {
            btnConnexion.addEventListener('click', function() {
                applyClickFeedback(this);
                // Ajoutez ici votre logique spécifique au bouton de connexion (ex: redirection, modal)
            });
        }
        
    }, 100); 
    
    // ... (Votre écouteur de scroll) ...
    
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