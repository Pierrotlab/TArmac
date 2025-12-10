async function loadComponent(componentId, filePath) {
    const placeholder = document.getElementById(componentId);

    if (placeholder) {
        try {
            const response = await fetch(filePath);
            const html = await response.text();
            
            placeholder.innerHTML = html;
        } catch (error) {
            console.error(`Erreur lors du chargement du composant ${filePath} :`, error);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadComponent('header-placeholder', 'assets/components/header.html');
    loadComponent('footer-placeholder', 'assets/components/footer.html');
});





function createMemberCard(member) {
    const card = document.createElement('div');
    card.className = 'member-card';

    card.innerHTML = `
        <div class="card">
            <div class="card-front">
                <img src="assets/images/membres/${member.photo}" alt="Photo de ${member.prenom} ${member.nom}">
                <div class="member-info-footer">
                    <h4>${member.prenom} ${member.nom}</h4>
                    <p>${member.poste}</p>
                </div>
            </div>
            
            <div class="card-back">
                <div class="back-content">
                    <h3>${member.poste}</h3>
                    <h4>${member.prenom} ${member.nom}</h4>
                    <p class="description-back">${member.description}</p>
                </div>
            </div>

        </div>
    `;
    return card;
}

async function loadMembers() {
    const container = document.getElementById('members-container');
    if (!container) return;

    try {
        const response = await fetch('assets/data/membres.json');
        
        if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status}`);
        }
        
        const polesData = await response.json();
        
        for (const poleName in polesData) {
            if (polesData.hasOwnProperty(poleName)) {
                
                const poleTitle = document.createElement('h2');
                poleTitle.className = 'pole-title';
                poleTitle.textContent = poleName;
                container.appendChild(poleTitle);

                const poleGrid = document.createElement('section');
                poleGrid.className = 'member-grid';
                
                polesData[poleName].forEach(member => {
                    const card = createMemberCard(member);
                    poleGrid.appendChild(card);
                });

                container.appendChild(poleGrid);
            }
        }

        initMemberInteractivity();

    } catch (error) {
        console.error("Erreur lors du chargement des membres :", error);
        container.innerHTML = "<p>Désolé, impossible de charger la liste des membres pour le moment.</p>";
    }
}


function initMemberInteractivity() {
    document.querySelectorAll('.member-card').forEach(card => {
        
        // ===================================
        // GESTION DU CLIC/TOUCHER (Ouverture permanente/Fermeture)
        // ===================================
        card.addEventListener('click', (event) => {
            
            // Si l'élément cliqué n'est pas la carte elle-même, on s'assure de cibler le parent
            // if (event.target !== card) {
            //     return; // Ignorer les clics sur les enfants si le problème persiste
            // }

            // Détecte si la carte est active AVANT le basculement
            const wasActive = card.classList.contains('active'); 
            
            // Fermer toutes les autres cartes actives (pour l'effet "une seule carte ouverte")
            document.querySelectorAll('.member-card.active').forEach(otherCard => {
                // Ferme toutes les cartes SAUF celle qui est cliquée.
                if (otherCard !== card) {
                    otherCard.classList.remove('active');
                    otherCard.classList.remove('hover-active');
                }
            });

            // Bascule l'état de la carte cliquée
            if (wasActive) {
                // Si elle était active, on la ferme
                card.classList.remove('active');
            } else {
                // Si elle était fermée, on l'ouvre
                card.classList.add('active');
            }
            
            // Sécurité supplémentaire
            card.classList.remove('hover-active'); 
            
            // Garder stopPropagation peut être nécessaire, mais si le problème persiste, 
            // vous pouvez essayer de le commenter :
            event.stopPropagation(); 
        });


        // ===================================
        // GESTION DU SURVOL (Hover pour PC uniquement)
        // ===================================

        // Survol de la souris (mouseenter)
        card.addEventListener('mouseenter', () => {
            // Si la carte N'EST PAS active (verrouillée par un clic), on tourne
            if (!card.classList.contains('active')) {
                card.classList.add('hover-active');
            }
        });

        // Souris qui quitte (mouseleave)
        card.addEventListener('mouseleave', () => {
            // Retirer l'effet de survol
            card.classList.remove('hover-active');
        });
    });
}


