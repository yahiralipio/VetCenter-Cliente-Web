
"use strict";

// ==========================================
// VETCENTER - TIENDA Y CARRITO MIXTO
// Productos + Medicamentos
// ==========================================

const API_TIENDA = "/api/productos";
const API_MEDICAMENTOS = "/api/medicamentos";
const API_PEDIDOS = "/api/pedidos";

const elementoTienda = id => document.getElementById(id);

let productosTienda = [];
let medicamentosTienda = [];
let categoriasTienda = [];
let carritoTienda = [];
let compraEnProceso = false;

// ==========================================
// CONEXION CON EL BACKEND
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
            // Algunas respuestas pueden ser texto.
        }
    }

    if (!respuesta.ok) {
        throw new Error(
            typeof datos === "string"
                ? datos
                : datos?.mensaje ||
                `Error HTTP ${respuesta.status}`
        );
    }

    return datos;
}

// ==========================================
// FUNCIONES GENERALES
// ==========================================

function normalizarCatalogo(valor) {
    return String(valor ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}

function formatoPrecio(valor) {
    return new Intl.NumberFormat("es-PE", {
        style: "currency",
        currency: "PEN"
    }).format(Number(valor) || 0);
}

function crearElemento(etiqueta, clase = "", texto) {
    const elemento = document.createElement(etiqueta);

    if (clase) {
        elemento.className = clase;
    }

    if (texto !== undefined) {
        elemento.textContent = String(texto);
    }

    return elemento;
}

function mostrarMensaje(id, mensaje, tipo = "success") {
    const alerta = elementoTienda(id);
    if (!alerta) return;

    alerta.textContent = mensaje;
    alerta.className = `alert alert-${tipo}`;
}

function ocultarMensaje(id) {
    const alerta = elementoTienda(id);
    if (!alerta) return;

    alerta.className = "alert d-none";
    alerta.textContent = "";
}

function esActivo(articulo) {
    return articulo.activo === true;
}

function stockArticulo(articulo) {
    return Math.max(0, Number(articulo?.stock) || 0);
}

// ==========================================
// IDENTIFICAR PRODUCTOS Y MEDICAMENTOS
// ==========================================

function claveArticulo(tipo, id) {
    return `${tipo}:${Number(id)}`;
}

function obtenerArticulo(tipo, id) {
    const catalogo = tipo === "MEDICAMENTO"
        ? medicamentosTienda
        : productosTienda;

    return catalogo.find(
        articulo => Number(articulo.id) === Number(id)
    );
}

function obtenerArticuloCarrito(item) {
    return obtenerArticulo(item.tipo, item.id);
}

// ==========================================
// CARGAR CATALOGOS
// ==========================================

async function cargarProductosTienda() {
    const [productos, categorias, medicamentos] =
        await Promise.all([
            solicitarTienda(API_TIENDA),
            solicitarTienda(`${API_TIENDA}/categorias`),
            solicitarTienda(API_MEDICAMENTOS)
        ]);

    if (
        !Array.isArray(productos) ||
        !Array.isArray(categorias) ||
        !Array.isArray(medicamentos)
    ) {
        throw new Error(
            "Las API devolvieron datos inválidos."
        );
    }

    productosTienda = productos.filter(esActivo);
    medicamentosTienda = medicamentos.filter(esActivo);
    categoriasTienda = categorias;

    cargarCategoriasFiltro();
    sincronizarCarrito();
    mostrarCatalogo();
}

// ==========================================
// FILTRO DE CATEGORIAS
// ==========================================

function cargarCategoriasFiltro() {
    const select = elementoTienda("categoriaCatalogo");
    if (!select) return;

    const seleccion = select.value;

    select.replaceChildren();

    select.add(
        new Option("Todas las categorías", "")
    );

    // Categorías de productos.
    categoriasTienda.forEach(categoria => {
        select.add(new Option(
            categoria.nombre,
            `PRODUCTO:${categoria.id}`
        ));
    });

    // Categorías de medicamentos.
    const categoriasMedicamento = new Map();

    medicamentosTienda.forEach(medicamento => {
        const categoria = medicamento.categoria;

        if (categoria?.id != null) {
            categoriasMedicamento.set(
                Number(categoria.id),
                categoria.nombre || "Sin categoría"
            );
        }
    });

    categoriasMedicamento.forEach((nombre, id) => {
        select.add(new Option(
            `Medicamentos - ${nombre}`,
            `MEDICAMENTO:${id}`
        ));
    });

    // Filtro general de medicamentos.
    select.add(new Option(
        "Todos los medicamentos",
        "MEDICAMENTO"
    ));

    if ([...select.options].some(
        opcion => opcion.value === seleccion
    )) {
        select.value = seleccion;
    }
}

// ==========================================
// TARJETAS DEL CATALOGO
// ==========================================

function crearTarjetaArticulo(articulo, tipo) {
    const columna = crearElemento(
        "div",
        "col-sm-6 col-lg-4 col-xl-3"
    );

    const tarjeta = crearElemento(
        "article",
        "producto-card"
    );

    const contenedorImagen = crearElemento(
        "div",
        "producto-imagen-contenedor"
    );

    const icono = crearElemento(
        "i",
        tipo === "MEDICAMENTO"
            ? "bi bi-capsule producto-sin-imagen"
            : "bi bi-box-seam producto-sin-imagen"
    );

    contenedorImagen.append(icono);

    if (articulo.imagenUrl) {
        const imagen = crearElemento(
            "img",
            "producto-imagen"
        );

        imagen.alt = articulo.nombre || "Artículo";

        imagen.onload = () => {
            icono.classList.add("d-none");
        };

        imagen.onerror = () => {
            imagen.remove();
            icono.classList.remove("d-none");
        };

        imagen.src = articulo.imagenUrl;
        contenedorImagen.append(imagen);
    }

    const contenido = crearElemento(
        "div",
        "producto-contenido"
    );

    const categoriaTexto =
        articulo.categoria?.nombre || "Sin categoría";

    const categoria = crearElemento(
        "div",
        "producto-categoria",
        tipo === "MEDICAMENTO"
            ? `Medicamento · ${categoriaTexto}`
            : categoriaTexto
    );

    const nombre = crearElemento(
        "h3",
        "producto-nombre",
        articulo.nombre || "Sin nombre"
    );

    const descripcion = crearElemento(
        "p",
        "producto-descripcion",
        articulo.descripcion || "Sin descripción."
    );

    const precio = crearElemento(
        "div",
        "producto-precio",
        formatoPrecio(articulo.precio)
    );

    const stock = stockArticulo(articulo);

    const disponibilidad = crearElemento(
        "p",
        "producto-stock mt-2",
        stock > 0
            ? `${stock} unidades disponibles`
            : "Agotado"
    );

    const boton = crearElemento(
        "button",
        "btn btn-success w-100 mt-2",
        stock > 0 ? "Añadir al carrito" : "Agotado"
    );

    boton.type = "button";
    boton.disabled = stock <= 0;

    if (stock > 0) {
        boton.addEventListener("click", () => {
            agregarAlCarrito(articulo.id, tipo);
        });
    }

    contenido.append(
        categoria,
        nombre,
        descripcion,
        precio,
        disponibilidad,
        boton
    );

    tarjeta.append(
        contenedorImagen,
        contenido
    );

    columna.append(tarjeta);

    return columna;
}

// Compatibilidad con la función anterior.
function crearTarjetaProducto(producto) {
    return crearTarjetaArticulo(
        producto,
        "PRODUCTO"
    );
}

// ==========================================
// MOSTRAR CATALOGO MIXTO
// ==========================================

function mostrarCatalogo() {
    const contenedor = elementoTienda("productosCatalogo");
    const vacio = elementoTienda("catalogoVacio");

    if (!contenedor) return;

    const texto = normalizarCatalogo(
        elementoTienda("buscarCatalogo")?.value
    );

    const filtro =
        elementoTienda("categoriaCatalogo")?.value || "";

    const articulos = [
        ...productosTienda.map(articulo => ({
            tipo: "PRODUCTO",
            articulo
        })),
        ...medicamentosTienda.map(articulo => ({
            tipo: "MEDICAMENTO",
            articulo
        }))
    ];

    const filtrados = articulos.filter(
        ({ tipo, articulo }) => {

            const coincideTexto =
                normalizarCatalogo(
                    articulo.nombre
                ).includes(texto) ||
                normalizarCatalogo(
                    articulo.descripcion
                ).includes(texto);

            let coincideCategoria = true;

            if (filtro === "MEDICAMENTO") {
                coincideCategoria =
                    tipo === "MEDICAMENTO";
            } else if (filtro.startsWith("PRODUCTO:")) {
                coincideCategoria =
                    tipo === "PRODUCTO" &&
                    String(articulo.categoria?.id) ===
                    filtro.split(":")[1];
            } else if (
                filtro.startsWith("MEDICAMENTO:")
            ) {
                coincideCategoria =
                    tipo === "MEDICAMENTO" &&
                    String(articulo.categoria?.id) ===
                    filtro.split(":")[1];
            }

            return coincideTexto && coincideCategoria;
        }
    );

    contenedor.replaceChildren();

    filtrados.forEach(({ tipo, articulo }) => {
        contenedor.append(
            crearTarjetaArticulo(articulo, tipo)
        );
    });

    if (vacio) {
        vacio.classList.toggle(
            "d-none",
            filtrados.length > 0
        );
    }

    const total = elementoTienda("totalCatalogo");

    if (total) {
        total.textContent =
            `${filtrados.length} artículos`;
    }
}

// ==========================================
// AGREGAR AL CARRITO
// ==========================================

function agregarAlCarrito(id, tipo = "PRODUCTO") {
    if (compraEnProceso) return;

    const articulo = obtenerArticulo(tipo, id);

    if (!articulo) {
        mostrarMensaje(
            "mensajeCatalogo",
            "No se encontró el artículo.",
            "danger"
        );
        return;
    }

    const stock = stockArticulo(articulo);

    if (stock <= 0) {
        mostrarMensaje(
            "mensajeCatalogo",
            "Este artículo está agotado.",
            "warning"
        );
        return;
    }

    const clave = claveArticulo(tipo, id);

    const existente = carritoTienda.find(
        item => claveArticulo(item.tipo, item.id) === clave
    );

    const cantidadActual = existente?.cantidad || 0;

    if (cantidadActual >= stock) {
        mostrarMensaje(
            "mensajeCatalogo",
            "No puedes superar el stock disponible.",
            "warning"
        );
        return;
    }

    if (existente) {
        existente.cantidad++;
    } else {
        carritoTienda.push({
            tipo,
            id: Number(id),
            cantidad: 1
        });
    }

    actualizarCarrito();

    mostrarMensaje(
        "mensajeCatalogo",
        `${articulo.nombre} añadido al carrito.`
    );
}

// ==========================================
// CAMBIAR CANTIDADES
// ==========================================

function cambiarCantidad(clave, cambio) {
    if (compraEnProceso) return;

    const item = carritoTienda.find(
        articulo =>
            claveArticulo(
                articulo.tipo,
                articulo.id
            ) === clave
    );

    if (!item) return;

    const articulo = obtenerArticuloCarrito(item);
    if (!articulo) return;

    const nuevaCantidad = item.cantidad + cambio;

    if (nuevaCantidad <= 0) {
        eliminarDelCarrito(clave);
        return;
    }

    if (nuevaCantidad > stockArticulo(articulo)) {
        mostrarMensaje(
            "mensajeCarrito",
            "No hay suficiente stock disponible.",
            "warning"
        );
        return;
    }

    item.cantidad = nuevaCantidad;
    actualizarCarrito();
}

function eliminarDelCarrito(clave) {
    if (compraEnProceso) return;

    carritoTienda = carritoTienda.filter(
        item =>
            claveArticulo(item.tipo, item.id) !== clave
    );

    actualizarCarrito();
}

function vaciarCarrito() {
    if (compraEnProceso || carritoTienda.length === 0) {
        return;
    }

    carritoTienda = [];
    actualizarCarrito();
    ocultarMensaje("mensajeCarrito");
}

// ==========================================
// SINCRONIZAR INVENTARIO
// ==========================================

function sincronizarCarrito() {
    carritoTienda = carritoTienda.flatMap(item => {
        const articulo = obtenerArticuloCarrito(item);

        if (!articulo) return [];

        const stock = stockArticulo(articulo);

        if (stock <= 0) return [];

        const cantidad = Math.min(
            Number(item.cantidad) || 0,
            stock
        );

        if (cantidad <= 0) return [];

        return [{
            tipo: item.tipo,
            id: item.id,
            cantidad
        }];
    });

    actualizarCarrito();
}

// ==========================================
// CALCULAR TOTAL
// ==========================================

function calcularTotalCarrito() {
    return carritoTienda.reduce((total, item) => {
        const articulo = obtenerArticuloCarrito(item);

        return total +
            (Number(articulo?.precio) || 0) *
            item.cantidad;
    }, 0);
}

// ==========================================
// BOTONES DE CANTIDAD
// ==========================================

function crearBotonCantidad(
    texto,
    accion,
    deshabilitado
) {
    const boton = crearElemento(
        "button",
        "btn btn-outline-secondary btn-sm",
        texto
    );

    boton.type = "button";
    boton.disabled = deshabilitado || compraEnProceso;
    boton.addEventListener("click", accion);

    return boton;
}

// ==========================================
// ACTUALIZAR CARRITO VISUAL
// ==========================================

function actualizarCarrito() {
    const contenedor = elementoTienda("listaCarrito");

    if (!contenedor) return;

    contenedor.replaceChildren();

    let cantidadTotal = 0;

    if (carritoTienda.length === 0) {
        const vacio = crearElemento(
            "div",
            "text-center text-muted py-5"
        );

        const icono = crearElemento(
            "i",
            "bi bi-cart-x fs-1 d-block mb-3"
        );

        const texto = crearElemento(
            "p",
            "",
            "Tu carrito está vacío."
        );

        vacio.append(icono, texto);
        contenedor.append(vacio);
    }

    carritoTienda.forEach(item => {
        const articulo = obtenerArticuloCarrito(item);

        if (!articulo) return;

        cantidadTotal += item.cantidad;

        const clave = claveArticulo(
            item.tipo,
            item.id
        );

        const precio = Number(articulo.precio) || 0;
        const subtotal = precio * item.cantidad;

        const fila = crearElemento(
            "div",
            "carrito-item border-bottom py-3"
        );

        const contenedorImagen = crearElemento(
            "div",
            "carrito-imagen-contenedor"
        );

        const icono = crearElemento(
            "i",
            item.tipo === "MEDICAMENTO"
                ? "bi bi-capsule carrito-sin-imagen"
                : "bi bi-box-seam carrito-sin-imagen"
        );

        contenedorImagen.append(icono);

        if (articulo.imagenUrl) {
            const imagen = crearElemento(
                "img",
                "carrito-producto-imagen"
            );

            imagen.alt = articulo.nombre || "Artículo";

            imagen.onload = () => {
                icono.classList.add("d-none");
            };

            imagen.onerror = () => {
                imagen.remove();
                icono.classList.remove("d-none");
            };

            imagen.src = articulo.imagenUrl;
            contenedorImagen.append(imagen);
        }

        const informacion = crearElemento(
            "div",
            "carrito-producto-informacion"
        );

        const nombre = crearElemento(
            "strong",
            "d-block mb-1",
            articulo.nombre
        );

        const tipoTexto = crearElemento(
            "small",
            "text-muted d-block mb-1",
            item.tipo === "MEDICAMENTO"
                ? "Medicamento"
                : "Producto"
        );

        const precioTexto = crearElemento(
            "div",
            "small text-muted mb-2",
            `${formatoPrecio(precio)} por unidad`
        );

        const controles = crearElemento(
            "div",
            "d-flex align-items-center gap-2"
        );

        const disminuir = crearBotonCantidad(
            "−",
            () => cambiarCantidad(clave, -1),
            false
        );

        const cantidad = crearElemento(
            "span",
            "fw-bold px-2",
            item.cantidad
        );

        const aumentar = crearBotonCantidad(
            "+",
            () => cambiarCantidad(clave, 1),
            item.cantidad >= stockArticulo(articulo)
        );

        const eliminar = crearElemento(
            "button",
            "btn btn-link text-danger btn-sm ms-auto",
            "Eliminar"
        );

        eliminar.type = "button";
        eliminar.disabled = compraEnProceso;

        eliminar.addEventListener("click", () => {
            eliminarDelCarrito(clave);
        });

        controles.append(
            disminuir,
            cantidad,
            aumentar,
            eliminar
        );

        const subtotalTexto = crearElemento(
            "div",
            "fw-bold text-success mt-2",
            `Subtotal: ${formatoPrecio(subtotal)}`
        );

        informacion.append(
            nombre,
            tipoTexto,
            precioTexto,
            controles,
            subtotalTexto
        );

        fila.append(
            contenedorImagen,
            informacion
        );

        contenedor.append(fila);
    });

    const contador = elementoTienda("contadorCarrito");
    const total = elementoTienda("totalCarrito");
    const confirmar = elementoTienda("confirmarCompra");
    const vaciar = elementoTienda("vaciarCarrito");

    if (contador) {
        contador.textContent = String(cantidadTotal);
    }

    if (total) {
        total.textContent = formatoPrecio(
            calcularTotalCarrito()
        );
    }

    if (confirmar) {
        confirmar.disabled =
            carritoTienda.length === 0 || compraEnProceso;

        confirmar.textContent = compraEnProceso
            ? "Registrando pedido..."
            : "Continuar al pago";
    }

    if (vaciar) {
        vaciar.disabled =
            carritoTienda.length === 0 || compraEnProceso;
    }
}

// ==========================================
// FINALIZAR COMPRA
// ==========================================

function confirmarCompra() {
    if (compraEnProceso || carritoTienda.length === 0) {
        return;
    }

    if (document.getElementById("modalPagoVetCenter")) {
        return;
    }

    const overlay = crearElemento("div");
    overlay.id = "modalPagoVetCenter";

    Object.assign(overlay.style, {
        position: "fixed",
        inset: "0",
        zIndex: "2000",
        background: "rgba(0, 0, 0, 0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px"
    });

    const panel = crearElemento(
        "div",
        "bg-white rounded-4 shadow-lg p-4"
    );

    panel.style.width = "100%";
    panel.style.maxWidth = "480px";
    panel.style.maxHeight = "90vh";
    panel.style.overflowY = "auto";

    const titulo = crearElemento(
        "h2",
        "h4 fw-bold mb-2",
        "Finalizar pedido"
    );

    const descripcion = crearElemento(
        "p",
        "text-muted mb-3",
        "Selecciona cómo deseas pagar tu pedido en VetCenter."
    );

    const importe = crearElemento(
        "div",
        "alert alert-light border fw-bold fs-5 text-success",
        `Total estimado: ${formatoPrecio(
            calcularTotalCarrito()
        )}`
    );

    const subtitulo = crearElemento(
        "p",
        "fw-semibold mb-2",
        "Método de pago"
    );

    const opciones = crearElemento(
        "div",
        "d-grid gap-2 mb-3"
    );

    const metodos = [
        {
            valor: "YAPE",
            nombre: "Yape",
            descripcion: "Seleccionar Yape"
        },
        {
            valor: "PLIN",
            nombre: "Plin",
            descripcion: "Seleccionar Plin"
        },
        {
            valor: "TARJETA",
            nombre: "Tarjeta de crédito o débito",
            descripcion: "Seleccionar tarjeta"
        }
    ];

    metodos.forEach((metodo, indice) => {
        const opcion = crearElemento(
            "label",
            "border rounded-3 p-3 d-flex gap-3 align-items-start"
        );

        const radio = document.createElement("input");

        radio.type = "radio";
        radio.name = "metodoPagoVetCenter";
        radio.value = metodo.valor;
        radio.className = "form-check-input mt-1";
        radio.checked = indice === 0;

        const informacion = crearElemento("div");

        informacion.append(
            crearElemento(
                "strong",
                "d-block",
                metodo.nombre
            ),
            crearElemento(
                "small",
                "text-muted",
                metodo.descripcion
            )
        );

        opcion.append(radio, informacion);
        opciones.append(opcion);
    });

    const aviso = crearElemento(
        "p",
        "small text-muted mb-3",
        "Seleccionar un método no realiza un cobro real. " +
        "No realices transferencias hasta recibir " +
        "instrucciones verificadas de VetCenter."
    );

    const mensajeError = crearElemento(
        "div",
        "alert alert-danger d-none"
    );

    const botones = crearElemento(
        "div",
        "d-flex justify-content-end gap-2"
    );

    const cancelar = crearElemento(
        "button",
        "btn btn-outline-secondary",
        "Cancelar"
    );

    cancelar.type = "button";

    const registrar = crearElemento(
        "button",
        "btn btn-success",
        "Registrar pedido"
    );

    registrar.type = "button";

    botones.append(cancelar, registrar);

    panel.append(
        titulo,
        descripcion,
        importe,
        subtitulo,
        opciones,
        aviso,
        mensajeError,
        botones
    );

    overlay.append(panel);
    document.body.append(overlay);

    cancelar.addEventListener("click", () => {
        if (!compraEnProceso) {
            overlay.remove();
        }
    });

    // ======================================
    // ENVIAR PRODUCTOS Y MEDICAMENTOS
    // ======================================

    registrar.addEventListener("click", async () => {
        if (compraEnProceso) return;

        const metodoPago = panel.querySelector(
            'input[name="metodoPagoVetCenter"]:checked'
        )?.value;

        if (!["YAPE", "PLIN", "TARJETA"].includes(
            metodoPago
        )) {
            mensajeError.textContent =
                "Selecciona un método de pago válido.";

            mensajeError.classList.remove("d-none");
            return;
        }

        compraEnProceso = true;
        registrar.disabled = true;
        cancelar.disabled = true;
        registrar.textContent = "Registrando...";

        actualizarCarrito();

        try {
            // Un solo pedido para ambos tipos.
            const solicitud = {
                items: carritoTienda.map(item => {
                    if (item.tipo === "MEDICAMENTO") {
                        return {
                            medicamentoId: item.id,
                            cantidad: item.cantidad
                        };
                    }

                    return {
                        productoId: item.id,
                        cantidad: item.cantidad
                    };
                }),
                metodoPago
            };

            const resultado = await solicitarTienda(
                API_PEDIDOS,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(solicitud)
                }
            );

            carritoTienda = [];
            overlay.remove();

            mostrarMensaje(
                "mensajeCatalogo",
                resultado.mensaje ||
                "Pedido registrado correctamente."
            );

            mostrarMensaje(
                "mensajeCarrito",
                `Pedido registrado con método ${metodoPago}. ` +
                "Consulta Mis pedidos para ver el estado."
            );

            try {
                await cargarProductosTienda();
            } catch (errorCatalogo) {
                console.warn(
                    "No se pudo actualizar el catálogo:",
                    errorCatalogo
                );
            }

        } catch (error) {
            mensajeError.textContent =
                error.message +
                " Revisa Mis pedidos antes de " +
                "volver a intentarlo para evitar duplicados.";

            mensajeError.classList.remove("d-none");

            console.error(
                "Error al registrar el pedido:",
                error
            );

        } finally {
            compraEnProceso = false;
            registrar.disabled = false;
            cancelar.disabled = false;
            registrar.textContent = "Registrar pedido";

            actualizarCarrito();
        }
    });
}

// ==========================================
// INICIAR TIENDA
// ==========================================

async function iniciarCatalogo() {
    try {
        const perfil = await solicitarTienda(
            "/api/auth/perfil"
        );

        if (
            String(perfil.rol || "").toUpperCase()
            !== "CLIENTE"
        ) {
            window.location.replace("/admin.html");
            return;
        }

        await cargarProductosTienda();

    } catch (error) {
        mostrarMensaje(
            "mensajeCatalogo",
            error.message,
            "danger"
        );

        console.error(error);
    }
}

// ==========================================
// EVENTOS
// ==========================================

elementoTienda("buscarCatalogo")?.addEventListener(
    "input",
    mostrarCatalogo
);

elementoTienda("categoriaCatalogo")?.addEventListener(
    "change",
    mostrarCatalogo
);

elementoTienda("confirmarCompra")?.addEventListener(
    "click",
    confirmarCompra
);

elementoTienda("vaciarCarrito")?.addEventListener(
    "click",
    vaciarCarrito
);

actualizarCarrito();
iniciarCatalogo();
