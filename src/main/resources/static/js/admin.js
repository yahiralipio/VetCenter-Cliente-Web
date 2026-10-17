
"use strict";

// ==========================================
// VETCENTER - PANEL ADMINISTRATIVO
// ==========================================

const mensaje = document.getElementById("mensaje");
const clienteForm = document.getElementById("clienteForm");
const clienteModalElemento = document.getElementById("clienteModal");
const clienteModal = bootstrap.Modal.getOrCreateInstance(clienteModalElemento);

const guardarClienteButton = document.getElementById("guardarClienteButton");

let clientesActuales = [];
let guardandoCliente = false;
let registroSoapIncierto = false;
let mascotasActuales = [];
let citasDisponibles = [];


let usuariosConRoles = [];
let cambiandoRol = false;

async function cambiarRolCliente(usuario) {
    if (cambiandoRol || !usuario) return;

    const rolActual = String(usuario.rol || "").toUpperCase();
    const nuevoRol = rolActual === "ADMIN" ? "CLIENTE" : "ADMIN";

    const accion = nuevoRol === "ADMIN"
        ? "otorgar permisos de administrador"
        : "retirar los permisos de administrador";

    const confirmado = window.confirm(
        `¿Deseas ${accion} a ${usuario.nombres}?\n\n` +
        `Rol actual: ${rolActual}\n` +
        `Nuevo rol: ${nuevoRol}`
    );

    if (!confirmado) return;

    cambiandoRol = true;

    try {
        const resultado = await solicitar(
            `/api/admin/usuarios/${encodeURIComponent(usuario.id)}/rol`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ rol: nuevoRol })
            }
        );

        mostrarMensaje(
            resultado.mensaje || "Rol actualizado correctamente.",
            "success"
        );

        await cargarClientes();

    } catch (error) {
        mostrarMensaje(
            `No se pudo cambiar el rol: ${error.message}`
        );
        console.error("Error al cambiar rol:", error);

    } finally {
        cambiandoRol = false;
    }
}

// ==========================================
// 1. UTILIDADES
// ==========================================

function elemento(id) {
    return document.getElementById(id);
}


let temporizadorNotificacion = null;

function mostrarMensaje(texto, tipo = "danger") {

    // Ocultar la alerta antigua para que no ocupe espacio.
    if (typeof mensaje !== "undefined" && mensaje) {
        mensaje.textContent = "";
        mensaje.className = "alert d-none";
    }

    // Crear el contenedor flotante si todavía no existe.
    let contenedor = document.getElementById("notificacionAdmin");

    if (!contenedor) {
        contenedor = document.createElement("div");
        contenedor.id = "notificacionAdmin";

        contenedor.className = "position-fixed top-0 end-0 p-3";

        contenedor.style.zIndex = "11000";
        contenedor.style.width = "min(400px, 100%)";
        contenedor.style.pointerEvents = "none";

        document.body.appendChild(contenedor);
    }

    // Limpiar notificaciones anteriores.
    clearTimeout(temporizadorNotificacion);
    contenedor.replaceChildren();

    const estilos = {
        success: {
            icono: "check-circle-fill",
            color: "text-success",
            titulo: "Operación exitosa"
        },
        danger: {
            icono: "x-circle-fill",
            color: "text-danger",
            titulo: "Ocurrió un error"
        },
        warning: {
            icono: "exclamation-triangle-fill",
            color: "text-warning",
            titulo: "Advertencia"
        },
        info: {
            icono: "info-circle-fill",
            color: "text-primary",
            titulo: "Información"
        }
    };

    const estilo = estilos[tipo] || estilos.info;

    const notificacion = document.createElement("div");

    notificacion.className =
        "alert bg-white border shadow-lg rounded-3 d-flex " +
        "align-items-start gap-3 mb-0";

    notificacion.style.pointerEvents = "auto";

    const icono = document.createElement("i");
    icono.className = `bi bi-${estilo.icono} ${estilo.color} fs-5`;

    const contenido = document.createElement("div");
    contenido.className = "flex-grow-1";

    const titulo = document.createElement("div");
    titulo.className = "fw-bold mb-1";
    titulo.textContent = estilo.titulo;

    const descripcion = document.createElement("div");
    descripcion.className = "small text-dark";
    descripcion.textContent = String(texto);

    contenido.append(titulo, descripcion);

    const cerrar = document.createElement("button");
    cerrar.type = "button";
    cerrar.className = "btn-close";
    cerrar.setAttribute("aria-label", "Cerrar notificación");

    cerrar.addEventListener("click", ocultarMensaje);

    notificacion.append(icono, contenido, cerrar);
    contenedor.appendChild(notificacion);

    // Desaparecer automáticamente después de 5 segundos.
    temporizadorNotificacion = setTimeout(() => {
        ocultarMensaje();
    }, 5000);
}

function ocultarMensaje() {

    clearTimeout(temporizadorNotificacion);
    temporizadorNotificacion = null;

    const contenedor = document.getElementById("notificacionAdmin");

    if (contenedor) {
        contenedor.replaceChildren();
    }

    // Mantener oculta la alerta anterior.
    if (typeof mensaje !== "undefined" && mensaje) {
        mensaje.textContent = "";
        mensaje.className = "alert d-none";
    }
}

function mostrarErrorModal(texto) {
    const alerta = elemento("clienteModalMensaje");
    alerta.textContent = texto;
    alerta.classList.remove("d-none");
}

function ocultarErrorModal() {
    const alerta = elemento("clienteModalMensaje");
    alerta.textContent = "";
    alerta.classList.add("d-none");
}

function textoSeguro(valor) {
    if (valor === null || valor === undefined || valor === "") {
        return "—";
    }

    return String(valor);
}

function crearIcono(nombre) {
    const icono = document.createElement("i");
    icono.className = `bi bi-${nombre}`;
    icono.setAttribute("aria-hidden", "true");
    return icono;
}

function crearBoton(texto, icono, clases, accion) {
    const boton = document.createElement("button");

    boton.type = "button";
    boton.className = clases;

    boton.append(
        crearIcono(icono),
        document.createTextNode(` ${texto}`)
    );

    boton.addEventListener("click", accion);

    return boton;
}

function actualizarBotonGuardar() {
    const editando = Boolean(elemento("clienteId").value);

    guardarClienteButton.replaceChildren(
        crearIcono("check-circle"),
        document.createTextNode(
            editando ? " Guardar cambios" : " Registrar cliente"
        )
    );
}

function establecerCargaGuardar(cargando) {
    guardandoCliente = cargando;

    guardarClienteButton.disabled =
        cargando || registroSoapIncierto;

    if (cargando) {
        guardarClienteButton.replaceChildren();

        const spinner = document.createElement("span");
        spinner.className =
            "spinner-border spinner-border-sm me-2";
        spinner.setAttribute("aria-hidden", "true");

        guardarClienteButton.append(
            spinner,
            document.createTextNode(" Guardando...")
        );
    } else {
        actualizarBotonGuardar();
    }
}

// ==========================================
// 2. SOLICITUDES AL SERVIDOR
// ==========================================

async function solicitar(url, opciones = {}) {
    const respuesta = await fetch(url, {
        ...opciones,
        credentials: "same-origin"
    });

    if (respuesta.status === 401) {
        window.location.replace("/login.html");
        throw new Error("Debes iniciar sesión.");
    }

    const texto = await respuesta.text();

    let datos = {};

    if (texto) {
        try {
            datos = JSON.parse(texto);
        } catch {
            datos = texto;
        }
    }

    if (!respuesta.ok) {
        const detalle =
            typeof datos === "string"
                ? datos
                : datos?.mensaje || datos?.error;

        throw new Error(
            detalle || `Error HTTP ${respuesta.status}`
        );
    }

    return datos;
}

// ==========================================
// 3. VERIFICAR ADMINISTRADOR
// ==========================================

async function verificarAdministrador() {
    const perfil = await solicitar("/api/auth/perfil");

    const rol = String(perfil.rol || "")
        .trim()
        .toUpperCase();

    if (rol !== "ADMIN") {
        mostrarMensaje(
            "Acceso denegado. No tienes permisos de administrador."
        );

        return false;
    }

    elemento("bienvenida").textContent =
        `Bienvenido, ${perfil.nombres || "Administrador"}`;

    return true;
}

// ==========================================
// 4. TABLAS
// ==========================================

function agregarFila(tablaId, valores) {
    const tabla = elemento(tablaId);
    const fila = tabla.insertRow();

    valores.forEach(valor => {
        const celda = fila.insertCell();
        celda.textContent = textoSeguro(valor);
    });

    return fila;
}

function mostrarVacio(
    tablaId,
    columnas,
    texto = "No hay registros disponibles"
) {
    const tabla = elemento(tablaId);
    const fila = tabla.insertRow();
    const celda = fila.insertCell();

    celda.colSpan = columnas;
    celda.className = "text-center text-muted py-4";

    celda.append(
        crearIcono("inbox"),
        document.createTextNode(` ${texto}`)
    );
}

function mostrarCargando(tablaId, columnas) {
    const tabla = elemento(tablaId);
    tabla.replaceChildren();

    const fila = tabla.insertRow();
    const celda = fila.insertCell();

    celda.colSpan = columnas;
    celda.className = "text-center text-muted py-4";

    const spinner = document.createElement("span");
    spinner.className =
        "spinner-border spinner-border-sm me-2";
    spinner.setAttribute("aria-hidden", "true");

    celda.append(
        spinner,
        document.createTextNode("Cargando registros...")
    );
}

async function cargarTabla(
    endpoint,
    tablaId,
    contadorId,
    columnas,
    transformar
) {
    const tabla = elemento(tablaId);
    const contador = elemento(contadorId);

    mostrarCargando(tablaId, columnas);

    try {
        const datos = await solicitar(endpoint);

        if (!Array.isArray(datos)) {
            throw new Error(
                "El servidor no devolvió una lista JSON."
            );
        }

        tabla.replaceChildren();
        contador.textContent = datos.length;

        if (datos.length === 0) {
            mostrarVacio(tablaId, columnas);
            return;
        }

        datos.forEach(item => {
            agregarFila(tablaId, transformar(item));
        });

    } catch (error) {
        contador.textContent = "—";
        tabla.replaceChildren();

        mostrarVacio(
            tablaId,
            columnas,
            "No se pudieron cargar los registros"
        );

        mostrarMensaje(
            `Error en ${endpoint}: ${error.message}`
        );

        console.error(endpoint, error);
    }
}


// ==========================================
// 5. CARGAR CLIENTES
// ==========================================

function normalizarTextoCliente(valor) {
    return String(valor ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}

function filtrarClientes() {
    const tabla = elemento("tablaClientes");
    const buscador = elemento("filtroClientes");
    const resultado = elemento("resultadoFiltroClientes");

    if (!tabla) return;

    const busqueda = normalizarTextoCliente(
        buscador?.value || ""
    );

    const clientes = Array.isArray(clientesActuales)
        ? clientesActuales
        : [];

    const filtrados = clientes.filter(cliente => {
        const nombre = normalizarTextoCliente(cliente.nombres);
        const apellido = normalizarTextoCliente(cliente.apellidos);
        const dni = normalizarTextoCliente(cliente.dni);

        return (
            nombre.includes(busqueda) ||
            apellido.includes(busqueda) ||
            dni.includes(busqueda) ||
            `${nombre} ${apellido}`.includes(busqueda)
        );
    });

    tabla.replaceChildren();

    if (resultado) {
        resultado.textContent =
            `Mostrando ${filtrados.length} de ${clientes.length} clientes`;
    }

    if (filtrados.length === 0) {
        mostrarVacio(
            "tablaClientes",
            7,
            busqueda
                ? "No se encontraron clientes"
                : "No hay clientes registrados"
        );
        return;
    }

    filtrados.forEach(cliente => {
        const fila = agregarFila("tablaClientes", [
            cliente.nombres,
            cliente.apellidos,
            cliente.dni,
            cliente.correo,
            cliente.telefono
        ]);

        // Relacionar exclusivamente por clienteId.
        const cuentas = usuariosConRoles.filter(usuario =>
            usuario.clienteId != null &&
            String(usuario.clienteId) === String(cliente.id)
        );

        const usuario = cuentas.length === 1
            ? cuentas[0]
            : null;

        const celdaRol = fila.insertCell();

        const etiqueta = document.createElement("span");

        if (usuario) {
            const esAdmin = usuario.rol === "ADMIN";

            etiqueta.className = esAdmin
                ? "badge bg-primary"
                : "badge bg-secondary";

            etiqueta.textContent = esAdmin
                ? "ADMIN"
                : "CLIENTE";
        } else {
            etiqueta.className = "text-muted small";

            etiqueta.textContent = cuentas.length > 1
                ? "Vínculo ambiguo"
                : "Sin cuenta vinculada";
        }

        celdaRol.append(etiqueta);

        const celdaAcciones = fila.insertCell();

        const contenedor = document.createElement("div");
        contenedor.className =
            "d-flex align-items-center gap-2 flex-wrap";

        const editar = crearBoton(
            "Editar",
            "pencil-square",
            "btn btn-sm btn-outline-primary",
            () => editarCliente(cliente.id)
        );

        const eliminar = crearBoton(
            "Eliminar",
            "trash",
            "btn btn-sm btn-outline-danger",
            () => eliminarCliente(cliente.id)
        );

        contenedor.append(editar, eliminar);

        if (usuario && usuario.activo === true) {
            const esAdmin = usuario.rol === "ADMIN";

            const botonRol = crearBoton(
                esAdmin ? "Quitar admin" : "Hacer admin",
                esAdmin ? "shield-minus" : "shield-plus",
                esAdmin
                    ? "btn btn-sm btn-outline-warning"
                    : "btn btn-sm btn-outline-success",
                () => cambiarRolCliente(usuario)
            );

            contenedor.append(botonRol);
        }

        celdaAcciones.append(contenedor);
    });
}



async function cargarClientes() {
    const tabla = elemento("tablaClientes");
    const contador = elemento("totalClientes");

    mostrarCargando("tablaClientes", 7);

    try {
        const [clientes, usuarios] = await Promise.all([
            solicitar("/api/clientes"),
            solicitar("/api/admin/usuarios")
        ]);

        if (!Array.isArray(clientes)) {
            throw new Error(
                "El servidor no devolvió una lista de clientes."
            );
        }

        if (!Array.isArray(usuarios)) {
            throw new Error(
                "No se pudieron consultar los roles."
            );
        }

        clientesActuales = clientes;
        usuariosConRoles = usuarios;

        if (contador) {
            contador.textContent = clientes.length;
        }

        filtrarClientes();

    } catch (error) {
        if (contador) {
            contador.textContent = "—";
        }

        tabla.replaceChildren();

        mostrarVacio(
            "tablaClientes",
            7,
            "No se pudieron cargar los clientes"
        );

        mostrarMensaje(
            `Error al cargar clientes: ${error.message}`
        );

        console.error(error);
    }
}


// ==========================================
// BUSCADOR DE CLIENTES
// ==========================================

const buscadorClientes = elemento("filtroClientes");
const limpiarClientes = elemento("limpiarFiltroClientes");

if (buscadorClientes) {
    buscadorClientes.addEventListener(
        "input",
        filtrarClientes
    );
}

if (limpiarClientes) {
    limpiarClientes.addEventListener("click", () => {
        if (buscadorClientes) {
            buscadorClientes.value = "";
            buscadorClientes.focus({ preventScroll: true });
        }

        filtrarClientes();
    });
}


// ==========================================
// 6. NUEVO CLIENTE
// ==========================================

function nuevoCliente() {
    clienteForm.reset();

    elemento("clienteId").value = "";

    elemento("clienteModalTitulo").textContent =
        "Registrar nuevo cliente";

    registroSoapIncierto = false;

    actualizarBotonGuardar();
    guardarClienteButton.disabled = false;

    ocultarErrorModal();
    clienteModal.show();
}

// ==========================================
// 7. EDITAR CLIENTE
// ==========================================

function editarCliente(id) {
    const cliente = clientesActuales.find(
        item => String(item.id) === String(id)
    );

    if (!cliente) {
        mostrarMensaje(
            "No se encontró el cliente seleccionado."
        );
        return;
    }

    clienteForm.reset();

    elemento("clienteId").value =
        cliente.id;

    elemento("clienteNombres").value =
        cliente.nombres || "";

    elemento("clienteApellidos").value =
        cliente.apellidos || "";

    elemento("clienteDni").value =
        cliente.dni || "";

    elemento("clienteTelefono").value =
        cliente.telefono || "";

    elemento("clienteCorreo").value =
        cliente.correo || "";

    elemento("clienteModalTitulo").textContent =
        "Editar cliente";

    registroSoapIncierto = false;

    actualizarBotonGuardar();
    guardarClienteButton.disabled = false;

    ocultarErrorModal();
    clienteModal.show();
}

// ==========================================
// 8. GUARDAR CLIENTE
// ==========================================

clienteForm.addEventListener("submit", async evento => {
    evento.preventDefault();

    if (guardandoCliente || registroSoapIncierto) {
        return;
    }

    if (!clienteForm.reportValidity()) {
        return;
    }

    const id = elemento("clienteId").value;
    const editando = id !== "";

    const cliente = {
        nombres: elemento("clienteNombres").value.trim(),
        apellidos: elemento("clienteApellidos").value.trim(),
        dni: elemento("clienteDni").value.trim(),
        telefono: elemento("clienteTelefono").value.trim(),
        correo: elemento("clienteCorreo").value.trim()
    };

    ocultarErrorModal();
    establecerCargaGuardar(true);

    try {
        const url = editando
            ? `/api/clientes/${encodeURIComponent(id)}`
            : "/api/clientes";

        const resultado = await solicitar(url, {
            method: editando ? "PUT" : "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(cliente)
        });

        clienteModal.hide();

        const respuestaTexto =
            typeof resultado === "string"
                ? resultado
                : resultado?.mensaje;

        mostrarMensaje(
            respuestaTexto ||
            (editando
                ? "Cliente actualizado correctamente."
                : "Cliente registrado correctamente."),
            "success"
        );

        await cargarClientes();

    } catch (error) {
        const texto = error.message || "Error desconocido.";

        /*
         * Si SOAP creó el cliente, pero falló
         * una operación posterior, no debemos
         * repetir automáticamente el registro.
         */
        if (
            !editando &&
            texto.includes("El cliente fue registrado")
        ) {
            registroSoapIncierto = true;

            mostrarErrorModal(
                texto +
                " Cierra este formulario y revisa " +
                "la lista antes de intentar nuevamente."
            );

            await cargarClientes();

        } else {
            mostrarErrorModal(texto);
        }

        console.error(
            "Error al guardar cliente:",
            error
        );

    } finally {
        establecerCargaGuardar(false);
    }
});

// ==========================================
// 9. ELIMINAR CLIENTE
// ==========================================

async function eliminarCliente(id) {
    const cliente = clientesActuales.find(
        item => String(item.id) === String(id)
    );

    if (!cliente) {
        mostrarMensaje("No se encontró el cliente.");
        return;
    }

    const nombreCompleto =
        `${cliente.nombres || ""} ${cliente.apellidos || ""}`
            .trim();

    const confirmado = window.confirm(
        `¿Seguro que deseas eliminar a ${nombreCompleto}?\n\n` +
        "Esta operación puede afectar registros relacionados."
    );

    if (!confirmado) {
        return;
    }

    try {
        const resultado = await solicitar(
            `/api/clientes/${encodeURIComponent(id)}`,
            {
                method: "DELETE"
            }
        );

        const respuestaTexto =
            typeof resultado === "string"
                ? resultado
                : resultado?.mensaje;

        mostrarMensaje(
            respuestaTexto ||
            "Solicitud de eliminación procesada.",
            "success"
        );

        await cargarClientes();

    } catch (error) {
        mostrarMensaje(
            `No se pudo eliminar el cliente: ${error.message}`
        );

        console.error(error);
    }
}


// ==========================================
// 10. MASCOTAS
// ==========================================


function normalizarTextoMascota(valor) {
    return String(valor ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}

function obtenerNombreDueno(mascota) {
    const cliente = mascota.cliente;

    if (!cliente) {
        return "Sin cliente";
    }

    const nombres = cliente.nombres || "";
    const apellidos = cliente.apellidos || "";

    return `${nombres} ${apellidos}`.trim() || "Sin cliente";
}

function filtrarMascotas() {
    const tabla = elemento("tablaMascotas");
    const buscador = elemento("filtroMascotas");
    const resultado = elemento("resultadoFiltroMascotas");

    if (!tabla) return;

    const busqueda = normalizarTextoMascota(
        buscador?.value || ""
    );

    const mascotasFiltradas = mascotasActuales.filter(mascota => {
        const nombre = normalizarTextoMascota(mascota.nombre);
        const especie = normalizarTextoMascota(mascota.especie);
        const dueno = normalizarTextoMascota(
            obtenerNombreDueno(mascota)
        );

        return (
            nombre.includes(busqueda) ||
            especie.includes(busqueda) ||
            dueno.includes(busqueda)
        );
    });

    tabla.replaceChildren();

    if (resultado) {
        resultado.textContent =
            `Mostrando ${mascotasFiltradas.length} de ${mascotasActuales.length} mascotas`;
    }

    if (mascotasFiltradas.length === 0) {
        mostrarVacio(
            "tablaMascotas",
            5,
            busqueda
                ? "No se encontraron mascotas"
                : "No hay mascotas registradas"
        );
        return;
    }

    mascotasFiltradas.forEach(mascota => {
        agregarFila("tablaMascotas", [
            mascota.nombre,
            mascota.especie,
            mascota.raza || "Sin descripción",
            mascota.sexo,
            obtenerNombreDueno(mascota)
        ]);
    });
}

async function cargarMascotas() {
    const tabla = elemento("tablaMascotas");
    const contador = elemento("totalMascotas");

    mostrarCargando("tablaMascotas", 5);

    try {
        const mascotas = await solicitar("/api/mascotas");

        if (!Array.isArray(mascotas)) {
            throw new Error(
                "El servidor no devolvió una lista de mascotas."
            );
        }

        mascotasActuales = mascotas;

        if (contador) {
            contador.textContent = mascotas.length;
        }

        filtrarMascotas();

    } catch (error) {
        tabla.replaceChildren();

        if (contador) {
            contador.textContent = "—";
        }

        mostrarVacio(
            "tablaMascotas",
            5,
            "No se pudieron cargar las mascotas"
        );

        const resultado = elemento("resultadoFiltroMascotas");

        if (resultado) {
            resultado.textContent = "Error al cargar mascotas";
        }

        mostrarMensaje(
            `Error al cargar mascotas: ${error.message}`
        );

        console.error(error);
    }
}

// ==========================================
// BUSCADOR DE MASCOTAS
// ==========================================

const buscadorMascotas = elemento("filtroMascotas");
const limpiarMascotas = elemento("limpiarFiltroMascotas");

if (buscadorMascotas) {
    buscadorMascotas.addEventListener(
        "input",
        filtrarMascotas
    );
}

if (limpiarMascotas) {
    limpiarMascotas.addEventListener("click", () => {
        if (buscadorMascotas) {
            buscadorMascotas.value = "";
            buscadorMascotas.focus({ preventScroll: true });
        }

        filtrarMascotas();
    });
}


// ==========================================
// 11. MEDICAMENTOS
// ==========================================


async function cargarMedicamentos() {

    const contador = document.getElementById(
        "totalMedicamentos"
    );

    try {

        const medicamentos = await solicitar(
            "/api/medicamentos"
        );

        if (!Array.isArray(medicamentos)) {
            throw new Error(
                "Respuesta inválida de medicamentos"
            );
        }

        if (contador) {
            contador.textContent = medicamentos.length;
        }

    } catch (error) {

        if (contador) {
            contador.textContent = "—";
        }

        console.error(
            "Error al cargar medicamentos:",
            error
        );
    }
}



// ==========================================
// 12. CITAS VETERINARIAS
// ==========================================

function mostrarConfirmacionCita(codigo, accion, descripcion) {
    return new Promise(resolve => {

        const configuraciones = {
            confirmar: {
                titulo: "Confirmar cita",
                icono: "bi-calendar-check",
                color: "#0b8277",
                fondo: "#e5f5f1",
                boton: "Sí, confirmar",
                estado: "CONFIRMADA"
            },
            cancelar: {
                titulo: "Cancelar cita",
                icono: "bi-calendar-x",
                color: "#dc3545",
                fondo: "#fdebec",
                boton: "Sí, cancelar",
                estado: "CANCELADA"
            },
            atender: {
                titulo: "Marcar cita como atendida",
                icono: "bi-clipboard-check",
                color: "#0d6efd",
                fondo: "#eaf2ff",
                boton: "Sí, marcar atendida",
                estado: "ATENDIDA"
            }
        };

        const config = configuraciones[accion] ||
            configuraciones.confirmar;

        const fondo = document.createElement("div");
        fondo.className = "position-fixed top-0 start-0 w-100 h-100";
        fondo.style.cssText = `
            z-index: 12000;
            background: rgba(10, 25, 35, 0.55);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        `;

        const modal = document.createElement("div");
        modal.className = "bg-white rounded-4 shadow-lg p-4 text-center";
        modal.style.cssText = `
            width: 100%;
            max-width: 420px;
            color: #102f39;
        `;

        modal.setAttribute("role", "dialog");
        modal.setAttribute("aria-modal", "true");
        modal.setAttribute("aria-label", config.titulo);

        const iconoContenedor = document.createElement("div");
        iconoContenedor.className =
            "rounded-circle d-inline-flex align-items-center justify-content-center mb-3";

        iconoContenedor.style.cssText = `
            width: 70px;
            height: 70px;
            background: ${config.fondo};
            color: ${config.color};
        `;

        const icono = document.createElement("i");
        icono.className = `bi ${config.icono} fs-2`;
        iconoContenedor.append(icono);

        const titulo = document.createElement("h3");
        titulo.className = "h5 fw-bold mb-2";
        titulo.textContent = config.titulo;

        const descripcionModal = document.createElement("p");
        descripcionModal.className = "text-muted mb-3";
        descripcionModal.textContent =
            `¿Deseas ${descripcion} la cita #${codigo}?`;

        const estado = document.createElement("div");
        estado.className = "rounded-3 p-3 mb-4 small";
        estado.style.background = "#f3f6f8";
        estado.textContent = `Nuevo estado: ${config.estado}`;

        const botones = document.createElement("div");
        botones.className = "d-flex gap-2";

        const botonVolver = document.createElement("button");
        botonVolver.type = "button";
        botonVolver.className =
            "btn btn-outline-secondary flex-fill py-2";
        botonVolver.textContent = "Volver";

        const botonConfirmar = document.createElement("button");
        botonConfirmar.type = "button";
        botonConfirmar.className =
            "btn flex-fill py-2 text-white fw-semibold";
        botonConfirmar.style.backgroundColor = config.color;
        botonConfirmar.textContent = config.boton;

        botones.append(botonVolver, botonConfirmar);

        modal.append(
            iconoContenedor,
            titulo,
            descripcionModal,
            estado,
            botones
        );

        fondo.append(modal);
        document.body.append(fondo);

        const elementoAnterior = document.activeElement;
        botonVolver.focus();

        let finalizado = false;

        function cerrar(resultado) {
            if (finalizado) return;
            finalizado = true;

            document.removeEventListener("keydown", manejarTeclado);
            fondo.remove();

            if (elementoAnterior?.isConnected) {
                elementoAnterior.focus({ preventScroll: true });
            }

            resolve(resultado);
        }

        function manejarTeclado(evento) {
            if (evento.key === "Escape") {
                evento.preventDefault();
                cerrar(false);
            }

            if (evento.key === "Tab") {
                const siguiente = evento.shiftKey
                    ? botonVolver
                    : botonConfirmar;

                if (document.activeElement ===
                    (evento.shiftKey ? botonVolver : botonConfirmar)) {
                    evento.preventDefault();
                    (evento.shiftKey
                        ? botonConfirmar
                        : botonVolver).focus();
                }
            }
        }

        botonVolver.addEventListener("click", () => cerrar(false));
        botonConfirmar.addEventListener("click", () => cerrar(true));

        fondo.addEventListener("click", evento => {
            if (evento.target === fondo) cerrar(false);
        });

        document.addEventListener("keydown", manejarTeclado);
    });
}


let procesandoCita = false;

async function cambiarEstadoCita(codigo, accion, descripcion) {
    if (procesandoCita) {
        return;
    }

    const confirmado = await mostrarConfirmacionCita(
        codigo,
        accion,
        descripcion
    );

    if (!confirmado) {
        return;
    }

    procesandoCita = true;

    try {
        const resultado = await solicitar(
            `/api/citas/${encodeURIComponent(codigo)}/${accion}`,
            {
                method: "PUT"
            }
        );

        const citaActualizada = await solicitar(
            `/api/citas/${encodeURIComponent(codigo)}`
        );

        const estadosEsperados = {
            confirmar: "CONFIRMADA",
            cancelar: "CANCELADA",
            atender: "ATENDIDA"
        };

        const estadoEsperado = estadosEsperados[accion];

        const estadoActual = String(
            citaActualizada?.estado || ""
        ).trim().toUpperCase();

        if (estadoActual !== estadoEsperado) {
            const detalle =
                typeof resultado === "string"
                    ? resultado
                    : resultado?.mensaje;

            throw new Error(
                detalle ||
                "No se pudo comprobar el nuevo estado de la cita."
            );
        }


        const posicionActual = window.scrollY;

        await cargarCitas();

        // Restaurar la posición después de actualizar la tabla.
        window.scrollTo({
            top: posicionActual,
            left: 0,
            behavior: "instant"
        });

        if (typeof window.actualizarCalendarioCitas === "function") {
            await window.actualizarCalendarioCitas();
        }

        const mensajeResultado =
            typeof resultado === "string"
                ? resultado
                : resultado?.mensaje;

        mostrarMensaje(
            mensajeResultado ||
            "Estado de la cita actualizado correctamente.",
            "success"
        );

    } catch (error) {
        mostrarMensaje(
            `No se pudo actualizar la cita: ${error.message}`
        );

        console.error(error);

    } finally {
        procesandoCita = false;
    }
}

function normalizarBusqueda(valor) {
    return String(valor ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}


function obtenerPropietarioCita(cita) {
    const cliente = cita.mascota?.cliente;

    if (!cliente) {
        return "Sin propietario";
    }

    const nombres = String(cliente.nombres ?? "").trim();
    const apellidos = String(cliente.apellidos ?? "").trim();

    return [nombres, apellidos]
        .filter(Boolean)
        .join(" ") || "Sin propietario";
}


/* ==========================================
   ORDEN PROFESIONAL DE CITAS
   ========================================== */

function prioridadEstadoCita(estado) {
    const prioridades = {
        PENDIENTE: 0,
        CONFIRMADA: 1,
        ATENDIDA: 2,
        CANCELADA: 3
    };

    return prioridades[String(estado ?? "").trim().toUpperCase()] ?? 4;
}

function fechaHoraCita(cita) {
    const fecha = String(cita.fecha ?? "").substring(0, 10);
    const hora = String(cita.hora ?? "00:00:00");

    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
        return Number.POSITIVE_INFINITY;
    }

    const valor = new Date(`${fecha}T${hora}`).getTime();

    return Number.isNaN(valor)
        ? Number.POSITIVE_INFINITY
        : valor;
}


function ordenarCitasAdministrativas(citas) {
    const orden = elemento("ordenCitas")?.value || "PROXIMA";

    return [...citas].sort((a, b) => {
        const diferenciaEstado =
            prioridadEstadoCita(a.estado) -
            prioridadEstadoCita(b.estado);

        if (diferenciaEstado !== 0) {
            return diferenciaEstado;
        }

        if (orden === "RECIENTE") {
            // ID descendente como aproximación al registro reciente.
            return (Number(b.id) || 0) - (Number(a.id) || 0);
        }

        const estado = String(a.estado ?? "")
            .trim()
            .toUpperCase();

        const diferenciaFecha =
            fechaHoraCita(a) - fechaHoraCita(b);

        if (estado === "PENDIENTE" ||
            estado === "CONFIRMADA") {

            if (diferenciaFecha !== 0) {
                return diferenciaFecha;
            }
        }

        return (Number(b.id) || 0) - (Number(a.id) || 0);
    });
}


let vistaCitasActual = "PENDIENTES";

function cambiarVistaCitas(vista) {
    vistaCitasActual = vista;

    const botones = {
        PENDIENTES: "vistaCitasPendientes",
        TODAS: "vistaCitasTodas",
        HISTORIAL: "vistaCitasHistorial"
    };

    Object.entries(botones).forEach(([clave, id]) => {
        const boton = elemento(id);
        if (!boton) return;

        const activo = clave === vista;

        boton.classList.toggle("btn-primary", activo);
        boton.classList.toggle("btn-outline-primary", !activo);
        boton.setAttribute("aria-pressed", String(activo));
    });

    aplicarFiltrosCitas();
}


function aplicarFiltrosCitas() {
    const busqueda = normalizarBusqueda(
        elemento("filtroMascota")?.value
    );

    const fecha = elemento("filtroFecha")?.value || "";

    const estadoFiltro =
        elemento("filtroEstado")?.value || "TODOS";

    const citasFiltradas = citasDisponibles.filter(cita => {
        const mascota = normalizarBusqueda(
            cita.mascota?.nombre
        );

        const propietario = normalizarBusqueda(
            obtenerPropietarioCita(cita)
        );

        const id = String(cita.id ?? "");

        const fechaCita = String(cita.fecha ?? "")
            .substring(0, 10);

        const estado = String(cita.estado ?? "")
            .trim()
            .toUpperCase();

        const coincideBusqueda =
            !busqueda ||
            mascota.includes(busqueda) ||
            propietario.includes(busqueda) ||
            id.includes(busqueda);

        const coincideFecha =
            !fecha || fechaCita === fecha;

        const coincideEstado =
            estadoFiltro === "TODOS" ||
            estado === estadoFiltro;

        const coincideVista =
            vistaCitasActual === "TODAS" ||
            (vistaCitasActual === "PENDIENTES" &&
                estado === "PENDIENTE") ||
            (vistaCitasActual === "HISTORIAL" &&
                (estado === "ATENDIDA" || estado === "CANCELADA"));

        return coincideBusqueda &&
            coincideFecha &&
            coincideEstado &&
            coincideVista;

    });

    mostrarCitasFiltradas(
        ordenarCitasAdministrativas(citasFiltradas)
    );

    const resultado = elemento("resultadoFiltroCitas");

    if (resultado) {
        resultado.textContent =
            `Mostrando ${citasFiltradas.length} de ` +
            `${citasDisponibles.length} citas`;
    }
}

function mostrarCitasFiltradas(citas) {
    const tabla = elemento("tablaCitas");

    tabla.replaceChildren();

    if (citas.length === 0) {
        mostrarVacio(
            "tablaCitas",
            7,
            "No se encontraron citas con estos filtros"
        );
        return;
    }

    citas.forEach(cita => {
        const fila = agregarFila("tablaCitas", [
            cita.id,
            cita.mascota?.nombre || "Sin mascota",
            obtenerPropietarioCita(cita),
            cita.fecha,
            cita.hora,
            cita.motivo,
            cita.estado
        ]);

        const celdaAcciones = fila.insertCell();

        const contenedor = document.createElement("div");

        contenedor.className =
            "d-flex align-items-center gap-2 flex-wrap";

        const estado = String(cita.estado || "")
            .trim()
            .toUpperCase();

        if (estado === "PENDIENTE") {
            contenedor.append(
                crearBoton(
                    "Confirmar",
                    "check-circle",
                    "btn btn-sm btn-outline-success",
                    () => cambiarEstadoCita(
                        cita.id,
                        "confirmar",
                        "confirmar"
                    )
                )
            );
        }

        if (
            estado === "PENDIENTE" ||
            estado === "CONFIRMADA"
        ) {
            contenedor.append(
                crearBoton(
                    "Cancelar",
                    "x-circle",
                    "btn btn-sm btn-outline-danger",
                    () => cambiarEstadoCita(
                        cita.id,
                        "cancelar",
                        "cancelar"
                    )
                )
            );
        }

        if (estado === "CONFIRMADA") {
            contenedor.append(
                crearBoton(
                    "Atendida",
                    "clipboard-check",
                    "btn btn-sm btn-outline-primary",
                    () => cambiarEstadoCita(
                        cita.id,
                        "atender",
                        "marcar como atendida"
                    )
                )
            );
        }

        if (contenedor.childElementCount === 0) {
            const etiqueta = document.createElement("span");

            etiqueta.className = "text-muted small";
            etiqueta.textContent = "Sin acciones";

            contenedor.append(etiqueta);
        }

        celdaAcciones.append(contenedor);
    });
}


function actualizarEstadisticasCitas() {
    const citas = citasDisponibles;

    const pendientes = citas.filter(c =>
        String(c.estado ?? "").trim().toUpperCase() === "PENDIENTE"
    ).length;

    const confirmadas = citas.filter(c =>
        String(c.estado ?? "").trim().toUpperCase() === "CONFIRMADA"
    ).length;

    const hoy = new Date();
    const fechaHoy =
        `${hoy.getFullYear()}-` +
        `${String(hoy.getMonth() + 1).padStart(2, "0")}-` +
        `${String(hoy.getDate()).padStart(2, "0")}`;

    const citasHoy = citas.filter(c =>
        String(c.fecha ?? "").substring(0, 10) === fechaHoy &&
        String(c.estado ?? "").trim().toUpperCase() !== "CANCELADA"
    ).length;

    const actualizar = (id, valor) => {
        const nodo = elemento(id);
        if (nodo) nodo.textContent = valor;
    };

    actualizar("citasPendientesTotal", pendientes);
    actualizar("citasConfirmadasTotal", confirmadas);
    actualizar("citasHoyTotal", citasHoy);
}


async function cargarCitas() {
    const tabla = elemento("tablaCitas");
    const contador = elemento("totalCitas");

    mostrarCargando("tablaCitas", 8);

    try {
        const citas = await solicitar("/api/citas");

        if (!Array.isArray(citas)) {
            throw new Error(
                "El servidor no devolvió una lista de citas."
            );
        }

        citasDisponibles = citas;

        actualizarEstadisticasCitas();

        if (contador) {
            contador.textContent = citas.length;
        }

        aplicarFiltrosCitas();

    } catch (error) {
        citasDisponibles = [];

        [
            "citasPendientesTotal",
            "citasConfirmadasTotal",
            "citasHoyTotal"
        ].forEach(id => {
            const nodo = elemento(id);

            if (nodo) {
                nodo.textContent = "—";
            }
        });

        if (contador) {
            contador.textContent = "—";
        }

        tabla.replaceChildren();

        mostrarVacio(
            "tablaCitas",
            8,
            "No se pudieron cargar las citas"
        );

        mostrarMensaje(
            `Error al cargar citas: ${error.message}`
        );

        console.error(
            "Error al cargar citas:",
            error
        );
    }
}

function inicializarFiltrosCitas() {
    const buscador = elemento("filtroMascota");
    const fecha = elemento("filtroFecha");
    const estado = elemento("filtroEstado");
    const limpiar = elemento("limpiarFiltrosCitas");

    if (buscador) {
        buscador.addEventListener(
            "input",
            aplicarFiltrosCitas
        );
    }

    if (fecha) {
        fecha.addEventListener(
            "change",
            aplicarFiltrosCitas
        );
    }

    if (estado) {
        estado.addEventListener(
            "change",
            aplicarFiltrosCitas
        );
    }

    if (limpiar) {
        limpiar.addEventListener("click", () => {
            if (buscador) buscador.value = "";
            if (fecha) fecha.value = "";
            if (estado) estado.value = "TODOS";

            aplicarFiltrosCitas();
        });
    }
}

// Inicializar los filtros cuando el HTML esté disponible.
if (document.readyState === "loading") {
    document.addEventListener(
        "DOMContentLoaded",
        inicializarFiltrosCitas,
        { once: true }
    );
} else {
    inicializarFiltrosCitas();
}



// ==========================================
// 13. NAVEGACIÓN LATERAL
// ==========================================

const enlacesNavegacion =
    document.querySelectorAll(".sidebar-nav a");

// Secciones disponibles del panel administrativo.
const seccionesAdmin = [
    "inicio",
    "clientes",
    "mascotas",
    "medicamentos",
    "calendario-citas",
    "citas"
];

function mostrarSeccionAdmin(idSeccion) {

    // Si la sección no existe, mostrar Inicio.
    if (!seccionesAdmin.includes(idSeccion)) {
        idSeccion = "inicio";
    }

    // Mostrar solamente la sección seleccionada.

    seccionesAdmin.forEach(id => {
        const seccion = document.getElementById(id);

        if (!seccion) {
            console.warn(`No se encontró la sección: ${id}`);
            return;
        }

        const visible = id === idSeccion;

        seccion.hidden = !visible;
        seccion.style.setProperty(
            "display",
            visible ? "block" : "none",
            "important"
        );
    });


    // Actualizar la opción activa del menú.
    enlacesNavegacion.forEach(enlace => {
        const destino = enlace.getAttribute("href");

        const activo = destino === `#${idSeccion}`;

        enlace.classList.toggle("active", activo);

        if (activo) {
            enlace.setAttribute("aria-current", "page");
        } else {
            enlace.removeAttribute("aria-current");
        }
    });
}

// Navegar al seleccionar una opción del menú.
enlacesNavegacion.forEach(enlace => {

    const destino = enlace.getAttribute("href");

    if (!destino || !destino.startsWith("#")) {
        return;
    }

    const idSeccion = destino.substring(1);

    if (!seccionesAdmin.includes(idSeccion)) {
        return;
    }

    enlace.addEventListener("click", event => {
        event.preventDefault();

        // Actualizar la URL sin recargar la página.
        history.pushState(null, "", `#${idSeccion}`);

        mostrarSeccionAdmin(idSeccion);
    });
});

// Restaurar la sección al actualizar la página.
function restaurarSeccionAdmin() {
    const idSeccion = window.location.hash.substring(1);

    mostrarSeccionAdmin(idSeccion || "inicio");
}

// Permitir navegación con Atrás y Adelante.
window.addEventListener("popstate", restaurarSeccionAdmin);

// Inicializar la navegación.
restaurarSeccionAdmin();


// ==========================================
// 14. EVENTOS
// ==========================================

elemento("nuevoClienteButton")
    .addEventListener("click", nuevoCliente);

elemento("logoutButton")
    .addEventListener("click", async () => {
        const boton = elemento("logoutButton");

        boton.disabled = true;

        try {
            await solicitar("/api/auth/logout", {
                method: "POST"
            });

            window.location.replace("/login.html");

        } catch (error) {
            mostrarMensaje(error.message);
            boton.disabled = false;
        }
    });

// ==========================================
// 15. INICIAR PANEL
// ==========================================

async function iniciarAdministrador() {
    try {
        ocultarMensaje();

        const permitido = await verificarAdministrador();

        if (!permitido) {
            return;
        }

        await Promise.all([
            cargarClientes(),
            cargarMascotas(),
            cargarMedicamentos(),
            cargarCitas()
        ]);

        console.log(
            "Panel de administración inicializado."
        );

    } catch (error) {
        mostrarMensaje(error.message);
        console.error(error);
    }
}

iniciarAdministrador();


elemento("vistaCitasPendientes")?.addEventListener("click", () => {
    cambiarVistaCitas("PENDIENTES");
});

elemento("vistaCitasTodas")?.addEventListener("click", () => {
    cambiarVistaCitas("TODAS");
});

elemento("vistaCitasHistorial")?.addEventListener("click", () => {
    cambiarVistaCitas("HISTORIAL");
});

elemento("ordenCitas")?.addEventListener("change", () => {
    aplicarFiltrosCitas();
});
