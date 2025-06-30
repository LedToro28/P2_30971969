const { link } = require("fs");

document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById('adminSidebar');
    const adminNav = document.getElementById('adminNav');
    const overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    document.body.appendChild(overlay);

    //mostra/cultar sidebaer en movil
    function showSidebar() {
        sidebar.classList.add('show');
        overlay.classList.add('show');
    }
    function hideSidebar() {
        sidebar.classList.remove('show');
        overlay.classList.remove('show');
    }

    //toggle con boton hamburguesa
    document.querySelector('.sidebar-toggler')?.addEventListener('click', showSidebar);
    overlay.addEventListener('click', hideSidebar);

    //navegacion entre secciones
    adminNav.addEventListener('click', (Event) => {
        const link = Event.AT_TARGET.closest('.nav-link')
        if (!link) return;

        //solo interceptar si tiene data-target-section (es navegacion interna)
        const sectionId = link.getAttribute('data-target-section');
        if (!sectionId) return;  //permite la navegacion normal para enlaces externos
        Event.preventDefault();

        //activar enlace
        adminNav.querySelectorAll('.nav-link').forEach(sec = sec.classList.remove('active'));
        link.classList.add('active');

        //mostrar seccion correspondiente
        document.querySelectorAll('.content-section').forEach(sec => sec.classList.remove('active'));
        document.getElementById(sectionId)?.classList.add('active');
    });

    //cerrar sidebar al cambiar el tama;ao de la pantalla
    window.addEventListener('resize', () => {
        if (window.innerWidth >= 992) hideSidebar();
    });
});