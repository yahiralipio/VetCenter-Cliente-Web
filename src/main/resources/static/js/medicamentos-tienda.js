
"use strict";

// ==========================================
// VETCENTER - GESTIÓN DE MEDICAMENTOS
// ==========================================

let medicamentosRegistrados = [];
let modalMedicamento = null;

const API_MEDICAMENTOS = "/api/medicamentos";

// Ruta pendiente de confirmar en el Client.
// No se consulta automáticamente hasta configurarla.
const API_CATEGORIAS_MEDICAMENTOS = "/api/medicamentos/categorias";

function elementoMedicamento(id) {
    return document.getElementById(id);
}

// ==========================================
// MENSAJES
// ==========================================

function mostrarMensajeMedicamento(texto, error = false) {
    const mensaje = elementoMedicamento(
        "mensajeMedicamentosTienda"
    );

    if (!mensaje) return;

    mensaje.textContent = texto;
    mensaje.className = error
        ? "text-danger small mb-0"
        : "text-success small mb-0";
}

// ==========================================
// PETICIONES AL BACKEND
// ==========================================

async function solicitarMedicamentos(url, opciones = {}) {
    const respuesta = await fetch(url, {
        credentials: "same-origin",
        ...opciones,
        headers: {
            Accept: "application/json",
            ...(opciones.body
                ? { "Content-Type": "application/json" }
                : {}),
            ...(opciones.headers || {})
        }
    });

    if (!respuesta.ok) {
        let detalle = "";

        try {
            const contenido = await respuesta.text();

            try {
                const datos = JSON.parse(contenido);
                detalle = datos.mensaje || contenido;
            } catch {
                detalle = contenido;
            }

            detalle = detalle.slice(0, 250);
        } catch (error) {
            console.error(error);
        }

        throw new Error(
            `Error HTTP ${respuesta.status}` +
            (detalle ? `: ${detalle}` : "")
        );
    }

    if (respuesta.status === 204) {
        return null;
    }

    const contenido = await respuesta.text();

    if (!contenido.trim()) {
        return null;
    }

    try {
        return JSON.parse(contenido);
    } catch {
        return contenido;
    }
}

// ==========================================
// VISTA PREVIA DE IMAGEN
// ==========================================

function actualizarVistaPreviaMedicamento() {
    const campo = elementoMedicamento("medicamentoImagen");
    const imagen = elementoMedicamento(
        "vistaPreviaMedicamento"
    );

    if (!campo || !imagen) return;

    const url = campo.value.trim();

    imagen.classList.add("d-none");
    imagen.removeAttribute("src");

    if (!url) return;

    try {
        const direccion = new URL(url);

        if (
            !["http:", "https:"].includes(
                direccion.protocol
            )
        ) {
            return;
        }

        imagen.onload = () => {
            imagen.classList.remove("d-none");
        };

        imagen.onerror = () => {
            imagen.classList.add("d-none");
        };

        imagen.src = direccion.href;

    } catch {
        imagen.classList.add("d-none");
    }
}

// ==========================================
// CATEGORÍAS
// ==========================================

async function cargarCategoriasMedicamentos() {
    const select = elementoMedicamento(
        "medicamentoCategoria"
    );

    if (!select) return;

    // Sin una ruta confirmada no se inventa
    // una petición al backend.
    if (!API_CATEGORIAS_MEDICAMENTOS) {
        return;
    }

    const categorias = await solicitarMedicamentos(
        API_CATEGORIAS_MEDICAMENTOS
    );

    if (!Array.isArray(categorias)) {
        throw new Error(
            "El servidor no devolvió categorías válidas."
        );
    }

    const valorAnterior = select.value;

    select.replaceChildren(
        new Option("Sin categoría", "")
    );

    categorias.forEach(categoria => {
        if (categoria.id == null) return;

        select.add(
            new Option(
                categoria.nombre || "Sin nombre",
                String(categoria.id)
            )
        );
    });

    if (
        [...select.options].some(
            opcion => opcion.value === valorAnterior
        )
    ) {
        select.value = valorAnterior;
    }
}

function asegurarCategoriaMedicamento(categoria) {
    const select = elementoMedicamento(
        "medicamentoCategoria"
    );

    if (!select || categoria?.id == null) return;

    const valor = String(categoria.id);

    const existe = [...select.options].some(
        opcion => opcion.value === valor
    );

    if (!existe) {
        select.add(
            new Option(
                categoria.nombre || `Categoría ${valor}`,
                valor
            )
        );
    }
}

// ==========================================
// TABLA DE MEDICAMENTOS
// ==========================================

function crearCeldaMedicamento(fila, valor) {
    const celda = fila.insertCell();

    celda.textContent =
        valor === null ||
        valor === undefined ||
        valor === ""
            ? "—"
            : String(valor);

    return celda;
}

function crearCeldaImagenMedicamento(fila, medicamento) {
    const celda = fila.insertCell();

    if (!medicamento.imagenUrl) {
        celda.textContent = "Sin imagen";
        return;
    }

    const imagen = document.createElement("img");

    imagen.alt = medicamento.nombre || "Medicamento";
    imagen.width = 60;
    imagen.height = 60;
    imagen.style.objectFit = "cover";
    imagen.style.borderRadius = "8px";

    imagen.onerror = () => {
        imagen.remove();
        celda.textContent = "Sin imagen";
    };

    imagen.src = medicamento.imagenUrl;
    celda.append(imagen);
}

// ==========================================
// LISTAR MEDICAMENTOS
// ==========================================

async function cargarMedicamentosTienda() {
    const tabla = elementoMedicamento(
        "tablaMedicamentosTienda"
    );

    if (!tabla) return;

    try {
        const medicamentos = await solicitarMedicamentos(
            API_MEDICAMENTOS
        );

        if (!Array.isArray(medicamentos)) {
            throw new Error(
                "El servidor no devolvió una lista válida."
            );
        }

        medicamentosRegistrados = medicamentos;
        tabla.replaceChildren();

        if (medicamentos.length === 0) {
            const fila = tabla.insertRow();
            const celda = fila.insertCell();

            celda.colSpan = 9;
            celda.className = "text-center py-4";
            celda.textContent =
                "No hay medicamentos registrados.";
        }

        medicamentos.forEach(medicamento => {
            const fila = tabla.insertRow();

            // 1. ID
            crearCeldaMedicamento(
                fila,
                medicamento.id
            );

            // 2. Imagen
            crearCeldaImagenMedicamento(
                fila,
                medicamento
            );

            // 3. Nombre
            crearCeldaMedicamento(
                fila,
                medicamento.nombre
            );

            // 4. Descripción
            crearCeldaMedicamento(
                fila,
                medicamento.descripcion
            );

            // 5. Presentación
            crearCeldaMedicamento(
                fila,
                medicamento.presentacion
            );

            // 6. Stock
            crearCeldaMedicamento(
                fila,
                medicamento.stock
            );

            // 7. Precio
            crearCeldaMedicamento(
                fila,
                medicamento.precio == null
                    ? "—"
                    : "S/ " +
                    Number(medicamento.precio).toFixed(2)
            );


            // 8. Estado
            const celdaEstado = fila.insertCell();

            const etiquetaEstado = document.createElement("span");

            const estaActivo = medicamento.activo === true;

            etiquetaEstado.className = estaActivo
                ? "badge bg-success"
                : "badge bg-secondary";

            etiquetaEstado.textContent = estaActivo
                ? "Activo"
                : "Inactivo";

            celdaEstado.appendChild(etiquetaEstado);

            // 9. Acciones
            const acciones = fila.insertCell();

            const botonEditar =
                document.createElement("button");

            botonEditar.type = "button";
            botonEditar.className =
                "btn btn-sm btn-outline-primary me-2";

            botonEditar.innerHTML =
                '<i class="bi bi-pencil-square"></i> Editar';

            botonEditar.addEventListener("click", () => {
                editarMedicamento(medicamento.id);
            });

            const botonEliminar =
                document.createElement("button");

            botonEliminar.type = "button";
            botonEliminar.className =
                "btn btn-sm btn-outline-danger";

            botonEliminar.innerHTML =
                '<i class="bi bi-trash"></i> Eliminar';

            botonEliminar.addEventListener("click", () => {
                eliminarMedicamento(medicamento.id);
            });

            acciones.append(
                botonEditar,
                botonEliminar
            );
        });

        mostrarMensajeMedicamento(
            `${medicamentos.length} medicamento(s) registrado(s).`
        );

    } catch (error) {
        tabla.replaceChildren();

        const fila = tabla.insertRow();
        const celda = fila.insertCell();

        celda.colSpan = 9;
        celda.className =
            "text-center text-danger py-4";

        celda.textContent =
            "No se pudieron cargar los medicamentos.";

        mostrarMensajeMedicamento(
            error.message,
            true
        );

        console.error(error);
    }
}

// ==========================================
// NUEVO MEDICAMENTO
// ==========================================

function nuevoMedicamento() {
    const formulario = elementoMedicamento(
        "formMedicamento"
    );

    formulario.reset();

    elementoMedicamento("medicamentoId").value = "";

    elementoMedicamento(
        "tituloModalMedicamento"
    ).textContent = "Nuevo medicamento";

    elementoMedicamento(
        "guardarMedicamento"
    ).textContent = "Guardar medicamento";

    const campoActivo = elementoMedicamento(
        "medicamentoActivo"
    );

    if (campoActivo) {
        campoActivo.value = "true";
    }

    const campoCategoria = elementoMedicamento(
        "medicamentoCategoria"
    );

    if (campoCategoria) {
        campoCategoria.value = "";
    }

    actualizarVistaPreviaMedicamento();

    modalMedicamento.show();
}

// ==========================================
// EDITAR MEDICAMENTO
// ==========================================

function editarMedicamento(id) {
    const medicamento = medicamentosRegistrados.find(
        item => String(item.id) === String(id)
    );

    if (!medicamento) {
        mostrarMensajeMedicamento(
            "No se encontró el medicamento.",
            true
        );
        return;
    }

    elementoMedicamento("medicamentoId").value =
        medicamento.id;

    elementoMedicamento("medicamentoNombre").value =
        medicamento.nombre || "";

    elementoMedicamento("medicamentoDescripcion").value =
        medicamento.descripcion || "";

    elementoMedicamento("medicamentoPresentacion").value =
        medicamento.presentacion || "";

    elementoMedicamento("medicamentoPrecio").value =
        medicamento.precio ?? "";

    elementoMedicamento("medicamentoStock").value =
        medicamento.stock ?? "";

    const campoImagen = elementoMedicamento(
        "medicamentoImagen"
    );

    if (campoImagen) {
        campoImagen.value = medicamento.imagenUrl || "";
    }

    const campoActivo = elementoMedicamento(
        "medicamentoActivo"
    );

    if (campoActivo) {
        campoActivo.value = String(
            medicamento.activo !== false
        );
    }

    const campoCategoria = elementoMedicamento(
        "medicamentoCategoria"
    );

    if (campoCategoria) {
        asegurarCategoriaMedicamento(
            medicamento.categoria
        );

        campoCategoria.value =
            medicamento.categoria?.id == null
                ? ""
                : String(medicamento.categoria.id);
    }

    actualizarVistaPreviaMedicamento();

    elementoMedicamento(
        "tituloModalMedicamento"
    ).textContent = "Editar medicamento";

    elementoMedicamento(
        "guardarMedicamento"
    ).textContent = "Actualizar medicamento";

    modalMedicamento.show();
}

// ==========================================
// GUARDAR O ACTUALIZAR
// ==========================================

async function guardarMedicamento(evento) {
    evento.preventDefault();

    const formulario = elementoMedicamento(
        "formMedicamento"
    );

    if (!formulario.reportValidity()) {
        return;
    }

    const id = elementoMedicamento(
        "medicamentoId"
    ).value;

    const medicamentoAnterior = id
        ? medicamentosRegistrados.find(
            item => String(item.id) === String(id)
        )
        : null;

    const campoImagen = elementoMedicamento(
        "medicamentoImagen"
    );

    const campoActivo = elementoMedicamento(
        "medicamentoActivo"
    );

    const campoCategoria = elementoMedicamento(
        "medicamentoCategoria"
    );

    const medicamento = {
        nombre: elementoMedicamento(
            "medicamentoNombre"
        ).value.trim(),

        descripcion: elementoMedicamento(
            "medicamentoDescripcion"
        ).value.trim(),

        presentacion: elementoMedicamento(
            "medicamentoPresentacion"
        ).value.trim(),

        precio: Number(
            elementoMedicamento(
                "medicamentoPrecio"
            ).value
        ),

        stock: Number(
            elementoMedicamento(
                "medicamentoStock"
            ).value
        ),

        imagenUrl: campoImagen
            ? campoImagen.value.trim() || null
            : medicamentoAnterior?.imagenUrl ?? null,

        activo: campoActivo
            ? campoActivo.value === "true"
            : medicamentoAnterior?.activo !== false,

        categoria: null
    };

    if (campoCategoria) {
        const categoriaId = campoCategoria.value;

        medicamento.categoria = categoriaId
            ? { id: Number(categoriaId) }
            : null;

        // Cuando no hay API de categorías, conservar
        // la categoría existente al editar.
        if (
            !API_CATEGORIAS_MEDICAMENTOS &&
            medicamentoAnterior?.categoria &&
            !categoriaId
        ) {
            medicamento.categoria =
                medicamentoAnterior.categoria;
        }
    } else {
        medicamento.categoria =
            medicamentoAnterior?.categoria ?? null;
    }

    if (
        !medicamento.nombre ||
        !medicamento.presentacion ||
        !Number.isFinite(medicamento.precio) ||
        medicamento.precio <= 0 ||
        !Number.isInteger(medicamento.stock) ||
        medicamento.stock < 0
    ) {
        mostrarMensajeMedicamento(
            "Verifica los datos del medicamento.",
            true
        );
        return;
    }

    const boton = elementoMedicamento(
        "guardarMedicamento"
    );

    boton.disabled = true;

    try {
        const editando = Boolean(id);

        await solicitarMedicamentos(
            editando
                ? `${API_MEDICAMENTOS}/${encodeURIComponent(id)}`
                : API_MEDICAMENTOS,
            {
                method: editando ? "PUT" : "POST",
                body: JSON.stringify(medicamento)
            }
        );

        modalMedicamento.hide();

        await cargarMedicamentosTienda();

        mostrarMensajeMedicamento(
            editando
                ? "Medicamento actualizado correctamente."
                : "Medicamento registrado correctamente."
        );

    } catch (error) {
        mostrarMensajeMedicamento(
            "No se pudo guardar: " + error.message,
            true
        );

        console.error(error);

    } finally {
        boton.disabled = false;
    }
}

// ==========================================
// ELIMINAR MEDICAMENTO
// ==========================================


async function eliminarMedicamento(id) {
    const medicamento = medicamentosRegistrados.find(
        item => String(item.id) === String(id)
    );

    if (!medicamento) {
        mostrarMensajeMedicamento(
            "No se encontró el medicamento.",
            true
        );
        return;
    }

    const modalElemento = elementoMedicamento(
        "modalEliminarMedicamento"
    );

    const botonConfirmar = elementoMedicamento(
        "confirmarEliminarMedicamento"
    );

    const nombreElemento = elementoMedicamento(
        "nombreMedicamentoEliminar"
    );

    if (!modalElemento || !botonConfirmar || !nombreElemento) {
        mostrarMensajeMedicamento(
            "No se encontró el modal de confirmación.",
            true
        );
        return;
    }

    nombreElemento.textContent = medicamento.nombre || "Sin nombre";

    const modal = bootstrap.Modal.getOrCreateInstance(
        modalElemento
    );

    // Reemplazar el botón para evitar eventos duplicados
    const nuevoBoton = botonConfirmar.cloneNode(true);
    botonConfirmar.replaceWith(nuevoBoton);

    nuevoBoton.addEventListener("click", async () => {
        nuevoBoton.disabled = true;

        nuevoBoton.innerHTML =
            '<span class="spinner-border spinner-border-sm me-2"></span>Eliminando...';

        try {
            const resultado = await solicitarMedicamentos(
                `${API_MEDICAMENTOS}/${encodeURIComponent(id)}`,
                {
                    method: "DELETE"
                }
            );

            // Comprobar errores devueltos como texto por SOAP
            if (
                typeof resultado === "string" &&
                !/eliminad[oa] correctamente/i.test(resultado)
            ) {
                throw new Error(resultado);
            }

            modal.hide();

            await cargarMedicamentosTienda();

            mostrarMensajeMedicamento(
                "Medicamento eliminado correctamente."
            );

        } catch (error) {
            modal.hide();

            mostrarMensajeMedicamento(
                "No se pudo eliminar: " + error.message,
                true
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

// ==========================================
// INICIALIZACIÓN
// ==========================================

function iniciarMedicamentosTienda() {
    const modal = elementoMedicamento(
        "modalMedicamento"
    );

    if (!modal) return;

    modalMedicamento = new bootstrap.Modal(modal);

    elementoMedicamento(
        "nuevoMedicamento"
    )?.addEventListener(
        "click",
        nuevoMedicamento
    );

    elementoMedicamento(
        "formMedicamento"
    )?.addEventListener(
        "submit",
        guardarMedicamento
    );

    elementoMedicamento(
        "medicamentoImagen"
    )?.addEventListener(
        "input",
        actualizarVistaPreviaMedicamento
    );

    cargarMedicamentosTienda();

    if (API_CATEGORIAS_MEDICAMENTOS) {
        cargarCategoriasMedicamentos().catch(error => {
            console.error(
                "Error al cargar categorías:",
                error
            );
        });
    }
}

if (document.readyState === "loading") {
    document.addEventListener(
        "DOMContentLoaded",
        iniciarMedicamentosTienda
    );
} else {
    iniciarMedicamentosTienda();
}
