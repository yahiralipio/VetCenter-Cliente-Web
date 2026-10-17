
"use strict";

const API_MIS_PEDIDOS = "/api/pedidos/mis-pedidos";

function formatoMoneda(valor) {
    return new Intl.NumberFormat("es-PE", {
        style: "currency",
        currency: "PEN"
    }).format(Number(valor) || 0);
}

function formatoFecha(valor) {
    if (!valor) return "Fecha no disponible";

    const fecha = new Date(valor);

    if (Number.isNaN(fecha.getTime())) {
        return String(valor);
    }

    return fecha.toLocaleString("es-PE", {
        dateStyle: "medium",
        timeStyle: "short"
    });
}

function elemento(etiqueta, clase, texto) {
    const nodo = document.createElement(etiqueta);

    if (clase) nodo.className = clase;
    if (texto !== undefined) nodo.textContent = texto;

    return nodo;
}

function mostrarError(mensaje) {
    const alerta = document.getElementById("mensajePedidos");
    alerta.textContent = mensaje;
    alerta.className = "alert alert-danger";
}

async function consultarDetallePedido(pedidoId, contenedor, boton) {
    boton.disabled = true;
    boton.textContent = "Cargando...";

    try {
        const respuesta = await fetch(
            `/api/pedidos/${pedidoId}/detalle`,
            { credentials: "same-origin" }
        );

        if (respuesta.status === 401) {
            window.location.replace("/login.html");
            return;
        }

        if (!respuesta.ok) {
            throw new Error(
                `No se pudo consultar el detalle (HTTP ${respuesta.status}).`
            );
        }

        const pedido = await respuesta.json();

        contenedor.replaceChildren();

        const titulo = elemento(
            "h4",
            "h6 fw-bold mb-3",
            "Productos de este pedido"
        );

        contenedor.append(titulo);

        if (!Array.isArray(pedido.detalles) ||
            pedido.detalles.length === 0) {

            contenedor.append(
                elemento(
                    "p",
                    "text-muted",
                    "Este pedido no tiene productos registrados."
                )
            );

        } else {
            const tablaResponsive = elemento(
                "div",
                "table-responsive"
            );

            const tabla = elemento(
                "table",
                "table table-sm align-middle"
            );

            const encabezado = document.createElement("thead");
            const filaEncabezado = document.createElement("tr");

            ["Producto", "Cantidad", "Precio", "Subtotal"]
                .forEach(texto => {
                    filaEncabezado.append(
                        elemento("th", "", texto)
                    );
                });

            encabezado.append(filaEncabezado);

            const cuerpo = document.createElement("tbody");

            pedido.detalles.forEach(item => {
                const fila = document.createElement("tr");

                [
                    item.nombreProducto || "Producto",
                    String(item.cantidad ?? 0),
                    formatoMoneda(item.precioUnitario),
                    formatoMoneda(item.subtotal)
                ].forEach(texto => {
                    fila.append(elemento("td", "", texto));
                });

                cuerpo.append(fila);
            });

            tabla.append(encabezado, cuerpo);
            tablaResponsive.append(tabla);
            contenedor.append(tablaResponsive);
        }

        const total = elemento(
            "p",
            "fw-bold text-end mt-3 mb-0",
            `Total: ${formatoMoneda(pedido.total)}`
        );

        contenedor.append(total);

        contenedor.append(
            elemento(
                "p",
                "small text-muted mt-2 mb-0",
                "Registro del pedido. Estado: " +
                (pedido.estadoPago === "DEMO_PAGADO"
                    ? "PAGADO (demostración)"
                    : (pedido.estadoPago || "No disponible")) +
                ". Este documento no acredita un pago bancario verificado."
            )
        );

        contenedor.classList.remove("d-none");
        boton.textContent = "Ocultar detalle";

    } catch (error) {
        contenedor.replaceChildren(
            elemento(
                "p",
                "text-danger mb-0",
                error.message
            )
        );

        contenedor.classList.remove("d-none");
        boton.textContent = "Reintentar";

    } finally {
        boton.disabled = false;
    }
}
function crearSeguimientoPedido(pedido) {
    const contenedor = elemento(
        "div",
        "seguimiento-pedido mt-4"
    );

    const titulo = elemento(
        "h4",
        "h6 fw-bold mb-3",
        "Seguimiento de tu pedido"
    );

    contenedor.append(titulo);

    const pasos = [
        { estado: "RECIBIDO", texto: "Recibido" },
        { estado: "PREPARANDO", texto: "Preparando" },
        { estado: "LISTO_RECOJO", texto: "Listo para recoger" },
        { estado: "ENTREGADO", texto: "Entregado" }
    ];

    const estadosEquivalentes = {
        CONFIRMADO: "RECIBIDO"
    };

    const estadoActual =
        estadosEquivalentes[pedido.estado] || pedido.estado;

    const indiceActual = pasos.findIndex(
        paso => paso.estado === estadoActual
    );

    const progreso = elemento(
        "div",
        "seguimiento-pasos"
    );

    pasos.forEach((paso, indice) => {
        const completado =
            indiceActual >= 0 && indice <= indiceActual;

        const pasoElemento = elemento(
            "div",
            `seguimiento-paso ${completado ? "completado" : ""}`
        );

        const icono = elemento(
            "span",
            "seguimiento-icono"
        );

        const iconoInterno = elemento(
            "i",
            completado
                ? "bi bi-check-lg"
                : "bi bi-circle"
        );

        icono.append(iconoInterno);

        const texto = elemento(
            "span",
            "seguimiento-texto",
            paso.texto
        );

        pasoElemento.append(icono, texto);
        progreso.append(pasoElemento);
    });

    contenedor.append(progreso);

    const mensajes = {
        CONFIRMADO:
            "Hemos registrado tu pedido.",
        RECIBIDO:
            "Hemos recibido tu pedido.",
        PREPARANDO:
            "Estamos preparando tus productos.",
        LISTO_RECOJO:
            "¡Tu pedido está listo! Puedes acercarte a VetCenter para recogerlo.",
        ENTREGADO:
            "Tu pedido fue entregado."
    };

    const mensaje = elemento(
        "p",
        "seguimiento-mensaje mt-3 mb-0",
        mensajes[pedido.estado] ||
        "Consulta el estado de tu pedido."
    );

    contenedor.append(mensaje);

    return contenedor;
}

function crearTarjetaPedido(pedido) {
    const tarjeta = elemento("article", "pedido-card");

    const encabezado = elemento(
        "div",
        "d-flex justify-content-between align-items-start flex-wrap gap-3"
    );

    const informacion = elemento("div");

    const titulo = elemento(
        "h3",
        "h5 fw-bold mb-2",
        `Pedido VC-${String(pedido.id).padStart(6, "0")}`
    );

    const fecha = elemento(
        "p",
        "text-muted small mb-0",
        formatoFecha(pedido.fecha)
    );

    informacion.append(titulo, fecha);

    const total = elemento(
        "strong",
        "pedido-total",
        formatoMoneda(pedido.total)
    );

    encabezado.append(informacion, total);

    const estados = elemento(
        "div",
        "d-flex flex-wrap gap-2 mt-3"
    );

    const estado = elemento(
        "span",
        "badge text-bg-success",
        `Pedido: ${pedido.estado || "Sin estado"}`
    );

    const estadoPagoVisible =
        ["DEMO_PAGADO", "PAGADO"].includes(pedido.estadoPago)
            ? "PAGADO"
            : (pedido.estadoPago || "PENDIENTE");

    const estadoPago = elemento(
        "span",
        estadoPagoVisible === "PAGADO"
            ? "badge text-bg-success"
            : "badge text-bg-secondary",
        `Pago: ${estadoPagoVisible}`
    );

    estados.append(estado, estadoPago);

    const aviso = elemento(
        "p",
        "small text-muted mt-3",
        "Modalidad de entrega: Recojo en VetCenter. " +
        "Estado del pago: " + estadoPagoVisible
    );

    const seguimiento = crearSeguimientoPedido(pedido);

    const botonDetalle = elemento(
        "button",
        "btn btn-outline-success btn-sm mt-2",
        "Ver detalle"
    );

    botonDetalle.type = "button";

    const botonPdf = elemento(
        "a",
        "btn btn-success btn-sm mt-2 ms-2",
        "Descargar comprobante PDF"
    );

    botonPdf.href =
        `/api/pedidos/${pedido.id}/comprobante`;

    botonPdf.setAttribute(
        "aria-label",
        `Descargar comprobante del pedido ${pedido.id}`
    );

    const detalleContenedor = elemento(
        "div",
        "pedido-detalle mt-3 d-none"
    );

    let detalleCargado = false;

    botonDetalle.addEventListener("click", async () => {
        if (detalleCargado) {
            const oculto = detalleContenedor.classList.toggle(
                "d-none"
            );

            botonDetalle.textContent = oculto
                ? "Ver detalle"
                : "Ocultar detalle";

            return;
        }

        await consultarDetallePedido(
            pedido.id,
            detalleContenedor,
            botonDetalle
        );

        // Solo se marca como cargado cuando se obtuvo
        // correctamente el detalle del pedido.
        detalleCargado =
            botonDetalle.textContent === "Ocultar detalle";
    });

    tarjeta.append(
        encabezado,
        estados,
        seguimiento,
        aviso,
        botonDetalle,
        botonPdf,
        detalleContenedor
    );

    return tarjeta;
}

async function cargarMisPedidos() {
    const contenedor = document.getElementById("listaPedidos");
    const vacio = document.getElementById("pedidosVacios");
    const alerta = document.getElementById("mensajePedidos");
    const boton = document.getElementById("actualizarPedidos");

    boton.disabled = true;
    contenedor.replaceChildren();

    alerta.className = "alert d-none";
    alerta.textContent = "";

    try {
        const respuesta = await fetch(API_MIS_PEDIDOS, {
            credentials: "same-origin"
        });

        if (respuesta.status === 401) {
            window.location.replace("/login.html");
            return;
        }

        if (!respuesta.ok) {
            throw new Error(
                `No se pudieron cargar los pedidos (HTTP ${respuesta.status}).`
            );
        }

        const pedidos = await respuesta.json();

        if (!Array.isArray(pedidos)) {
            throw new Error("El servidor devolvió datos inválidos.");
        }

        vacio.classList.toggle("d-none", pedidos.length > 0);

        pedidos.sort((a, b) => Number(b.id) - Number(a.id));

        pedidos.forEach(pedido => {
            contenedor.append(crearTarjetaPedido(pedido));
        });

    } catch (error) {
        vacio.classList.add("d-none");
        mostrarError(error.message);
        console.error(error);
    } finally {
        boton.disabled = false;
    }
}

document.getElementById("actualizarPedidos")
    .addEventListener("click", cargarMisPedidos);

cargarMisPedidos();
