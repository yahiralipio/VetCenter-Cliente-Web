
"use strict";

const API_PEDIDOS_ADMIN = "/api/admin/pedidos";
let pedidosAdmin = [];

const $pedido = (id) => document.getElementById(id);

function monedaPedido(valor) {
    return new Intl.NumberFormat("es-PE", {
        style: "currency",
        currency: "PEN"
    }).format(Number(valor) || 0);
}

function fechaPedido(valor) {
    if (!valor) return "Sin fecha";

    const fecha = new Date(valor);

    if (Number.isNaN(fecha.getTime())) {
        return String(valor);
    }

    return fecha.toLocaleString("es-PE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true
    });
}

function nodoPedido(etiqueta, clase = "", texto) {
    const nodo = document.createElement(etiqueta);

    if (clase) nodo.className = clase;
    if (texto !== undefined) nodo.textContent = texto;

    return nodo;
}

function avisoPedido(mensaje, tipo = "danger") {
    const alerta = $pedido("mensajePedidosAdmin");
    alerta.className = `alert alert-${tipo}`;
    alerta.textContent = mensaje;
}

function limpiarAvisoPedido() {
    const alerta = $pedido("mensajePedidosAdmin");
    alerta.className = "alert d-none";
    alerta.textContent = "";
}



function actualizarEstadisticasPedidos() {

    // Estados pendientes de preparación
    const estadosPendientes = [
        "RECIBIDO",
        "CONFIRMADO"
    ];

    // Contar pedidos que todavía no comienzan su preparación
    const pendientesPreparacion = pedidosAdmin.filter(pedido =>
        estadosPendientes.includes(
            String(pedido.estado || "").trim().toUpperCase()
        )
    );

    // Calcular el importe total registrado
    const importe = pedidosAdmin.reduce(
        (total, pedido) =>
            total + (Number(pedido.total) || 0),
        0
    );

    // Total de pedidos registrados
    $pedido("cantidadPedidosAdmin").textContent =
        pedidosAdmin.length;

    // Pedidos pendientes de preparación
    $pedido("confirmadosPedidosAdmin").textContent =
        pendientesPreparacion.length;

    // Importe registrado
    $pedido("importePedidosAdmin").textContent =
        monedaPedido(importe);
}


function pedidosFiltrados() {
    const busqueda = $pedido("buscarPedidoAdmin")
        .value.trim().toLowerCase();

    const estado = $pedido("estadoPedidoAdmin").value;
    const fecha = $pedido("fechaPedidoAdmin").value;

    return pedidosAdmin.filter(pedido => {

        const coincideBusqueda =
            !busqueda ||
            String(pedido.id).includes(busqueda) ||
            String(pedido.nombreCompleto || "")
                .toLowerCase()
                .includes(busqueda) ||
            String(pedido.dni || "").includes(busqueda);


        const coincideEstado =
            !estado || pedido.estado === estado;

        const coincideFecha =
            !fecha ||
            String(pedido.fecha || "").startsWith(fecha);

        return coincideBusqueda &&
            coincideEstado &&
            coincideFecha;
    });
}

function agregarCelda(fila, texto) {
    const celda = nodoPedido("td", "", texto);
    fila.append(celda);
    return celda;
}

function renderizarPedidosAdmin() {
    const tabla = $pedido("tablaPedidosAdmin");
    tabla.replaceChildren();

    const pedidos = pedidosFiltrados();

    $pedido("conteoPedidosAdmin").textContent =
        `${pedidos.length} pedido(s) encontrados`;

    if (pedidos.length === 0) {
        const fila = document.createElement("tr");
        const celda = agregarCelda(
            fila,
            "No se encontraron pedidos."
        );

        celda.colSpan = 7;
        celda.className = "text-center py-4 text-muted";

        tabla.append(fila);
        return;
    }


    pedidos.forEach(pedido => {
        const fila = document.createElement("tr");

        // Número de pedido
        agregarCelda(fila, `#${pedido.id}`);

        // Nombre completo y DNI del cliente
        const celdaCliente = agregarCelda(fila, "");

        celdaCliente.append(
            nodoPedido(
                "div",
                "fw-semibold",
                pedido.nombreCompleto || "Cliente no identificado"
            ),
            nodoPedido(
                "div",
                "small text-muted",
                `DNI: ${pedido.dni || "No registrado"}`
            )
        );

        // Información del pedido
        agregarCelda(fila, fechaPedido(pedido.fecha));
        agregarCelda(fila, monedaPedido(pedido.total));
        agregarCelda(fila, pedido.estado || "Sin estado");
        agregarCelda(fila, pedido.estadoPago || "Sin estado");

        // Botón para ver detalle
        const acciones = document.createElement("td");

        const boton = nodoPedido(
            "button",
            "btn btn-outline-success btn-sm",
            "Ver detalle"
        );

        boton.type = "button";

        boton.addEventListener("click", () => {
            verDetallePedidoAdmin(pedido.id);
        });

        acciones.append(boton);

// SIGUIENTE ESTADO DISPONIBLE
        const siguientesEstados = {
            CONFIRMADO: {
                estado: "PREPARANDO",
                texto: "Preparar"
            },
            RECIBIDO: {
                estado: "PREPARANDO",
                texto: "Preparar"
            },
            PREPARANDO: {
                estado: "LISTO_RECOJO",
                texto: "Listo para recoger"
            },
            LISTO_RECOJO: {
                estado: "ENTREGADO",
                texto: "Entregar"
            }
        };

        const siguiente = siguientesEstados[pedido.estado];

        if (siguiente) {
            const botonEstado = nodoPedido(
                "button",
                "btn btn-success btn-sm ms-2",
                siguiente.texto
            );

            botonEstado.type = "button";

            if (
                siguiente.estado === "ENTREGADO" &&
                pedido.estadoPago !== "PAGADO"
            ) {
                botonEstado.disabled = true;
                botonEstado.title =
                    "Se requiere verificar el pago antes de entregar.";
            }

            botonEstado.addEventListener("click", () => {
                cambiarEstadoPedidoAdmin(
                    pedido.id,
                    siguiente.estado
                );
            });

            acciones.append(botonEstado);
        }

        fila.append(acciones);
        tabla.append(fila);
    });

}

async function verDetallePedidoAdmin(pedidoId) {
    const contenedor = $pedido("detallePedidoAdmin");

    contenedor.classList.remove("d-none");
    contenedor.replaceChildren(
        nodoPedido("p", "text-muted", "Cargando detalle...")
    );

    try {
        const respuesta = await fetch(
            `${API_PEDIDOS_ADMIN}/${pedidoId}/detalle`,
            { credentials: "same-origin" }
        );

        if (!respuesta.ok) {
            throw new Error(
                `No se pudo consultar el pedido (HTTP ${respuesta.status})`
            );
        }

        const pedido = await respuesta.json();

        contenedor.replaceChildren();

        const encabezado = nodoPedido(
            "div",
            "d-flex justify-content-between align-items-center mb-3"
        );

        encabezado.append(
            nodoPedido(
                "h3",
                "h5 fw-bold mb-0",
                `Detalle del pedido #${pedido.id}`
            )
        );

        const cerrar = nodoPedido(
            "button",
            "btn btn-outline-secondary btn-sm",
            "Cerrar"
        );

        cerrar.type = "button";
        cerrar.addEventListener("click", () => {
            contenedor.classList.add("d-none");
        });

        encabezado.append(cerrar);
        contenedor.append(encabezado);

        contenedor.append(
            nodoPedido(
                "p",
                "text-muted small",
                `Cliente: Usuario ${pedido.usuarioId} · ` +
                `Fecha: ${fechaPedido(pedido.fecha)}`
            )
        );

        const responsive = nodoPedido(
            "div",
            "table-responsive"
        );

        const tabla = nodoPedido(
            "table",
            "table table-bordered align-middle"
        );

        const thead = document.createElement("thead");
        const encabezados = document.createElement("tr");

        ["Producto", "Cantidad", "Precio", "Subtotal"]
            .forEach(nombre => {
                const th = nodoPedido("th", "", nombre);
                encabezados.append(th);
            });

        thead.append(encabezados);
        tabla.append(thead);

        const tbody = document.createElement("tbody");

        (pedido.detalles || []).forEach(item => {
            const fila = document.createElement("tr");

            agregarCelda(fila, item.nombreProducto);
            agregarCelda(fila, String(item.cantidad));
            agregarCelda(
                fila,
                monedaPedido(item.precioUnitario)
            );
            agregarCelda(
                fila,
                monedaPedido(item.subtotal)
            );

            tbody.append(fila);
        });

        tabla.append(tbody);
        responsive.append(tabla);
        contenedor.append(responsive);

        contenedor.append(
            nodoPedido(
                "p",
                "fw-bold text-end mt-3",
                `Total: ${monedaPedido(pedido.total)}`
            )
        );

        contenedor.append(
            nodoPedido(
                "p",
                "small text-muted",
                `Estado del pedido: ${pedido.estado} · ` +
                `Estado del pago: ${pedido.estadoPago} · ` +
                "Modalidad: Recojo en VetCenter"
            )
        );

        contenedor.scrollIntoView({
            behavior: "smooth",
            block: "nearest"
        });

    } catch (error) {
        contenedor.replaceChildren(
            nodoPedido(
                "p",
                "text-danger",
                error.message
            )
        );
    }
}

function confirmarCambioEstadoPedido(pedidoId, nuevoEstado) {
    return new Promise(resolve => {

        const elemento = document.getElementById(
            "modalPrepararPedido"
        );

        const boton = document.getElementById(
            "confirmarPrepararPedido"
        );

        const numero = document.getElementById(
            "numeroPedidoPreparar"
        );

        const titulo = document.getElementById(
            "tituloModalPrepararPedido"
        );

        if (!elemento || !boton || !numero || !titulo) {
            console.error(
                "No se encontró el modal de confirmación."
            );
            resolve(false);
            return;
        }

        const configuraciones = {
            PREPARANDO: {
                titulo: "Preparar pedido",
                boton: "Comenzar preparación",
                mensaje: "El pedido cambiará al estado PREPARANDO."
            },
            LISTO_RECOJO: {
                titulo: "Pedido listo para recoger",
                boton: "Confirmar pedido listo",
                mensaje: "El pedido cambiará al estado LISTO PARA RECOGER."
            },
            ENTREGADO: {
                titulo: "Confirmar entrega",
                boton: "Confirmar entrega",
                mensaje: "El pedido cambiará al estado ENTREGADO."
            }
        };

        const configuracion = configuraciones[nuevoEstado];

        if (!configuracion) {
            resolve(false);
            return;
        }

        titulo.textContent = configuracion.titulo;
        numero.textContent = `pedido #${pedidoId}`;

        boton.innerHTML =
            `<i class="bi bi-check-circle me-2"></i>` +
            configuracion.boton;

        // Actualizar el mensaje informativo del modal
        const mensajeInfo = elemento.querySelector(
            ".modal-body .text-secondary"
        );

        if (mensajeInfo) {
            mensajeInfo.textContent = configuracion.mensaje;
        }

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

        elemento.addEventListener(
            "hidden.bs.modal",
            cerrar
        );

        modal.show();
    });
}



async function cambiarEstadoPedidoAdmin(pedidoId, nuevoEstado) {

    const estadosPermitidos = [
        "PREPARANDO",
        "LISTO_RECOJO",
        "ENTREGADO"
    ];

    if (!estadosPermitidos.includes(nuevoEstado)) {
        return;
    }

    // Abrir modal personalizado
    const confirmado = await confirmarCambioEstadoPedido(
        pedidoId,
        nuevoEstado
    );

    // Cancelar sin modificar el pedido
    if (!confirmado) {
        return;
    }

    try {
        const respuesta = await fetch(
            `${API_PEDIDOS_ADMIN}/${pedidoId}/estado`,
            {
                method: "PATCH",
                credentials: "same-origin",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    estado: nuevoEstado
                })
            }
        );

        if (respuesta.status === 401) {
            window.location.replace("/login.html");
            return;
        }

        const datos = await respuesta.json();

        if (!respuesta.ok) {
            throw new Error(
                datos.mensaje ||
                "No se pudo actualizar el pedido."
            );
        }

        // Actualizar pedidos y estadísticas
        await cargarPedidosAdmin();

        // Mostrar notificación
        avisoPedido(
            datos.mensaje ||
            "Estado actualizado correctamente.",
            "success"
        );

    } catch (error) {
        avisoPedido(error.message);
        console.error(error);
    }
}


async function cargarPedidosAdmin() {
    const boton = $pedido("actualizarPedidosAdmin");
    boton.disabled = true;
    limpiarAvisoPedido();

    try {
        const respuesta = await fetch(
            API_PEDIDOS_ADMIN,
            { credentials: "same-origin" }
        );

        if (respuesta.status === 401) {
            window.location.replace("/login.html");
            return;
        }

        if (respuesta.status === 403) {
            throw new Error(
                "No tienes permisos de administrador."
            );
        }

        if (!respuesta.ok) {
            throw new Error(
                `No se pudieron cargar los pedidos (HTTP ${respuesta.status}).`
            );
        }

        const datos = await respuesta.json();

        if (!Array.isArray(datos)) {
            throw new Error(
                "El servidor devolvió una respuesta inválida."
            );
        }

        pedidosAdmin = datos;

        $pedido("detallePedidoAdmin")
            .classList.add("d-none");

        actualizarEstadisticasPedidos();
        renderizarPedidosAdmin();

    } catch (error) {
        avisoPedido(error.message);
        console.error(error);
    } finally {
        boton.disabled = false;
    }
}

$pedido("actualizarPedidosAdmin")
    .addEventListener("click", cargarPedidosAdmin);

["buscarPedidoAdmin", "estadoPedidoAdmin", "fechaPedidoAdmin"]
    .forEach(id => {
        $pedido(id).addEventListener(
            "input",
            renderizarPedidosAdmin
        );
    });

cargarPedidosAdmin();
