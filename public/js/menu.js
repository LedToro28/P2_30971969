// Espera a que el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', () => {
    const menuToggle = document.querySelector('.menu-toggle');
    const mainNav = document.getElementById('main-nav');

    if (menuToggle && mainNav) { // Verifica que los elementos existen
        menuToggle.addEventListener('click', () => {
            // Alternar la clase 'active' en el menú de navegación
            mainNav.classList.toggle('active');

            // (Opcional) Cambiar el icono del botón (hamburguesa <-> cerrar)
            const icon = menuToggle.querySelector('ion-icon');
            if (mainNav.classList.contains('active')) {
                icon.setAttribute('name', 'close-outline'); // Icono de cerrar
                 menuToggle.setAttribute('aria-label', 'Cerrar menú'); // Actualizar para accesibilidad
            } else {
                icon.setAttribute('name', 'menu-outline'); // Icono de hamburguesa
                 menuToggle.setAttribute('aria-label', 'Abrir menú'); // Actualizar para accesibilidad
            }
        });

        // (Opcional) Cerrar el menú si haces clic en un enlace (útil en móvil)
        const navLinks = mainNav.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                mainNav.classList.remove('active');
                 const icon = menuToggle.querySelector('ion-icon'); // Restablecer icono
                 icon.setAttribute('name', 'menu-outline');
                 menuToggle.setAttribute('aria-label', 'Abrir menú');
            });
        });

    }
});