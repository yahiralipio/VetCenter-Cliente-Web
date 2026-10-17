"use strict";

// VetCenter: calendario administrativo, vistas Día / Semana / Mes.
(() => {
    const contenedor = document.getElementById("calendarioCitas");
    if (!contenedor) return;

    const titulo = document.getElementById("calendarioTitulo");
    const botones = {
        dia: document.getElementById("calendarioVistaDia"),
        semana: document.getElementById("calendarioVistaSemana"),
        mes: document.getElementById("calendarioVistaMes"),
        anterior: document.getElementById("calendarioAnterior"),
        siguiente: document.getElementById("calendarioSiguiente"),
        hoy: document.getElementById("calendarioHoy")
    };

    let fechaActual = new Date();
    let vistaActual = "semana";
    let citas = [];
    let seleccion = new Date();

    const formatoMes = new Intl.DateTimeFormat("es-PE", {month: "long", year: "numeric"});
    const formatoDia = new Intl.DateTimeFormat("es-PE", {day: "numeric", month: "long", year: "numeric"});
    const formatoDiaSemana = new Intl.DateTimeFormat("es-PE", {weekday: "short"});
    const estados = {
        PENDIENTE: "Pendiente", CONFIRMADA: "Confirmada",
        ATENDIDA: "Atendida", CANCELADA: "Cancelada"
    };

    function fechaISO(fecha) {
        return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`;
    }
    function crearFecha(anio, mes, dia) { return new Date(anio, mes, dia); }
    function inicioSemana(fecha) {
        const inicio = crearFecha(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
        inicio.setDate(inicio.getDate() - (inicio.getDay() + 6) % 7);
        return inicio;
    }
    function fechaCita(cita) { return String(cita.fecha ?? "").substring(0, 10); }
    function estadoCita(cita) { return String(cita.estado ?? "PENDIENTE").trim().toUpperCase(); }
    function citasDelDia(fecha) {
        return citas.filter(cita => fechaCita(cita) === fechaISO(fecha))
            .sort((a, b) => String(a.hora ?? "").localeCompare(String(b.hora ?? "")) || (Number(a.id) || 0) - (Number(b.id) || 0));
    }
    function nombrePropietario(cita) {
        const cliente = cita.mascota?.cliente;
        return cliente ? [cliente.nombres, cliente.apellidos].filter(Boolean).join(" ") || "Sin propietario" : "Sin propietario";
    }
    function nodo(etiqueta, clase = "", texto) {
        const el = document.createElement(etiqueta);
        if (clase) el.className = clase;
        if (texto !== undefined) el.textContent = String(texto);
        return el;
    }
    function botonIcono(icono, texto) {
        const el = nodo("span", "vc-icon-text");
        const i = nodo("i", `bi bi-${icono}`);
        i.setAttribute("aria-hidden", "true");
        el.append(i, document.createTextNode(` ${texto}`));
        return el;
    }
    function estadoEtiqueta(cita) {
        const estado = estadoCita(cita);
        return nodo("span", `vc-cal-estado vc-cal-estado--${estado.toLowerCase()}`, estados[estado] || estado);
    }
    function elegirDia(fecha) {
        seleccion = crearFecha(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
        fechaActual = crearFecha(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
        renderizar();
    }
    function crearResumen() {
        const hoy = citasDelDia(new Date());
        const pendientes = citas.filter(c => estadoCita(c) === "PENDIENTE").length;
        const confirmadas = citas.filter(c => estadoCita(c) === "CONFIRMADA").length;
        const fila = nodo("div", "vc-cal-resumen");
        [
            ["calendar-day", "Hoy", hoy.length, "Citas del día"],
            ["hourglass-split", "Pendientes", pendientes, "Por confirmar"],
            ["calendar-check", "Confirmadas", confirmadas, "Programadas"]
        ].forEach(([icono, etiqueta, numero, detalle]) => {
            const tarjeta = nodo("div", "vc-cal-resumen-card");
            const cabecera = nodo("div", "vc-cal-resumen-cabecera");
            cabecera.append(nodo("i", `bi bi-${icono}`), nodo("span", "", etiqueta));
            tarjeta.append(cabecera, nodo("strong", "vc-cal-resumen-numero", numero), nodo("small", "", detalle));
            fila.append(tarjeta);
        });
        return fila;
    }
    function crearCeldaDia(fecha, compacta = false) {
        const dia = citasDelDia(fecha);
        const esHoy = fechaISO(fecha) === fechaISO(new Date());
        const seleccionado = fechaISO(fecha) === fechaISO(seleccion);
        const boton = nodo("button", `vc-cal-dia${seleccionado ? " vc-cal-dia--seleccionado" : ""}${esHoy ? " vc-cal-dia--hoy" : ""}${compacta ? " vc-cal-dia--mes" : ""}`);
        boton.type = "button";
        boton.setAttribute("aria-pressed", String(seleccionado));
        boton.setAttribute("aria-label", `${formatoDia.format(fecha)}, ${dia.length} citas`);
        boton.append(nodo("span", "vc-cal-dia-nombre", formatoDiaSemana.format(fecha).replace(".", "")));
        boton.append(nodo("strong", "vc-cal-dia-numero", fecha.getDate()));
        if (dia.length) {
            boton.append(nodo("span", "vc-cal-dia-cantidad", `${dia.length} ${dia.length === 1 ? "cita" : "citas"}`));
            const puntos = nodo("span", "vc-cal-dia-puntos");
            [...new Set(dia.map(estadoCita))].slice(0, 4).forEach(estado => puntos.append(nodo("span", `vc-cal-punto vc-cal-punto--${estado.toLowerCase()}`)));
            boton.append(puntos);
        } else if (!compacta) {
            boton.append(nodo("span", "vc-cal-dia-vacio", "Sin citas"));
        }
        boton.addEventListener("click", () => elegirDia(fecha));
        return boton;
    }
    function crearDetalleDia() {
        const dia = citasDelDia(seleccion);
        const seccion = nodo("section", "vc-cal-detalles");
        const cabecera = nodo("div", "vc-cal-detalles-cabecera");
        cabecera.append(nodo("h3", "", formatoDia.format(seleccion)), nodo("span", "vc-cal-detalles-contador", `${dia.length} ${dia.length === 1 ? "cita" : "citas"}`));
        seccion.append(cabecera);
        if (!dia.length) {
            const vacio = nodo("div", "vc-cal-sin-citas");
            vacio.append(nodo("i", "bi bi-calendar2-week"), nodo("p", "", "No hay citas registradas para este día."));
            seccion.append(vacio);
            return seccion;
        }
        const lista = nodo("div", "vc-cal-lista");
        dia.forEach(cita => {
            const tarjeta = nodo("button", "vc-cal-cita");
            tarjeta.type = "button";
            const hora = nodo("span", "vc-cal-cita-hora", String(cita.hora ?? "--:--").substring(0, 5));
            const info = nodo("span", "vc-cal-cita-info");
            info.append(nodo("strong", "", cita.mascota?.nombre || "Sin mascota"), nodo("small", "", cita.motivo || "Sin motivo registrado"), nodo("small", "", nombrePropietario(cita)));
            tarjeta.append(hora, info, estadoEtiqueta(cita));
            tarjeta.addEventListener("click", () => mostrarDetalle(cita));
            lista.append(tarjeta);
        });
        seccion.append(lista);
        return seccion;
    }
    function renderizarSemana() {
        const inicio = inicioSemana(fechaActual);
        const fin = crearFecha(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + 6);
        if (titulo) titulo.textContent = `${formatoDia.format(inicio)} – ${formatoDia.format(fin)}`;
        const scroll = nodo("div", "vc-cal-grid-scroll");
        const cuadricula = nodo("div", "vc-cal-semana");
        for (let i = 0; i < 7; i++) {
            cuadricula.append(crearCeldaDia(crearFecha(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + i)));
        }
        scroll.append(cuadricula);
        contenedor.append(scroll, crearDetalleDia());
    }
    function renderizarMes() {
        if (titulo) titulo.textContent = formatoMes.format(fechaActual);
        const anio = fechaActual.getFullYear();
        const mes = fechaActual.getMonth();
        const inicio = inicioSemana(crearFecha(anio, mes, 1));
        const scroll = nodo("div", "vc-cal-grid-scroll");
        const cuadricula = nodo("div", "vc-cal-mes");
        ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].forEach(nombre => cuadricula.append(nodo("span", "vc-cal-mes-dia-semana", nombre)));
        for (let i = 0; i < 42; i++) {
            const fecha = crearFecha(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + i);
            const envoltura = nodo("div", fecha.getMonth() === mes ? "" : "vc-cal-otro-mes");
            envoltura.append(crearCeldaDia(fecha, true));
            cuadricula.append(envoltura);
        }
        scroll.append(cuadricula);
        contenedor.append(scroll, crearDetalleDia());
    }
    function renderizarDia() {
        if (titulo) titulo.textContent = formatoDia.format(fechaActual);
        seleccion = crearFecha(fechaActual.getFullYear(), fechaActual.getMonth(), fechaActual.getDate());
        contenedor.append(crearDetalleDia());
    }
    function renderizar() {
        contenedor.replaceChildren();
        Object.entries({dia: botones.dia, semana: botones.semana, mes: botones.mes}).forEach(([vista, boton]) => {
            if (!boton) return;
            const activo = vista === vistaActual;
            boton.classList.toggle("btn-primary", activo);
            boton.classList.toggle("btn-outline-primary", !activo);
            boton.setAttribute("aria-pressed", String(activo));
        });
        contenedor.append(crearResumen());
        if (vistaActual === "mes") renderizarMes();
        else if (vistaActual === "semana") renderizarSemana();
        else renderizarDia();
    }
    function cambiarPeriodo(direccion) {
        if (vistaActual === "mes") {
            fechaActual = crearFecha(fechaActual.getFullYear(), fechaActual.getMonth() + direccion, 1);
        } else if (vistaActual === "semana") {
            fechaActual = crearFecha(fechaActual.getFullYear(), fechaActual.getMonth(), fechaActual.getDate() + direccion * 7);
        } else {
            fechaActual = crearFecha(fechaActual.getFullYear(), fechaActual.getMonth(), fechaActual.getDate() + direccion);
        }
        seleccion = crearFecha(fechaActual.getFullYear(), fechaActual.getMonth(), fechaActual.getDate());
        renderizar();
    }
    function mostrarDetalle(cita) {
        const capa = nodo("div", "vc-cal-modal-fondo");
        const dialogo = nodo("div", "vc-cal-modal");
        dialogo.setAttribute("role", "dialog");
        dialogo.setAttribute("aria-modal", "true");
        dialogo.setAttribute("aria-label", "Detalle de cita veterinaria");
        const cabecera = nodo("div", "vc-cal-modal-cabecera");
        cabecera.append(nodo("h3", "", `Cita #${cita.id ?? "—"}`), estadoEtiqueta(cita));
        const contenido = nodo("dl", "vc-cal-modal-datos");
        [["Mascota", cita.mascota?.nombre || "Sin mascota"], ["Propietario", nombrePropietario(cita)], ["Fecha", fechaCita(cita) || "Sin fecha"], ["Hora", cita.hora || "Sin hora"], ["Motivo", cita.motivo || "Sin motivo"]].forEach(([etiqueta, valor]) => {
            contenido.append(nodo("dt", "", etiqueta), nodo("dd", "", valor));
        });
        const cerrar = nodo("button", "btn btn-primary", "Cerrar");
        cerrar.type = "button";
        const focoAnterior = document.activeElement;
        function cerrarModal() {
            document.removeEventListener("keydown", manejarTeclas);
            capa.remove();
            if (focoAnterior?.isConnected) focoAnterior.focus({preventScroll: true});
        }
        function manejarTeclas(evento) {
            if (evento.key === "Escape") cerrarModal();
            if (evento.key === "Tab") { evento.preventDefault(); cerrar.focus(); }
        }
        cerrar.addEventListener("click", cerrarModal);
        capa.addEventListener("click", evento => { if (evento.target === capa) cerrarModal(); });
        document.addEventListener("keydown", manejarTeclas);
        dialogo.append(cabecera, contenido, cerrar);
        capa.append(dialogo);
        document.body.append(capa);
        cerrar.focus();
    }
    async function cargarCalendario() {
        try {
            const respuesta = await fetch("/api/citas", {credentials: "same-origin", headers: {Accept: "application/json"}});
            if (respuesta.status === 401) { window.location.replace("/login.html"); return; }
            if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
            const datos = await respuesta.json();
            if (!Array.isArray(datos)) throw new Error("Respuesta de citas inválida.");
            citas = datos;
            renderizar();
        } catch (error) {
            contenedor.replaceChildren(nodo("p", "text-danger text-center py-4", "No se pudo cargar el calendario."));
            console.error("Error del calendario:", error);
        }
    }
    botones.dia?.addEventListener("click", () => { vistaActual = "dia"; renderizar(); });
    botones.semana?.addEventListener("click", () => { vistaActual = "semana"; renderizar(); });
    botones.mes?.addEventListener("click", () => { vistaActual = "mes"; renderizar(); });
    botones.anterior?.addEventListener("click", () => cambiarPeriodo(-1));
    botones.siguiente?.addEventListener("click", () => cambiarPeriodo(1));
    botones.hoy?.addEventListener("click", () => { fechaActual = new Date(); seleccion = new Date(); renderizar(); });
    window.actualizarCalendarioCitas = cargarCalendario;
    cargarCalendario();
})();
