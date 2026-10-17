"use strict";

// ==========================================
// VETCENTER - ADMINISTRACIÓN DE TIENDA
// ==========================================

const API_PRODUCTOS = "/api/productos";

const $ = id => document.getElementById(id);

let productos = [];
let categorias = [];
let categoriasMedicamentosAdmin = [];
let tipoCategoriaActual = "productos";
let categoriaEditandoId = null;
let tipoCategoriaEditando = null;
let guardando = false;

const modalProducto = bootstrap.Modal.getOrCreateInstance(
    $("modalProducto")
);

const modalCategoria = bootstrap.Modal.getOrCreateInstance(
    $("modalCategoria")
);

// ==========================================
// PETICIONES HTTP
// ==========================================

async function solicitarTienda(url, opciones = {}) {
    const respuesta = await fetch(url, {
        ...opciones,
        credentials: "same-origin"
    });

    if (respuesta.status === 401) {
        window.location.replace("/login.html");
        throw new Error("Debes iniciar sesión.");
    }

    const texto = await respuesta.text();
    let datos = texto;

    if (texto) {
        try {
            datos = JSON.parse(texto);
        } catch {
            // Los métodos SOAP pueden devolver texto.
        }
    }

    if (!respuesta.ok) {
        throw new Error(
            typeof datos === "string"
                ? datos
                : datos?.mensaje || `Error HTTP ${respuesta.status}`
        );
    }

    return datos;
}


let temporizadorNotificacionTienda = null;

function notificar(texto, tipo = "success") {
    const alerta = $("mensajeTienda");

    // Cancelar el temporizador anterior
    if (temporizadorNotificacionTienda !== null) {
        clearTimeout(temporizadorNotificacionTienda);
    }

    // Mostrar la notificación
    alerta.textContent = texto;
    alerta.className = `alert alert-${tipo}`;
    alerta.classList.remove("d-none");

    alerta.scrollIntoView({
        behavior: "smooth",
        block: "nearest"
    });

    // Ocultar automáticamente después de 4 segundos
    temporizadorNotificacionTienda = setTimeout(() => {
        alerta.classList.add("d-none");
        temporizadorNotificacionTienda = null;
    }, 4000);
}

function normalizar(valor) {
    return String(valor ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}

function precioSoles(valor) {
    return new Intl.NumberFormat("es-PE", {
        style: "currency",
        currency: "PEN"
    }).format(Number(valor) || 0);
}

function celda(fila, contenido) {
    const td = fila.insertCell();
    td.textContent = String(contenido ?? "—");
    return td;
}

function boton(texto, clase, accion) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `btn btn-sm ${clase}`;
    btn.textContent = texto;
    btn.addEventListener("click", accion);
    return btn;
}

function obtenerCategoria(producto) {
    return producto.categoria?.nombre || "Sin categoría";
}

// ==========================================
// SEGURIDAD
// ==========================================

async function verificarAdminTienda() {
    const perfil = await solicitarTienda("/api/auth/perfil");

    if (String(perfil.rol || "").toUpperCase() !== "ADMIN") {
        window.location.replace("/dashboard.html");
        return false;
    }

    return true;
}

// ==========================================
// CARGAR DATOS
// ==========================================

async function cargarTienda() {
    const [listaProductos, listaCategorias] = await Promise.all([
        solicitarTienda(`${API_PRODUCTOS}/admin/todos`),
        solicitarTienda(`${API_PRODUCTOS}/categorias`)
    ]);

    if (!Array.isArray(listaProductos) ||
        !Array.isArray(listaCategorias)) {
        throw new Error("La API no devolvió listas válidas.");
    }

    productos = listaProductos;
    categorias = listaCategorias;

    actualizarEstadisticas();
    llenarSelectCategorias();
    mostrarProductos();
    mostrarCategorias();
}

function actualizarEstadisticas() {
    $("totalProductos").textContent = productos.length;

    $("productosActivos").textContent =
        productos.filter(p => p.activo === true).length;

    $("stockBajo").textContent =
        productos.filter(p =>
            p.activo === true && Number(p.stock) <= 10
        ).length;

    $("totalCategorias").textContent = categorias.length;
}

function llenarSelectCategorias() {
    const filtro = $("filtroCategoria");
    const formulario = $("productoCategoria");

    const filtroActual = filtro.value;
    const categoriaActual = formulario.value;

    filtro.replaceChildren();
    formulario.replaceChildren();

    filtro.add(new Option("Todas", ""));
    formulario.add(new Option("Seleccionar", ""));

    categorias.forEach(categoria => {
        filtro.add(new Option(categoria.nombre, categoria.id));
        formulario.add(new Option(categoria.nombre, categoria.id));
    });

    filtro.value = filtroActual;
    formulario.value = categoriaActual;
}

// ==========================================
// TABLA DE PRODUCTOS
// ==========================================

function mostrarProductos() {
    const tbody = $("tablaProductos");
    tbody.replaceChildren();

    const busqueda = normalizar($("buscarProducto").value);
    const categoria = $("filtroCategoria").value;
    const estado = $("filtroEstado").value;

    const filtrados = productos.filter(p => {
        const coincideTexto =
            normalizar(p.nombre).includes(busqueda) ||
            normalizar(p.descripcion).includes(busqueda);

        const coincideCategoria =
            !categoria ||
            String(p.categoria?.id) === categoria;

        const coincideEstado =
            !estado ||
            (estado === "activo" && p.activo === true) ||
            (estado === "inactivo" && p.activo !== true);

        return coincideTexto &&
            coincideCategoria &&
            coincideEstado;
    });

    $("conteoFiltrado").textContent =
        `Mostrando ${filtrados.length} de ${productos.length} productos`;

    if (filtrados.length === 0) {
        const fila = tbody.insertRow();
        const td = celda(fila, "No se encontraron productos.");
        td.colSpan = 7;
        td.className = "text-center text-muted py-4";
        return;
    }

    filtrados.forEach(producto => {
        const fila = tbody.insertRow();

        const tdImagen = fila.insertCell();
        const imagen = document.createElement("img");
        imagen.className = "producto-miniatura";
        imagen.alt = producto.nombre || "Producto";

        if (producto.imagenUrl) {
            imagen.src = producto.imagenUrl;
        } else {
            imagen.classList.add("d-none");
        }

        imagen.onerror = () => {
            imagen.classList.add("d-none");
        };

        const icono = document.createElement("i");
        icono.className = "bi bi-box-seam fs-3 text-secondary";

        tdImagen.append(imagen, icono);

        if (producto.imagenUrl) {
            icono.classList.add("d-none");
            imagen.onerror = () => {
                imagen.classList.add("d-none");
                icono.classList.remove("d-none");
            };
        }

        const tdNombre = fila.insertCell();
        const nombre = document.createElement("strong");
        nombre.textContent = producto.nombre || "Sin nombre";

        const descripcion = document.createElement("div");
        descripcion.className = "small text-muted";
        descripcion.textContent = producto.descripcion || "";

        tdNombre.append(nombre, descripcion);

        celda(fila, obtenerCategoria(producto));
        celda(fila, precioSoles(producto.precio));

        const tdStock = fila.insertCell();
        const etiquetaStock = document.createElement("span");
        const stock = Number(producto.stock) || 0;

        etiquetaStock.className =
            stock <= 10 ? "badge text-bg-warning" :
                "badge text-bg-light";

        etiquetaStock.textContent = `${stock} unidades`;
        tdStock.append(etiquetaStock);

        const tdEstado = fila.insertCell();
        const etiquetaEstado = document.createElement("span");

        etiquetaEstado.className = producto.activo === true
            ? "badge text-bg-success"
            : "badge text-bg-secondary";

        etiquetaEstado.textContent = producto.activo === true
            ? "Activo"
            : "Inactivo";

        tdEstado.append(etiquetaEstado);

        const tdAcciones = fila.insertCell();
        const acciones = document.createElement("div");
        acciones.className = "d-flex gap-2 flex-wrap";

        acciones.append(
            boton("Editar", "btn-outline-primary",
                () => editarProducto(producto.id))
        );

        if (producto.activo === true) {
            acciones.append(
                boton("Desactivar", "btn-outline-danger",
                    () => desactivarProducto(producto.id))
            );
        }

        tdAcciones.append(acciones);
    });
}

// ==========================================
// CREAR Y EDITAR PRODUCTOS
// ==========================================

function nuevoProducto() {
    $("formProducto").reset();
    $("productoId").value = "";
    $("productoActivo").value = "true";
    $("tituloModalProducto").textContent = "Nuevo producto";
    actualizarVistaPrevia();
    modalProducto.show();
}

function editarProducto(id) {
    const p = productos.find(item =>
        String(item.id) === String(id)
    );

    if (!p) {
        notificar("No se encontró el producto.", "danger");
        return;
    }

    $("productoId").value = p.id;
    $("productoNombre").value = p.nombre || "";
    $("productoDescripcion").value = p.descripcion || "";
    $("productoCategoria").value = p.categoria?.id ?? "";
    $("productoPrecio").value = p.precio ?? "";
    $("productoStock").value = p.stock ?? 0;
    $("productoImagen").value = p.imagenUrl || "";
    $("productoActivo").value = String(p.activo === true);

    $("tituloModalProducto").textContent = "Editar producto";
    actualizarVistaPrevia();
    modalProducto.show();
}

function actualizarVistaPrevia() {
    const img = $("vistaPreviaProducto");
    const url = $("productoImagen").value.trim();

    img.classList.add("d-none");
    img.removeAttribute("src");

    if (!url) return;

    img.onload = () => img.classList.remove("d-none");
    img.onerror = () => img.classList.add("d-none");
    img.src = url;
}

async function guardarProducto(evento) {
    evento.preventDefault();

    if (guardando || !$("formProducto").reportValidity()) return;

    const id = $("productoId").value;
    const categoriaId = Number($("productoCategoria").value);

    const categoria = categorias.find(c =>
        Number(c.id) === categoriaId
    );

    if (!categoria) {
        notificar("Selecciona una categoría válida.", "warning");
        return;
    }

    const datos = {
        nombre: $("productoNombre").value.trim(),
        descripcion: $("productoDescripcion").value.trim(),
        categoria: {
            id: categoria.id,
            nombre: categoria.nombre,
            descripcion: categoria.descripcion || ""
        },
        precio: Number($("productoPrecio").value),
        stock: Number($("productoStock").value),
        imagenUrl: $("productoImagen").value.trim(),
        activo: $("productoActivo").value === "true"
    };

    if (!datos.nombre ||
        !Number.isFinite(datos.precio) ||
        datos.precio <= 0 ||
        !Number.isInteger(datos.stock) ||
        datos.stock < 0) {
        notificar("Revisa el nombre, precio y stock.", "warning");
        return;
    }

    guardando = true;
    $("guardarProducto").disabled = true;

    try {
        const resultado = await solicitarTienda(
            id ? `${API_PRODUCTOS}/${encodeURIComponent(id)}`
                : API_PRODUCTOS,
            {
                method: id ? "PUT" : "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify(datos)
            }
        );

        // El controlador actual devuelve un String SOAP.
        // Se muestra el resultado y se verifica con una nueva lectura.
        modalProducto.hide();
        await cargarTienda();

        notificar(
            typeof resultado === "string"
                ? resultado
                : "Solicitud procesada. Catálogo actualizado."
        );

    } catch (error) {
        notificar(`No se pudo guardar: ${error.message}`, "danger");
        console.error(error);
    } finally {
        guardando = false;
        $("guardarProducto").disabled = false;
    }
}


function confirmarDesactivacionProducto(nombre) {
    return new Promise(resolve => {
        const elemento = $("modalDesactivarProducto");
        const boton = $("confirmarDesactivarProducto");
        const nombreElemento = $("nombreProductoDesactivar");

        if (!elemento || !boton || !nombreElemento) {
            console.error(
                "No se encontró el modal de desactivación."
            );
            resolve(false);
            return;
        }

        nombreElemento.textContent = nombre || "Sin nombre";

        const modal = bootstrap.Modal.getOrCreateInstance(
            elemento
        );

        let confirmado = false;

        const confirmar = () => {
            confirmado = true;
            boton.disabled = true;
            modal.hide();
        };

        const cerrar = () => {
            boton.removeEventListener("click", confirmar);
            elemento.removeEventListener(
                "hidden.bs.modal",
                cerrar
            );

            boton.disabled = false;
            resolve(confirmado);
        };

        boton.addEventListener("click", confirmar);
        elemento.addEventListener("hidden.bs.modal", cerrar);

        modal.show();
    });
}

async function desactivarProducto(id) {

    // Buscar el producto seleccionado
    const producto = productos.find(
        item => String(item.id) === String(id)
    );

    if (!producto) {
        notificar("No se encontró el producto seleccionado.", "danger");
        return;
    }

    // Mostrar el modal personalizado
    const confirmado = await confirmarDesactivacionProducto(
        producto.nombre
    );

    // Si presiona Cancelar o cierra el modal, no hacer nada
    if (!confirmado) {
        return;
    }

    try {
        // Mantener el endpoint original
        const resultado = await solicitarTienda(
            `${API_PRODUCTOS}/${encodeURIComponent(id)}`,
            {
                method: "DELETE"
            }
        );

        // Actualizar los productos en pantalla
        await cargarTienda();

        // Mostrar el resultado
        notificar(
            typeof resultado === "string"
                ? resultado
                : "Producto desactivado correctamente."
        );

    } catch (error) {
        notificar(
            "No se pudo desactivar el producto: " + error.message,
            "danger"
        );

        console.error(error);
    }
}

// ==========================================
// CATEGORÍAS DE PRODUCTOS Y MEDICAMENTOS
// ==========================================

async function cargarCategoriasMedicamentosAdmin() {
    const mensaje = $("mensajeCategoriasAdmin");

    try {
        const lista = await solicitarTienda(
            "/api/medicamentos/categorias"
        );

        if (!Array.isArray(lista)) {
            throw new Error(
                "La API no devolvió una lista válida."
            );
        }

        categoriasMedicamentosAdmin = lista;

        if (mensaje) mensaje.textContent = "";

        mostrarCategorias();

    } catch (error) {
        categoriasMedicamentosAdmin = [];

        if (mensaje) {
            mensaje.textContent =
                "Error al cargar categorías: " + error.message;
        }

        mostrarCategorias();
        throw error;
    }
}

function cambiarTipoCategorias(tipo) {
    tipoCategoriaActual =
        tipo === "medicamentos"
            ? "medicamentos"
            : "productos";

    const esMedicamento =
        tipoCategoriaActual === "medicamentos";

    const botonProductos = $("tabCategoriasProductos");
    const botonMedicamentos = $("tabCategoriasMedicamentos");

    botonProductos.className = esMedicamento
        ? "btn btn-outline-primary"
        : "btn btn-primary";

    botonMedicamentos.className = esMedicamento
        ? "btn btn-primary"
        : "btn btn-outline-primary";

    botonProductos.setAttribute(
        "aria-pressed",
        String(!esMedicamento)
    );

    botonMedicamentos.setAttribute(
        "aria-pressed",
        String(esMedicamento)
    );

    $("tituloListadoCategorias").textContent =
        esMedicamento
            ? "Categorías de medicamentos"
            : "Categorías de productos";

    mostrarCategorias();

    if (esMedicamento) {
        cargarCategoriasMedicamentosAdmin()
            .catch(console.error);
    }
}



function mostrarCategorias() {
    const tbody = $("tablaCategorias");
    tbody.replaceChildren();

    // Seleccionar las categorías según la pestaña activa
    const lista = tipoCategoriaActual === "medicamentos"
        ? categoriasMedicamentosAdmin
        : categorias;

    // Mostrar mensaje cuando no hay categorías
    if (!Array.isArray(lista) || lista.length === 0) {
        const fila = tbody.insertRow();

        const td = celda(
            fila,
            "No hay categorías registradas."
        );

        td.colSpan = 4;
        td.className = "text-center text-muted py-4";
        return;
    }

    // Mostrar las categorías
    lista.forEach(categoria => {
        const fila = tbody.insertRow();

        // ID
        celda(fila, categoria.id);

        // Nombre
        celda(fila, categoria.nombre);

        // Descripción
        celda(fila, categoria.descripcion || "Sin descripción");

        // ==========================================
        // COLUMNA ACCIONES
        // ==========================================

        const acciones = fila.insertCell();
        acciones.className = "text-nowrap";

        // ==========================================
        // BOTÓN EDITAR
        // ==========================================

        const btnEditar = document.createElement("button");

        btnEditar.type = "button";
        btnEditar.className =
            "btn btn-sm btn-outline-primary me-2";

        btnEditar.innerHTML =
            '<i class="bi bi-pencil-square me-1"></i>Editar';

        btnEditar.title = "Editar categoría";

        btnEditar.addEventListener("click", () => {
            // Abrir el formulario con los datos existentes
            editarCategoria(categoria);
        });

        // ==========================================
        // BOTÓN ELIMINAR
        // ==========================================

        const btnEliminar = document.createElement("button");

        btnEliminar.type = "button";
        btnEliminar.className =
            "btn btn-sm btn-outline-danger";

        btnEliminar.innerHTML =
            '<i class="bi bi-trash3 me-1"></i>Eliminar';

        btnEliminar.title = "Eliminar categoría";

        btnEliminar.addEventListener("click", () => {
            // Mantener la eliminación que ya funciona
            eliminarCategoria(categoria);
        });

        // Agregar los botones a la tabla
        acciones.append(btnEditar, btnEliminar);
    });
}


function editarCategoria(categoria) {
    console.log("Botón Editar presionado:", categoria);

    try {
        if (!categoria || categoria.id == null) {
            throw new Error("La categoría no tiene un ID válido.");
        }

        const formulario = $("formCategoria");
        const modalElemento = $("modalCategoria");

        if (!formulario || !modalElemento) {
            throw new Error(
                "No se encontró el formulario o modal de categorías."
            );
        }

        categoriaEditandoId = categoria.id;
        tipoCategoriaEditando = tipoCategoriaActual;

        formulario.reset();

        $("categoriaNombre").value = categoria.nombre || "";
        $("categoriaDescripcion").value =
            categoria.descripcion || "";

        $("tituloModalCategoria").textContent =
            tipoCategoriaActual === "medicamentos"
                ? "Editar categoría de medicamentos"
                : "Editar categoría de productos";

        $("tipoCategoriaModal").textContent =
            "Modifica el nombre o la descripción de la categoría.";

        $("guardarCategoria").textContent = "Guardar cambios";

        const modal = bootstrap.Modal.getOrCreateInstance(
            modalElemento
        );

        modal.show();

        console.log("Modal de edición abierto correctamente.");

    } catch (error) {
        console.error("Error al editar categoría:", error);

        notificar(
            "No se pudo abrir el formulario: " + error.message,
            "danger"
        );
    }
}

async function eliminarCategoria(categoria) {
    const tipo = tipoCategoriaActual;
    const esMedicamento = tipo === "medicamentos";

    const modalElemento = $("modalEliminarCategoria");
    const modal = bootstrap.Modal.getOrCreateInstance(
        modalElemento
    );

    const botonConfirmar = $("confirmarEliminarCategoria");

    $("nombreCategoriaEliminar").textContent =
        `"${categoria.nombre}"`;

    // Evitar que queden eventos anteriores
    const nuevoBoton = botonConfirmar.cloneNode(true);
    botonConfirmar.replaceWith(nuevoBoton);

    nuevoBoton.addEventListener("click", async () => {
        nuevoBoton.disabled = true;
        nuevoBoton.innerHTML =
            '<span class="spinner-border spinner-border-sm me-2"></span>Eliminando...';

        const rutaBase = esMedicamento
            ? "/api/medicamentos/categorias"
            : `${API_PRODUCTOS}/categorias`;

        try {
            const resultado = await solicitarTienda(
                `${rutaBase}/${encodeURIComponent(categoria.id)}`,
                { method: "DELETE" }
            );

            // Comprobar la respuesta del SOAP Server
            if (
                typeof resultado === "string" &&
                !/eliminada correctamente/i.test(resultado)
            ) {
                throw new Error(resultado);
            }

            modal.hide();

            // Actualizar tabla
            if (esMedicamento) {
                await cargarCategoriasMedicamentosAdmin();

                if (
                    typeof cargarCategoriasMedicamentos ===
                    "function"
                ) {
                    await cargarCategoriasMedicamentos();
                }
            } else {
                await cargarTienda();
            }

            notificar("Categoría eliminada correctamente.");

        } catch (error) {
            modal.hide();

            notificar(
                "No se pudo eliminar: " + error.message,
                "danger"
            );

            console.error(error);

        } finally {
            nuevoBoton.disabled = false;
            nuevoBoton.innerHTML =
                '<i class="bi bi-trash3 me-1"></i>Sí, eliminar';
        }
    }, { once: true });

    modal.show();
}


async function guardarCategoria(evento) {
    evento.preventDefault();

    if (guardando || !$("formCategoria").reportValidity()) {
        return;
    }

    const nombre = $("categoriaNombre").value.trim();
    const descripcion = $("categoriaDescripcion").value.trim();

    if (!nombre) {
        notificar(
            "Ingresa el nombre de la categoría.",
            "warning"
        );
        return;
    }

    const esMedicamento =
        (categoriaEditandoId !== null
            ? tipoCategoriaEditando
            : tipoCategoriaActual) === "medicamentos";

    const editando = categoriaEditandoId !== null;

    const rutaBase = esMedicamento
        ? "/api/medicamentos/categorias"
        : `${API_PRODUCTOS}/categorias`;

    const ruta = editando
        ? `${rutaBase}/${encodeURIComponent(categoriaEditandoId)}`
        : rutaBase;

    guardando = true;
    $("guardarCategoria").disabled = true;

    try {
        const resultado = await solicitarTienda(ruta, {
            method: editando ? "PUT" : "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                nombre,
                descripcion
            })
        });

        // SOAP puede devolver HTTP 200 incluso cuando
        // la operación no se realizó correctamente.
        if (typeof resultado === "string") {
            const mensajeCorrecto = editando
                ? /actualizada correctamente/i
                : /registrada correctamente/i;

            if (!mensajeCorrecto.test(resultado)) {
                throw new Error(resultado);
            }
        }

        modalCategoria.hide();
        $("formCategoria").reset();

// Limpiar los datos de la edición anterior
        categoriaEditandoId = null;
        tipoCategoriaEditando = null;

        if (esMedicamento) {
            await cargarCategoriasMedicamentosAdmin();

            if (
                typeof cargarCategoriasMedicamentos === "function"
            ) {
                await cargarCategoriasMedicamentos();
            }
        } else {
            await cargarTienda();
        }

        notificar(
            editando
                ? "Categoría actualizada correctamente."
                : "Categoría registrada correctamente."
        );

    } catch (error) {
        notificar(
            editando
                ? "No se pudo actualizar: " + error.message
                : "No se pudo registrar: " + error.message,
            "danger"
        );

        console.error(error);

    } finally {
        guardando = false;
        $("guardarCategoria").disabled = false;
    }
}


// ==========================================
// EVENTOS
// ==========================================

$("nuevoProducto").addEventListener("click", nuevoProducto);


$("tabCategoriasProductos").addEventListener(
    "click",
    () => cambiarTipoCategorias("productos")
);

$("tabCategoriasMedicamentos").addEventListener(
    "click",
    () => cambiarTipoCategorias("medicamentos")
);


$("nuevaCategoria").addEventListener("click", () => {

    // Limpiar cualquier edición anterior
    categoriaEditandoId = null;
    tipoCategoriaEditando = null;

    // Limpiar formulario
    $("formCategoria").reset();

    const tipo = tipoCategoriaActual === "medicamentos"
        ? "medicamentos"
        : "productos";

    // Actualizar título del modal
    $("tituloModalCategoria").textContent =
        "Nueva categoría de " + tipo;

    // Actualizar descripción
    $("tipoCategoriaModal").textContent =
        "Se registrará como categoría de " + tipo + ".";

    // Restaurar botón de guardado
    $("guardarCategoria").textContent =
        "Guardar categoría";

    // Mostrar formulario
    modalCategoria.show();
});



$("formProducto").addEventListener("submit", guardarProducto);
$("formCategoria").addEventListener("submit", guardarCategoria);

$("productoImagen").addEventListener(
    "input", actualizarVistaPrevia
);

["buscarProducto", "filtroCategoria", "filtroEstado"]
    .forEach(id => $(id).addEventListener("input", mostrarProductos));

$("logoutTienda").addEventListener("click", async () => {
    try {
        await solicitarTienda("/api/auth/logout", {
            method: "POST"
        });
        window.location.replace("/login.html");
    } catch (error) {
        notificar(error.message, "danger");
    }
});

// ==========================================
// INICIALIZACIÓN
// ==========================================

async function iniciarTienda() {
    try {
        const permitido = await verificarAdminTienda();
        if (!permitido) return;

        await cargarTienda();
        console.log("Tienda administrativa VetCenter iniciada.");
    } catch (error) {
        notificar(
            `No se pudo cargar la tienda: ${error.message}`,
            "danger"
        );
        console.error(error);
    }
}


/* Ocultar automáticamente las notificaciones de productos */

let temporizadorAvisoProductos = null;

function configurarAvisosProductos() {

    const contenedor = document.querySelector(
        ".tienda-main"
    );

    if (!contenedor) return;

    const observador = new MutationObserver(() => {

        const aviso = contenedor.querySelector(
            ".alert:not(.d-none)"
        );

        if (!aviso) return;

        clearTimeout(temporizadorAvisoProductos);

        temporizadorAvisoProductos = setTimeout(() => {
            aviso.classList.add("d-none");
        }, 4000);
    });

    observador.observe(contenedor, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["class"]
    });
}

if (document.readyState === "loading") {
    document.addEventListener(
        "DOMContentLoaded",
        configurarAvisosProductos
    );
} else {
    configurarAvisosProductos();
}


iniciarTienda();
