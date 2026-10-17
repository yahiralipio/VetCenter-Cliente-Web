
"use strict";

// ==========================================
// VETCENTER - DISPONIBILIDAD DE CITAS
// ==========================================

(() => {
    const fechaInput = document.getElementById("fecha");
    const horaInput = document.getElementById("hora");
    const contenedor = document.getElementById("horariosDisponibles");
    const mensajeHorarios = document.getElementById("horariosMensaje");
    const formulario = document.getElementById("citaForm");

    if (!fechaInput || !horaInput || !contenedor ||
        !mensajeHorarios || !formulario) {
        console.warn("No se encontró el selector de horarios.");
        return;
    }

    let horariosOcupados = new Set();
    let fechaConsultada = "";
    let solicitudActual = 0;
    let disponibilidadConfirmada = false;

    function mostrarEstado(texto, tipo = "muted") {
        mensajeHorarios.className = `small text-${tipo} mb-3`;
        mensajeHorarios.textContent = texto;
    }

    function fechaLocalHoy() {
        const ahora = new Date();
        const anio = ahora.getFullYear();
        const mes = String(ahora.getMonth() + 1).padStart(2, "0");
        const dia = String(ahora.getDate()).padStart(2, "0");
        return `${anio}-${mes}-${dia}`;
    }

    function horaEsFutura(fecha, hora) {
        const [anio, mes, dia] = fecha.split("-").map(Number);
        const [horas, minutos] = hora.split(":").map(Number);

        return new Date(
            anio, mes - 1, dia, horas, minutos
        ).getTime() > Date.now();
    }

    function normalizarHora(valor) {
        const texto = String(valor || "");
        const coincidencia = /^(\d{2}:\d{2})(?::\d{2})?$/.exec(texto);
        return coincidencia ? coincidencia[1] : texto;
    }

    function generarHorarios() {
        contenedor.replaceChildren();

        if (!disponibilidadConfirmada || !fechaConsultada) {
            return;
        }

        let disponibles = 0;

        // Atención 24 horas, intervalos de una hora.
        for (let hora = 0; hora < 24; hora++) {
            const horario = `${String(hora).padStart(2, "0")}:00`;

            const ocupado = horariosOcupados.has(horario);
            const pasado = !horaEsFutura(fechaConsultada, horario);
            const seleccionado = horaInput.value === horario;

            const boton = document.createElement("button");
            boton.type = "button";
            boton.textContent = horario;
            boton.className = seleccionado
                ? "btn btn-sm text-white"
                : ocupado
                    ? "btn btn-outline-danger btn-sm"
                    : "btn btn-outline-success btn-sm";

            if (seleccionado) {
                boton.style.setProperty("background-color", "#0d6efd", "important");
                boton.style.setProperty("border-color", "#0d6efd", "important");
            }

            boton.disabled = ocupado || pasado;
            boton.setAttribute("aria-pressed", String(seleccionado));

            if (ocupado) {
                boton.title = "Horario ocupado";
            } else if (pasado) {
                boton.title = "Horario no disponible: ya pasó";
            } else {
                boton.title = "Seleccionar horario";
                disponibles++;
            }

            boton.addEventListener("click", () => {
                if (boton.disabled) return;

                horaInput.value = horario;
                horaInput.dispatchEvent(
                    new Event("change", { bubbles: true })
                );
            });

            contenedor.appendChild(boton);
        }

        mostrarEstado(
            disponibles > 0
                ? `${disponibles} horarios disponibles para esta fecha.`
                : "No quedan horarios disponibles para esta fecha.",
            disponibles > 0 ? "success" : "warning"
        );
    }

    function actualizarSeleccion() {
        if (!disponibilidadConfirmada ||
            fechaInput.value !== fechaConsultada) {
            return;
        }

        const hora = normalizarHora(horaInput.value);

        if (hora && (
            horariosOcupados.has(hora) ||
            !horaEsFutura(fechaConsultada, hora)
        )) {
            horaInput.value = "";
            mostrarEstado(
                "La hora seleccionada no está disponible.",
                "danger"
            );
        }

        generarHorarios();
    }

    async function consultarDisponibilidad() {
        const fecha = fechaInput.value;
        const numeroSolicitud = ++solicitudActual;

        fechaConsultada = "";
        disponibilidadConfirmada = false;
        horariosOcupados.clear();
        contenedor.replaceChildren();
        horaInput.value = "";

        if (!fecha) {
            mostrarEstado("Selecciona una fecha para ver los horarios.");
            return;
        }

        if (fecha < fechaLocalHoy()) {
            mostrarEstado("No puedes reservar fechas pasadas.", "danger");
            return;
        }

        mostrarEstado("Consultando horarios disponibles...");

        try {
            const respuesta = await fetch(
                `/api/mi-cuenta/citas/horarios-ocupados?fecha=${encodeURIComponent(fecha)}`,
                { credentials: "same-origin" }
            );

            if (numeroSolicitud !== solicitudActual) return;

            if (respuesta.status === 401) {
                mostrarEstado(
                    "Tu sesión ha expirado. Inicia sesión nuevamente.",
                    "danger"
                );
                return;
            }

            if (!respuesta.ok) {
                throw new Error(
                    `No se pudo consultar la disponibilidad (HTTP ${respuesta.status}).`
                );
            }

            const datos = await respuesta.json();

            if (numeroSolicitud !== solicitudActual ||
                fechaInput.value !== fecha) return;

            if (!Array.isArray(datos.horariosOcupados) ||
                datos.fecha !== fecha) {
                throw new Error("La respuesta de disponibilidad no es válida.");
            }

            horariosOcupados = new Set(
                datos.horariosOcupados.map(normalizarHora)
            );

            fechaConsultada = fecha;
            disponibilidadConfirmada = true;
            generarHorarios();

        } catch (error) {
            if (numeroSolicitud !== solicitudActual) return;

            disponibilidadConfirmada = false;
            contenedor.replaceChildren();
            mostrarEstado(error.message, "danger");
            console.error("Error al consultar horarios:", error);
        }
    }

    fechaInput.addEventListener("change", consultarDisponibilidad);
    horaInput.addEventListener("change", actualizarSeleccion);

    formulario.addEventListener("submit", evento => {
        const hora = normalizarHora(horaInput.value);

        if (!disponibilidadConfirmada ||
            fechaInput.value !== fechaConsultada ||
            !hora ||
            horariosOcupados.has(hora) ||
            !horaEsFutura(fechaConsultada, hora)) {

            evento.preventDefault();
            evento.stopImmediatePropagation();

            mostrarEstado(
                "Consulta la disponibilidad y selecciona una hora válida.",
                "danger"
            );
        }
    }, true);

    // Permitir actualizar el calendario desde dashboard.js.
    window.VetCenterHorarios = {
        actualizar: consultarDisponibilidad,
        limpiar: () => {
            solicitudActual++;
            fechaConsultada = "";
            disponibilidadConfirmada = false;
            horariosOcupados.clear();
            contenedor.replaceChildren();
            horaInput.value = "";
            mostrarEstado("Selecciona una fecha para ver los horarios.");
        }
    };

    if (fechaInput.value) {
        consultarDisponibilidad();
    }
})();
