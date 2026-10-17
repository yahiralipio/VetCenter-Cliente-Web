
"use strict";

// ==========================================
// VETCENTER - DASHBOARD DEL CLIENTE
// ==========================================

const API = "/api/mi-cuenta";

const mensaje = document.getElementById("mensaje");
const listaMascotas = document.getElementById("listaMascotas");
const tablaCitas = document.getElementById("tablaCitas");
const mascotaSelect = document.getElementById("mascotaId");

const citaForm = document.getElementById("citaForm");
const reservarButton = document.getElementById("reservarButton");
const logoutButton = document.getElementById("logoutButton");

const mascotaForm = document.getElementById("mascotaForm");
const mascotaNombre = document.getElementById("mascotaNombre");
const mascotaEspecie = document.getElementById("mascotaEspecie");
const mascotaRaza = document.getElementById("mascotaRaza");
const mascotaSexo = document.getElementById("mascotaSexo");
const guardarMascotaButton =
    document.getElementById("guardarMascotaButton");
const mascotaModalElemento =
    document.getElementById("mascotaModal");
const mascotaModalMensaje =
    document.getElementById("mascotaModalMensaje");
const nuevaMascotaButton =
    document.getElementById("nuevaMascotaButton");

let reservandoCita = false;
let guardandoMascota = false;
let mascotaEditandoId = null;


// ==========================================
// 1. UTILIDADES
// ==========================================

function obtenerElemento(id) {
    return document.getElementById(id);
}

function crearIcono(nombre, clases = "") {
    const icono = document.createElement("i");
    icono.className = `bi bi-${nombre} ${clases}`;
    icono.setAttribute("aria-hidden", "true");
    return icono;
}


let temporizadorMensaje = null;

function mostrarMensaje(texto, tipo = "success") {
    if (!mensaje) return;

    // Cancelar cualquier temporizador anterior
    if (temporizadorMensaje !== null) {
        clearTimeout(temporizadorMensaje);
        temporizadorMensaje = null;
    }

    // Limpiar notificación anterior
    mensaje.replaceChildren();

    // Estilos Bootstrap
    mensaje.className =
        `alert alert-${tipo} alert-dismissible fade show`;

    mensaje.setAttribute("role", "alert");

    // Crear contenido del mensaje
    const contenido = document.createElement("span");
    contenido.textContent = texto;

    // Crear botón X
    const cerrarButton = document.createElement("button");
    cerrarButton.type = "button";
    cerrarButton.className = "btn-close";
    cerrarButton.setAttribute("aria-label", "Cerrar notificación");

    cerrarButton.addEventListener("click", () => {
        ocultarMensaje();
    });

    mensaje.append(contenido, cerrarButton);

    // Desplazar hacia la notificación
    mensaje.scrollIntoView({
        behavior: "smooth",
        block: "nearest"
    });

    // Ocultar automáticamente después de 5 segundos
    temporizadorMensaje = setTimeout(() => {
        ocultarMensaje();
    }, 5000);
}

function ocultarMensaje() {
    if (!mensaje) return;

    // Detener temporizador activo
    if (temporizadorMensaje !== null) {
        clearTimeout(temporizadorMensaje);
        temporizadorMensaje = null;
    }

    // Ocultar y limpiar notificación
    mensaje.replaceChildren();
    mensaje.className = "alert d-none";
}


function mostrarErrorModal(texto) {
    if (!mascotaModalMensaje) {
        mostrarMensaje(texto, "danger");
        return;
    }

    mascotaModalMensaje.textContent = texto;
    mascotaModalMensaje.className = "alert alert-danger";
    mascotaModalMensaje.setAttribute("role", "alert");
}

function ocultarErrorModal() {
    if (!mascotaModalMensaje) return;

    mascotaModalMensaje.textContent = "";
    mascotaModalMensaje.className = "alert alert-danger d-none";
}

function textoSeguro(valor) {
    return valor === null ||
    valor === undefined ||
    valor === ""
        ? "—"
        : String(valor);
}

function crearCelda(fila, valor) {
    const celda = fila.insertCell();
    celda.textContent = textoSeguro(valor);
    return celda;
}

function establecerCargaBoton(
    boton,
    cargando,
    textoNormal,
    textoCargando,
    iconoNormal
) {
    if (!boton) return;

    boton.disabled = cargando;
    boton.replaceChildren();

    if (cargando) {
        const spinner = document.createElement("span");
        spinner.className =
            "spinner-border spinner-border-sm me-2";
        spinner.setAttribute("aria-hidden", "true");

        boton.append(
            spinner,
            document.createTextNode(textoCargando)
        );
    } else {
        boton.append(
            crearIcono(iconoNormal, "me-2"),
            document.createTextNode(textoNormal)
        );
    }
}

function establecerCargaReserva(cargando) {
    reservandoCita = cargando;

    establecerCargaBoton(
        reservarButton,
        cargando,
        "Confirmar reserva",
        "Registrando cita...",
        "calendar-check"
    );
}

function establecerCargaMascota(cargando) {
    guardandoMascota = cargando;

    establecerCargaBoton(
        guardarMascotaButton,
        cargando,
        mascotaEditandoId === null
            ? "Registrar mascota"
            : "Guardar cambios",
        mascotaEditandoId === null
            ? "Registrando mascota..."
            : "Guardando cambios...",
        mascotaEditandoId === null
            ? "check-circle"
            : "floppy"
    );
}

// ==========================================
// 2. COMUNICACIÓN CON LA API REST
// ==========================================

async function solicitar(url, opciones = {}) {
    const respuesta = await fetch(url, {
        ...opciones,
        credentials: "same-origin"
    });

    if (respuesta.status === 401) {
        window.location.replace("/login.html");
        throw new Error(
            "Tu sesión ha expirado. Inicia sesión nuevamente."
        );
    }

    const texto = await respuesta.text();
    let datos = {};

    if (texto) {
        try {
            datos = JSON.parse(texto);
        } catch {
            throw new Error(
                respuesta.ok
                    ? "El servidor devolvió una respuesta inválida."
                    : `Error HTTP ${respuesta.status}`
            );
        }
    }

    if (!respuesta.ok) {
        throw new Error(
            datos?.mensaje ||
            datos?.error ||
            `Error HTTP ${respuesta.status}`
        );
    }

    return datos;
}


// ==========================================
// 3. VERIFICAR PERFIL
// ==========================================

async function cargarPerfil() {
    const perfil = await solicitar("/api/auth/perfil");

    const rol = String(perfil.rol || "")
        .trim()
        .toUpperCase();

    if (rol !== "CLIENTE") {
        mostrarMensaje(
            "No tienes permisos para acceder al panel del cliente.",
            "danger"
        );

        obtenerElemento("bienvenida").textContent =
            "Acceso restringido";

        return false;
    }

    // Mostrar el nombre del cliente en el dashboard
    obtenerElemento("bienvenida").textContent =
        `¡Hola, ${perfil.nombres || "bienvenido"}!`;

    // Cargar los datos en la ventana Mi perfil
    const campos = {
        perfilNombres: perfil.nombres,
        perfilApellidos: perfil.apellidos,
        perfilTelefono: perfil.telefono,
        perfilCorreo: perfil.correo
    };

    Object.entries(campos).forEach(([id, valor]) => {
        const elemento = document.getElementById(id);

        if (elemento) {
            elemento.value = valor ?? "";
        }
    });

    return true;
}


// ==========================================
// GUARDAR CAMBIOS DE MI PERFIL
// ==========================================

const perfilDatosForm =
    document.getElementById("perfilDatosForm");

const perfilGuardarDatos =
    document.getElementById("perfilGuardarDatos");

const perfilDatosMensaje =
    document.getElementById("perfilDatosMensaje");

let guardandoPerfil = false;

function mostrarMensajePerfil(texto, tipo = "success") {
    if (!perfilDatosMensaje) return;

    perfilDatosMensaje.textContent = texto;
    perfilDatosMensaje.className =
        `alert alert-${tipo} mt-3 mb-3`;
}

function ocultarMensajePerfil() {
    if (!perfilDatosMensaje) return;

    perfilDatosMensaje.textContent = "";
    perfilDatosMensaje.className =
        "alert alert-info mt-3 mb-3 d-none";
}

if (perfilDatosForm) {
    perfilDatosForm.addEventListener(
        "submit",
        async (evento) => {
            evento.preventDefault();

            if (guardandoPerfil) return;
            if (!perfilDatosForm.reportValidity()) return;

            const nombres =
                document.getElementById("perfilNombres")
                    .value.trim();

            const apellidos =
                document.getElementById("perfilApellidos")
                    .value.trim();

            const telefono =
                document.getElementById("perfilTelefono")
                    .value.trim();

            if (!nombres || !apellidos) {
                mostrarMensajePerfil(
                    "Los nombres y apellidos son obligatorios.",
                    "danger"
                );
                return;
            }

            if (!/^\d{9}$/.test(telefono)) {
                mostrarMensajePerfil(
                    "El teléfono debe contener exactamente 9 dígitos.",
                    "danger"
                );
                return;
            }

            guardandoPerfil = true;
            perfilGuardarDatos.disabled = true;
            perfilGuardarDatos.textContent = "Guardando...";
            ocultarMensajePerfil();

            try {
                const resultado = await solicitar(
                    "/api/auth/perfil",
                    {
                        method: "PUT",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            nombres,
                            apellidos,
                            telefono
                        })
                    }
                );

                // Volver a consultar los datos guardados
                await cargarPerfil();

                mostrarMensajePerfil(
                    resultado.mensaje ||
                    "Perfil actualizado correctamente.",
                    "success"
                );

            } catch (error) {
                mostrarMensajePerfil(
                    error.message,
                    "danger"
                );

                console.error(
                    "Error al actualizar perfil:",
                    error
                );

            } finally {
                guardandoPerfil = false;
                perfilGuardarDatos.disabled = false;
                perfilGuardarDatos.replaceChildren(
                    crearIcono("check2-circle", "me-1"),
                    document.createTextNode("Guardar cambios")
                );
            }
        }
    );
}


// ==========================================
// MOSTRAR / OCULTAR CONTRASEÑAS DEL PERFIL
// ==========================================
// Funciona con botones de ojo dentro del mismo .input-group,
// o con botones que indiquen el ID mediante data-target / aria-controls.
function configurarVisibilidadPasswords() {
    const campos = [
        "perfilPasswordActual",
        "perfilPasswordNueva",
        "perfilPasswordConfirmar"
    ];

    campos.forEach(id => {
        const campo = document.getElementById(id);
        if (!campo) return;

        const grupo = campo.closest(".input-group") || campo.parentElement;
        if (!grupo) return;

        const botones = Array.from(grupo.querySelectorAll("button"));
        const boton = botones.find(item =>
            item.querySelector(".bi-eye, .bi-eye-slash") ||
            item.classList.contains("toggle-password") ||
            item.dataset.target === id ||
            item.getAttribute("aria-controls") === id
        );
        if (!boton || boton.dataset.vetcenterOjoConfigurado === "true") return;

        boton.dataset.vetcenterOjoConfigurado = "true";
        boton.type = "button";
        boton.setAttribute("aria-label", "Mostrar contraseña");
        boton.setAttribute("aria-pressed", "false");

        boton.addEventListener("click", evento => {
            evento.preventDefault();
            const visible = campo.type === "password";
            campo.type = visible ? "text" : "password";
            boton.setAttribute("aria-label", visible ? "Ocultar contraseña" : "Mostrar contraseña");
            boton.setAttribute("aria-pressed", String(visible));
            const icono = boton.querySelector("i");
            if (icono) {
                icono.classList.toggle("bi-eye", !visible);
                icono.classList.toggle("bi-eye-slash", visible);
            }
        });
    });

    // Separación visual entre los campos y el botón de cambio.
    const guardar = document.getElementById("perfilGuardarPassword");
    if (guardar && guardar.parentElement) {
        guardar.parentElement.style.marginTop = "20px";
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", configurarVisibilidadPasswords);
} else {
    configurarVisibilidadPasswords();
}

// ==========================================
// CAMBIAR CONTRASEÑA - VETCENTER
// ==========================================

const perfilPasswordForm =
    document.getElementById("perfilPasswordForm");

const perfilPasswordActual =
    document.getElementById("perfilPasswordActual");

const perfilPasswordNueva =
    document.getElementById("perfilPasswordNueva");

const perfilPasswordConfirmar =
    document.getElementById("perfilPasswordConfirmar");

const perfilGuardarPassword =
    document.getElementById("perfilGuardarPassword");

const perfilPasswordMensaje =
    document.getElementById("perfilPasswordMensaje");

let cambiandoPassword = false;

// MOSTRAR MENSAJES EN EL FORMULARIO
function mostrarMensajePassword(texto, tipo = "success") {
    if (!perfilPasswordMensaje) return;

    perfilPasswordMensaje.textContent = texto;
    perfilPasswordMensaje.className =
        `alert alert-${tipo} mt-3`;

    perfilPasswordMensaje.setAttribute("role", "status");
}

// OCULTAR MENSAJES ANTERIORES
function ocultarMensajePassword() {
    if (!perfilPasswordMensaje) return;

    perfilPasswordMensaje.textContent = "";
    perfilPasswordMensaje.className =
        "alert alert-info mt-3 d-none";
}

// ACTIVAR CAMBIO DE CONTRASEÑA
if (perfilPasswordForm && perfilGuardarPassword) {

    perfilPasswordForm.addEventListener(
        "submit",
        async (evento) => {

            evento.preventDefault();

            if (cambiandoPassword) return;
            if (!perfilPasswordForm.reportValidity()) return;

            const passwordActual =
                perfilPasswordActual.value;

            const passwordNueva =
                perfilPasswordNueva.value;

            const confirmarPassword =
                perfilPasswordConfirmar.value;

            // VALIDAR CONTRASEÑA ACTUAL
            if (!passwordActual) {
                mostrarMensajePassword(
                    "Ingresa tu contraseña actual.",
                    "danger"
                );
                return;
            }

            // VALIDAR LONGITUD
            if (passwordNueva.length < 8) {
                mostrarMensajePassword(
                    "La nueva contraseña debe tener al menos 8 caracteres.",
                    "danger"
                );
                return;
            }

            // VERIFICAR COINCIDENCIA
            if (passwordNueva !== confirmarPassword) {
                mostrarMensajePassword(
                    "Las nuevas contraseñas no coinciden.",
                    "danger"
                );
                return;
            }

            // EVITAR SOLICITUDES DUPLICADAS
            cambiandoPassword = true;
            perfilGuardarPassword.disabled = true;

            perfilGuardarPassword.replaceChildren(
                crearIcono("hourglass-split", "me-1"),
                document.createTextNode("Actualizando...")
            );

            ocultarMensajePassword();

            try {

                const resultado = await solicitar(
                    "/api/auth/password",
                    {
                        method: "PUT",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            passwordActual,
                            passwordNueva,
                            confirmarPassword
                        })
                    }
                );

                // LIMPIAR CAMPOS DESPUÉS DEL ÉXITO
                perfilPasswordForm.reset();

                mostrarMensajePassword(
                    resultado.mensaje ||
                    "Contraseña actualizada correctamente.",
                    "success"
                );

            } catch (error) {

                mostrarMensajePassword(
                    error.message,
                    "danger"
                );

                console.error(
                    "Error al cambiar contraseña:",
                    error
                );

            } finally {

                cambiandoPassword = false;
                perfilGuardarPassword.disabled = false;

                perfilGuardarPassword.replaceChildren(
                    crearIcono("key", "me-1"),
                    document.createTextNode("Cambiar contraseña")
                );
            }
        }
    );
}

// ==========================================
// 4. MODAL PARA REGISTRAR Y EDITAR
// ==========================================

function obtenerModalMascota() {
    if (!mascotaModalElemento || !window.bootstrap) {
        throw new Error(
            "No se pudo abrir el formulario de mascotas."
        );
    }

    return bootstrap.Modal.getOrCreateInstance(
        mascotaModalElemento
    );
}

function actualizarTituloModal(titulo) {
    if (!mascotaModalElemento) return;

    const tituloElemento =
        mascotaModalElemento.querySelector(".modal-title");

    if (tituloElemento) {
        tituloElemento.textContent = titulo;
    }
}

function prepararRegistroMascota() {
    if (guardandoMascota || !mascotaForm) return;

    mascotaEditandoId = null;
    mascotaForm.reset();
    ocultarErrorModal();
    actualizarTituloModal("Registrar nueva mascota");
    establecerCargaMascota(false);
}

function abrirEdicionMascota(mascota) {
    if (guardandoMascota || !mascotaForm) return;

    if (mascota.id === null ||
        mascota.id === undefined) {
        mostrarMensaje(
            "No se encontró el identificador de la mascota.",
            "danger"
        );
        return;
    }

    mascotaEditandoId = mascota.id;

    mascotaNombre.value = mascota.nombre || "";
    mascotaEspecie.value = mascota.especie || "";
    mascotaRaza.value = mascota.raza || "";
    mascotaSexo.value = mascota.sexo || "";

    ocultarErrorModal();
    actualizarTituloModal("Editar mascota");
    establecerCargaMascota(false);

    try {
        obtenerModalMascota().show();
    } catch (error) {
        mostrarMensaje(error.message, "danger");
    }
}

if (nuevaMascotaButton) {
    nuevaMascotaButton.addEventListener(
        "click",
        prepararRegistroMascota
    );
}

if (mascotaModalElemento) {
    mascotaModalElemento.addEventListener(
        "hidden.bs.modal",
        () => {
            if (!guardandoMascota) {
                prepararRegistroMascota();
            }
        }
    );
}

// ==========================================
// 5. CARGAR MASCOTAS
// ==========================================

async function cargarMascotas() {
    listaMascotas.replaceChildren();

    const cargando = document.createElement("div");
    cargando.className =
        "col-12 text-center text-muted py-4";

    cargando.append(
        crearIcono("hourglass-split", "me-2"),
        document.createTextNode("Cargando mascotas...")
    );

    listaMascotas.append(cargando);

    try {
        const mascotas = await solicitar(`${API}/mascotas`);

        if (!Array.isArray(mascotas)) {
            throw new Error(
                "La respuesta de mascotas no es una lista."
            );
        }

        obtenerElemento("totalMascotas").textContent =
            mascotas.length;

        listaMascotas.replaceChildren();
        mascotaSelect.replaceChildren();

        mascotaSelect.add(
            new Option("Selecciona una mascota", "")
        );

        if (mascotas.length === 0) {
            const columna = document.createElement("div");
            columna.className = "col-12";

            const vacio = document.createElement("div");
            vacio.className =
                "content-card text-center py-5";

            const icono = crearIcono(
                "heart",
                "d-block fs-1 text-secondary mb-3"
            );

            const titulo = document.createElement("h3");
            titulo.className = "h6 fw-bold";
            titulo.textContent =
                "Todavía no tienes mascotas registradas";

            const descripcion = document.createElement("p");
            descripcion.className =
                "text-muted small mb-0";
            descripcion.textContent =
                "Registra tu primera mascota para comenzar a gestionar sus citas veterinarias.";

            vacio.append(icono, titulo, descripcion);
            columna.append(vacio);
            listaMascotas.append(columna);

            return true;
        }

        mascotas.forEach(mascota => {
            const columna = document.createElement("div");
            columna.className = "col-md-6 col-lg-4";

            const tarjeta = document.createElement("div");
            tarjeta.className = "pet-card h-100";

            const icono = document.createElement("div");
            icono.className = "pet-icon";

            const especie = String(
                mascota.especie || ""
            ).trim().toLowerCase();

            let nombreIcono = "heart-pulse";

            if (especie === "gato") {
                nombreIcono = "heart";
            } else if (especie === "ave") {
                nombreIcono = "feather";
            } else if (especie === "conejo") {
                nombreIcono = "heart";
            }

            icono.append(crearIcono(nombreIcono));

            const nombre = document.createElement("h3");
            nombre.textContent =
                mascota.nombre || "Sin nombre";

            const detalles = document.createElement("p");
            detalles.className = "mb-0";
            detalles.textContent = [
                    mascota.especie,
                    mascota.raza
                ].filter(Boolean).join(" · ") ||
                "Sin información adicional";

            // BOTONES DE ACCIONES
            const acciones = document.createElement("div");
            acciones.className =
                "d-flex flex-wrap gap-2 mt-3";

            const editarButton =
                document.createElement("button");
            editarButton.type = "button";
            editarButton.className =
                "btn btn-sm btn-outline-primary";

            editarButton.append(
                crearIcono("pencil-square", "me-1"),
                document.createTextNode("Editar")
            );

            editarButton.addEventListener(
                "click",
                () => abrirEdicionMascota(mascota)
            );

            const eliminarButton =
                document.createElement("button");
            eliminarButton.type = "button";
            eliminarButton.className =
                "btn btn-sm btn-outline-danger";

            eliminarButton.append(
                crearIcono("trash3", "me-1"),
                document.createTextNode("Eliminar")
            );

            eliminarButton.addEventListener(
                "click",
                () => eliminarMascota(mascota)
            );

            acciones.append(
                editarButton,
                eliminarButton
            );

            tarjeta.append(
                icono,
                nombre,
                detalles,
                acciones
            );

            columna.append(tarjeta);
            listaMascotas.append(columna);

            mascotaSelect.add(
                new Option(
                    mascota.nombre || "Sin nombre",
                    mascota.id
                )
            );
        });

        return true;

    } catch (error) {
        listaMascotas.replaceChildren();

        const errorElemento =
            document.createElement("div");
        errorElemento.className =
            "col-12 text-danger py-3";
        errorElemento.textContent =
            "No se pudieron cargar tus mascotas.";

        listaMascotas.append(errorElemento);

        obtenerElemento("totalMascotas").textContent =
            "—";

        mascotaSelect.replaceChildren();
        mascotaSelect.add(
            new Option("No hay mascotas disponibles", "")
        );

        mostrarMensaje(error.message, "danger");
        console.error("Error al cargar mascotas:", error);

        return false;
    }
}

// ==========================================
// 6. REGISTRAR O ACTUALIZAR MASCOTA
// ==========================================

if (mascotaForm) {
    mascotaForm.addEventListener(
        "submit",
        async evento => {
            evento.preventDefault();

            if (guardandoMascota) return;
            if (!mascotaForm.reportValidity()) return;

            const nombre = mascotaNombre.value.trim();
            const especie = mascotaEspecie.value.trim();
            const raza = mascotaRaza.value.trim();
            const sexo = mascotaSexo.value.trim();

            if (!nombre || !especie) {
                mostrarErrorModal(
                    "El nombre y la especie son obligatorios."
                );
                return;
            }

            if (
                nombre.length > 100 ||
                especie.length > 100 ||
                raza.length > 100
            ) {
                mostrarErrorModal(
                    "Los campos no pueden superar los 100 caracteres."
                );
                return;
            }

            const editando = mascotaEditandoId !== null;
            const idActual = mascotaEditandoId;

            const datosMascota = {
                nombre,
                especie,
                raza,
                sexo
            };

            ocultarErrorModal();
            ocultarMensaje();
            establecerCargaMascota(true);

            try {
                const url = editando
                    ? `${API}/mascotas/${encodeURIComponent(idActual)}`
                    : `${API}/mascotas`;

                const resultado = await solicitar(url, {
                    method: editando ? "PUT" : "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(datosMascota)
                });

                // Consultar nuevamente el servidor para
                // verificar que los cambios sean visibles.
                const actualizado = await cargarMascotas();

                if (!actualizado) {
                    mostrarErrorModal(
                        "El servidor procesó la solicitud, pero no se pudo actualizar la lista. Recarga la página para comprobar los cambios."
                    );
                    return;
                }

                // Cerrar el modal únicamente cuando la
                // solicitud y la recarga se completaron.
                obtenerModalMascota().hide();

                mascotaForm.reset();

                mostrarMensaje(
                    resultado.mensaje ||
                    (editando
                        ? "Mascota actualizada correctamente."
                        : "Mascota registrada correctamente."),
                    "success"
                );

            } catch (error) {
                mostrarErrorModal(error.message);

                console.error(
                    "Error al guardar mascota:",
                    error
                );

            } finally {
                establecerCargaMascota(false);
            }
        }
    );
}


// ==========================================
// 7. ELIMINAR MASCOTA - MODAL BOOTSTRAP
// ==========================================

const eliminarMascotaModalElemento =
    document.getElementById("eliminarMascotaModal");

const nombreMascotaEliminar =
    document.getElementById("nombreMascotaEliminar");

const eliminarMascotaMensaje =
    document.getElementById("eliminarMascotaMensaje");

const confirmarEliminarMascotaButton =
    document.getElementById("confirmarEliminarMascotaButton");

const cancelarEliminarMascotaButton =
    document.getElementById("cancelarEliminarMascotaButton");

let mascotaPendienteEliminar = null;
let eliminandoMascota = false;

// MOSTRAR ERROR EN EL MODAL
function mostrarErrorEliminar(texto) {
    if (!eliminarMascotaMensaje) {
        mostrarMensaje(texto, "danger");
        return;
    }

    eliminarMascotaMensaje.textContent = texto;
    eliminarMascotaMensaje.classList.remove("d-none");
}

// OCULTAR ERROR DEL MODAL
function ocultarErrorEliminar() {
    if (!eliminarMascotaMensaje) return;

    eliminarMascotaMensaje.textContent = "";
    eliminarMascotaMensaje.classList.add("d-none");
}

// CONTROLAR ESTADO DEL BOTÓN
function establecerCargaEliminar(cargando) {
    eliminandoMascota = cargando;

    establecerCargaBoton(
        confirmarEliminarMascotaButton,
        cargando,
        "Sí, eliminar",
        "Eliminando...",
        "trash3"
    );

    if (cancelarEliminarMascotaButton) {
        cancelarEliminarMascotaButton.disabled = cargando;
    }
}

// ABRIR MODAL DE CONFIRMACIÓN
function eliminarMascota(mascota) {
    if (eliminandoMascota) return;

    if (
        !mascota ||
        mascota.id === null ||
        mascota.id === undefined
    ) {
        mostrarMensaje(
            "No se encontró el identificador de la mascota.",
            "danger"
        );
        return;
    }

    if (
        !eliminarMascotaModalElemento ||
        !nombreMascotaEliminar ||
        !confirmarEliminarMascotaButton ||
        !window.bootstrap
    ) {
        mostrarMensaje(
            "No se pudo abrir el modal de eliminación. Revisa dashboard.html.",
            "danger"
        );
        return;
    }

    mascotaPendienteEliminar = {
        id: mascota.id,
        nombre: mascota.nombre || "esta mascota"
    };

    nombreMascotaEliminar.textContent =
        mascotaPendienteEliminar.nombre;

    ocultarErrorEliminar();
    establecerCargaEliminar(false);

    const modal = bootstrap.Modal.getOrCreateInstance(
        eliminarMascotaModalElemento
    );

    modal.show();
}

// CONFIRMAR ELIMINACIÓN
if (confirmarEliminarMascotaButton) {
    confirmarEliminarMascotaButton.addEventListener(
        "click",
        async () => {
            if (
                eliminandoMascota ||
                !mascotaPendienteEliminar
            ) {
                return;
            }

            const mascota = mascotaPendienteEliminar;

            ocultarErrorEliminar();
            establecerCargaEliminar(true);

            try {
                // ENVIAR SOLICITUD DE ELIMINACIÓN
                await solicitar(
                    `${API}/mascotas/${encodeURIComponent(mascota.id)}`,
                    {
                        method: "DELETE"
                    }
                );

                // VERIFICAR QUE SE ELIMINÓ
                const mascotasActuales = await solicitar(
                    `${API}/mascotas`
                );

                if (!Array.isArray(mascotasActuales)) {
                    throw new Error(
                        "No se pudo verificar la eliminación."
                    );
                }

                const sigueExistiendo = mascotasActuales.some(
                    item =>
                        String(item.id) === String(mascota.id)
                );

                if (sigueExistiendo) {
                    throw new Error(
                        "No se pudo eliminar la mascota. Es posible que tenga citas veterinarias asociadas."
                    );
                }

                // FINALIZAR ESTADO DE CARGA
                establecerCargaEliminar(false);

                // CERRAR AUTOMÁTICAMENTE EL MODAL
                bootstrap.Modal.getOrCreateInstance(
                    eliminarMascotaModalElemento
                ).hide();

                // ACTUALIZAR LISTA DE MASCOTAS
                const actualizado = await cargarMascotas();

                if (actualizado) {
                    mostrarMensaje(
                        "Mascota eliminada correctamente.",
                        "success"
                    );
                } else {
                    mostrarMensaje(
                        "La mascota fue eliminada, pero no se pudo actualizar la lista.",
                        "warning"
                    );
                }

                // ACTUALIZAR LISTA DE CITAS
                await cargarCitas();

            } catch (error) {
                mostrarErrorEliminar(error.message);

                console.error(
                    "Error al eliminar mascota:",
                    error
                );

            } finally {
                establecerCargaEliminar(false);
            }
        }
    );
}

// CONTROLAR CIERRE DEL MODAL
if (eliminarMascotaModalElemento) {

    // IMPEDIR CIERRE MIENTRAS SE ELIMINA
    eliminarMascotaModalElemento.addEventListener(
        "hide.bs.modal",
        evento => {
            if (eliminandoMascota) {
                evento.preventDefault();
            }
        }
    );

    // LIMPIAR DATOS AL CERRAR
    eliminarMascotaModalElemento.addEventListener(
        "hidden.bs.modal",
        () => {
            mascotaPendienteEliminar = null;
            ocultarErrorEliminar();
        }
    );
}


// ==========================================
// 8. ESTADOS DE LAS CITAS
// ==========================================

function crearEstadoCita(estadoOriginal) {
    const estado = String(
        estadoOriginal || ""
    ).trim().toUpperCase();

    const configuracion = {
        PENDIENTE: {
            clase: "text-bg-warning",
            icono: "clock-history"
        },
        CONFIRMADA: {
            clase: "text-bg-success",
            icono: "check-circle"
        },
        RECHAZADA: {
            clase: "text-bg-danger",
            icono: "x-circle"
        },
        CANCELADA: {
            clase: "text-bg-secondary",
            icono: "slash-circle"
        },
        ATENDIDA: {
            clase: "text-bg-primary",
            icono: "clipboard2-check"
        }
    };

    const estilo = configuracion[estado] || {
        clase: "text-bg-light",
        icono: "info-circle"
    };

    const badge = document.createElement("span");
    badge.className =
        `badge rounded-pill ${estilo.clase} px-3 py-2`;

    badge.append(
        crearIcono(estilo.icono, "me-1"),
        document.createTextNode(
            estado || "SIN ESTADO"
        )
    );

    return badge;
}

// ==========================================
// 9. CONSULTAR MIS CITAS
// ==========================================

async function cargarCitas() {
    tablaCitas.replaceChildren();

    try {
        const citas = await solicitar(`${API}/citas`);

        if (!Array.isArray(citas)) {
            throw new Error(
                "La respuesta de citas no es una lista."
            );
        }

        obtenerElemento("totalCitas").textContent =
            citas.length;

        if (citas.length === 0) {
            const fila = tablaCitas.insertRow();
            const celda = fila.insertCell();

            celda.colSpan = 6;
            celda.className =
                "text-center text-muted py-4";
            celda.textContent =
                "No tienes citas registradas.";

            return;
        }

        citas.forEach(cita => {
            const fila = tablaCitas.insertRow();

            crearCelda(
                fila,
                cita.mascota?.nombre || "Sin mascota"
            );

            crearCelda(fila, cita.fecha);
            crearCelda(fila, cita.hora);
            crearCelda(fila, cita.motivo);

            const celdaEstado = fila.insertCell();
            celdaEstado.append(
                crearEstadoCita(cita.estado)
            );

            const celdaAccion = fila.insertCell();

            const estado = String(
                cita.estado || ""
            ).trim().toUpperCase();

            if (estado === "PENDIENTE") {
                const boton =
                    document.createElement("button");

                boton.type = "button";
                boton.className =
                    "btn btn-sm btn-outline-danger";

                boton.append(
                    crearIcono("x-circle", "me-1"),
                    document.createTextNode("Cancelar")
                );

                boton.addEventListener(
                    "click",
                    () => cancelarCita(cita.id, boton)
                );

                celdaAccion.append(boton);

            } else {
                celdaAccion.textContent = "—";
            }
        });

    } catch (error) {
        obtenerElemento("totalCitas").textContent =
            "—";

        tablaCitas.replaceChildren();

        const fila = tablaCitas.insertRow();
        const celda = fila.insertCell();

        celda.colSpan = 6;
        celda.className =
            "text-center text-danger py-4";
        celda.textContent =
            "No se pudieron cargar las citas.";

        mostrarMensaje(error.message, "danger");
        console.error("Error al cargar citas:", error);
    }
}


// ==========================================
// 10. CANCELAR CITA - MODAL BOOTSTRAP
// ==========================================

const cancelarCitaModalElemento =
    document.getElementById("cancelarCitaModal");

const cancelarCitaMensaje =
    document.getElementById("cancelarCitaMensaje");

const confirmarCancelarCitaButton =
    document.getElementById("confirmarCancelarCitaButton");

const volverCancelarCitaButton =
    document.getElementById("volverCancelarCitaButton");

let citaPendienteCancelar = null;
let cancelandoCita = false;

// MOSTRAR ERROR
function mostrarErrorCancelarCita(texto) {
    if (!cancelarCitaMensaje) {
        mostrarMensaje(texto, "danger");
        return;
    }

    cancelarCitaMensaje.textContent = texto;
    cancelarCitaMensaje.classList.remove("d-none");
}

// OCULTAR ERROR
function ocultarErrorCancelarCita() {
    if (!cancelarCitaMensaje) return;

    cancelarCitaMensaje.textContent = "";
    cancelarCitaMensaje.classList.add("d-none");
}

// CONTROLAR ESTADO DE CARGA
function establecerCargaCancelarCita(cargando) {
    cancelandoCita = cargando;

    establecerCargaBoton(
        confirmarCancelarCitaButton,
        cargando,
        "Sí, cancelar cita",
        "Cancelando cita...",
        "calendar-x"
    );

    if (volverCancelarCitaButton) {
        volverCancelarCitaButton.disabled = cargando;
    }
}

// ABRIR MODAL
function cancelarCita(id) {
    if (cancelandoCita) return;

    if (id === null || id === undefined) {
        mostrarMensaje(
            "No se encontró el identificador de la cita.",
            "danger"
        );
        return;
    }

    if (
        !cancelarCitaModalElemento ||
        !confirmarCancelarCitaButton ||
        !window.bootstrap
    ) {
        mostrarMensaje(
            "No se pudo abrir el modal de cancelación.",
            "danger"
        );
        return;
    }

    citaPendienteCancelar = id;

    ocultarErrorCancelarCita();
    establecerCargaCancelarCita(false);

    bootstrap.Modal.getOrCreateInstance(
        cancelarCitaModalElemento
    ).show();
}

// CONFIRMAR CANCELACIÓN
if (confirmarCancelarCitaButton) {
    confirmarCancelarCitaButton.addEventListener(
        "click",
        async () => {
            if (
                cancelandoCita ||
                citaPendienteCancelar === null
            ) {
                return;
            }

            const id = citaPendienteCancelar;

            ocultarErrorCancelarCita();
            establecerCargaCancelarCita(true);

            try {
                await solicitar(
                    `${API}/citas/${encodeURIComponent(id)}/cancelar`,
                    {
                        method: "PATCH"
                    }
                );

                // VERIFICAR ESTADO REAL DE LA CITA
                const citasActuales = await solicitar(
                    `${API}/citas`
                );

                if (!Array.isArray(citasActuales)) {
                    throw new Error(
                        "No se pudo verificar la cancelación."
                    );
                }

                const citaActualizada = citasActuales.find(
                    cita => String(cita.id) === String(id)
                );

                if (
                    !citaActualizada ||
                    String(citaActualizada.estado || "")
                        .trim()
                        .toUpperCase() !== "CANCELADA"
                ) {
                    throw new Error(
                        "No se pudo confirmar que la cita haya sido cancelada."
                    );
                }

                // PERMITIR CIERRE DEL MODAL
                establecerCargaCancelarCita(false);

                // CERRAR MODAL AUTOMÁTICAMENTE
                bootstrap.Modal.getOrCreateInstance(
                    cancelarCitaModalElemento
                ).hide();

                // ACTUALIZAR TABLA
                await cargarCitas();

                mostrarMensaje(
                    "Cita cancelada correctamente.",
                    "success"
                );

            } catch (error) {
                mostrarErrorCancelarCita(error.message);

                console.error(
                    "Error al cancelar cita:",
                    error
                );

            } finally {
                establecerCargaCancelarCita(false);
            }
        }
    );
}

// CONTROLAR CIERRE DEL MODAL
if (cancelarCitaModalElemento) {
    cancelarCitaModalElemento.addEventListener(
        "hide.bs.modal",
        evento => {
            if (cancelandoCita) {
                evento.preventDefault();
            }
        }
    );

    cancelarCitaModalElemento.addEventListener(
        "hidden.bs.modal",
        () => {
            citaPendienteCancelar = null;
            ocultarErrorCancelarCita();
        }
    );
}

// ==========================================
// 11. REGISTRAR NUEVA CITA
// VETCENTER - ATENCIÓN 24 HORAS
// ==========================================

// VALIDAR FECHA Y HORA DE LA CITA
function validarHorarioAtencion(fecha, hora) {

    if (!fecha || !hora) {
        return "Selecciona una fecha y una hora válidas.";
    }

    // VALIDAR FORMATO
    if (
        !/^\d{4}-\d{2}-\d{2}$/.test(fecha) ||
        !/^\d{2}:\d{2}$/.test(hora)
    ) {
        return "El formato de fecha u hora no es válido.";
    }

    // OBTENER FECHA Y HORA
    const [anio, mes, dia] = fecha.split("-").map(Number);
    const [horas, minutos] = hora.split(":").map(Number);

    const fechaSeleccionada = new Date(
        anio,
        mes - 1,
        dia,
        horas,
        minutos
    );

    // VALIDAR QUE LA FECHA Y HORA EXISTAN
    if (
        fechaSeleccionada.getFullYear() !== anio ||
        fechaSeleccionada.getMonth() !== mes - 1 ||
        fechaSeleccionada.getDate() !== dia ||
        fechaSeleccionada.getHours() !== horas ||
        fechaSeleccionada.getMinutes() !== minutos
    ) {
        return "La fecha u hora seleccionada no es válida.";
    }

    // VALIDAR QUE LA CITA SEA FUTURA
    if (fechaSeleccionada <= new Date()) {
        return "Selecciona una fecha y hora posteriores al momento actual.";
    }

    // VETCENTER ATIENDE LAS 24 HORAS
    // DE LUNES A DOMINGO
    return null;
}

// REGISTRAR NUEVA CITA
if (citaForm) {
    citaForm.addEventListener(
        "submit",
        async evento => {
            evento.preventDefault();

            if (reservandoCita) return;
            if (!citaForm.reportValidity()) return;

            // OBTENER DATOS DEL FORMULARIO
            const mascotaId = Number(mascotaSelect.value);

            const fecha =
                obtenerElemento("fecha").value;

            const hora =
                obtenerElemento("hora").value;

            const motivo =
                obtenerElemento("motivo").value.trim();

            // VALIDAR CAMPOS OBLIGATORIOS
            if (!mascotaId || !fecha || !hora || !motivo) {
                mostrarMensaje(
                    "Completa todos los campos de la cita.",
                    "danger"
                );
                return;
            }

            // VALIDAR FECHA Y HORA
            const errorHorario = validarHorarioAtencion(
                fecha,
                hora
            );

            if (errorHorario) {
                mostrarMensaje(errorHorario, "danger");
                return;
            }

            // PREPARAR DATOS DE LA CITA
            const nuevaCita = {
                mascotaId,
                fecha,
                hora,
                motivo
            };

            ocultarMensaje();
            establecerCargaReserva(true);

            try {
                // ENVIAR SOLICITUD AL SERVIDOR
                const resultado = await solicitar(
                    `${API}/citas`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify(nuevaCita)
                    }
                );

                // ACTUALIZAR LISTA DE CITAS
                await cargarCitas();

                // MOSTRAR MENSAJE DE CONFIRMACIÓN
                mostrarMensaje(
                    resultado.mensaje ||
                    "Solicitud de cita registrada correctamente.",
                    "success"
                );

                // LIMPIAR FORMULARIO
                citaForm.reset();
                window.VetCenterHorarios?.limpiar();

            } catch (error) {
                mostrarMensaje(
                    error.message,
                    "danger"
                );

                console.error(
                    "Error al registrar cita:",
                    error
                );

            } finally {
                establecerCargaReserva(false);
            }
        }
    );
}

// ==========================================
// 12. CERRAR SESIÓN
// ==========================================

logoutButton.addEventListener(
    "click",
    async () => {
        logoutButton.disabled = true;

        try {
            await solicitar(
                "/api/auth/logout",
                {
                    method: "POST"
                }
            );

            window.location.replace("/login.html");

        } catch (error) {
            mostrarMensaje(error.message, "danger");
            logoutButton.disabled = false;
        }
    }
);

// ==========================================
// 13. NAVEGACIÓN LATERAL
// ==========================================

const enlacesNavegacion =
    document.querySelectorAll(".sidebar-nav a");

enlacesNavegacion.forEach(enlace => {
    enlace.addEventListener("click", () => {
        enlacesNavegacion.forEach(item => {
            item.classList.remove("active");
        });

        enlace.classList.add("active");
    });
});


// ==========================================
// 14. INICIAR DASHBOARD
// ==========================================

// CONFIGURAR FECHA MÍNIMA PARA RESERVAR CITAS
function configurarFechaMinima() {
    const fechaInput = document.getElementById("fecha");

    if (!fechaInput) return;

    const hoy = new Date();

    const fechaActual = [
        hoy.getFullYear(),
        String(hoy.getMonth() + 1).padStart(2, "0"),
        String(hoy.getDate()).padStart(2, "0")
    ].join("-");

    // Impedir seleccionar fechas anteriores a hoy
    fechaInput.min = fechaActual;

    // Limpiar una fecha pasada si estaba seleccionada
    if (
        fechaInput.value &&
        fechaInput.value < fechaActual
    ) {
        fechaInput.value = "";
    }
}

// INICIAR PANEL DEL CLIENTE
async function iniciarDashboard() {
    try {
        // Ocultar mensajes anteriores
        ocultarMensaje();

        // Configurar fecha mínima del calendario
        configurarFechaMinima();

        // Verificar perfil y permisos
        const permitido = await cargarPerfil();

        if (!permitido) return;

        // Cargar mascotas y citas
        await Promise.all([
            cargarMascotas(),
            cargarCitas()
        ]);

        console.log(
            "Dashboard del cliente cargado correctamente."
        );

    } catch (error) {
        console.error(
            "Error al iniciar dashboard:",
            error
        );

        mostrarMensaje(error.message, "danger");
    }
}

iniciarDashboard();
