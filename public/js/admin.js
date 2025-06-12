const { link } = require("fs");

document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById('adminSidebar');
    const adminNav = document.getElementById('adminNav');
    const overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    document.body.appendChild(overlay);


    function showSidebar() {
        sidebar.classList.add('show');
        overlay.classList.add('show');
    }
    function hideSidebar() {
        sidebar.classList.remove('show');
        overlay.classList.remove('show');
    }

    document.querySelector('.sidebar-toggler')?.addEventListener('click', showSidebar);
    overlay.addEventListener('click', hideSidebar);

    adminNav.addEventListener('click', (Event) => {
        const link = Event.AT_TARGET.closest('.nav-link')
        if (!link) return;

        const sectionId = link.getAttribute('data-target-section');
        if (!sectionId) return;
        Event.preventDefault();

        adminNav.querySelectorAll('.nav-link').forEach(sec = sec.classList.remove('active'));
        link.classList.add('active');

        document.querySelectorAll('.content-section').forEach(sec => sec.classList.remove('active'));
        document.getElementById(sectionId)?.classList.add('active');
    });

    window.addEventListener('resize', () => {
        if (window.innerWidth >= 992) hideSidebar();
    });
});