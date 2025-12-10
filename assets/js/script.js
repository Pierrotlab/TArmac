
function initMobileMenu() {
    const menuToggle = document.getElementById('menu-toggle');
    const mainNav = document.getElementById('main-nav');
    const menuIcon = document.getElementById('menu-icon');

    if (menuToggle && mainNav && menuIcon) {
        menuToggle.addEventListener('click', () => {
            mainNav.classList.toggle('active');

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
    setTimeout(() => {
        initMobileMenu(); 
        highlightActiveLink();
        loadMembers();
    }, 100); 
    window.addEventListener('scroll', handleScrollHeader);
});