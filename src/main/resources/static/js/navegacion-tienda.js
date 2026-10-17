"use strict";

// Secciones del panel de administración
const seccionesTienda = [
    "resumen",
    "productos",
    "medicamentos",
    "categorias",
    "pedidos"
];

// Mostrar únicamente la sección seleccionada
function mostrarSeccionTienda() {

    const seccionSolicitada =
        window.location.hash.replace("#", "");

    const seccionActiva =
        seccionesTienda.includes(seccionSolicitada)
            ? seccionSolicitada
            : "resumen";

    seccionesTienda.forEach(id => {

        const seccion = document.getElementById(id);

        if (!seccion) return;

        seccion.classList.toggle(
            "d-none",
            id !== seccionActiva
        );
    });

    // Resaltar la opción activa del menú
    document.querySelectorAll(
        '.sidebar-nav a[href^="#"]'
    ).forEach(enlace => {

        const activo =
            enlace.getAttribute("href") ===
            "#" + seccionActiva;

        enlace.classList.toggle("active", activo);

        if (activo) {
            enlace.setAttribute("aria-current", "page");
        } else {
            enlace.removeAttribute("aria-current");
        }
    });

    // Volver al inicio de la página
    window.scrollTo({
        top: 0,
        behavior: "instant"
    });
}

// Detectar cambios al seleccionar el menú
window.addEventListener(
    "hashchange",
    mostrarSeccionTienda
);

// Mostrar la sección inicial
if (document.readyState === "loading") {

    document.addEventListener(
        "DOMContentLoaded",
        mostrarSeccionTienda
    );

} else {

    mostrarSeccionTienda();
}
