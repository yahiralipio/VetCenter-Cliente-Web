
package Cibertec.pe.controller;

import Cibertec.pe.client.MascotaSoapClient;
import Cibertec.pe.client.CitaSoapClient;

import Cibertec.pe.soap.mascota.Mascota;
import Cibertec.pe.soap.cita.Cita;

import Cibertec.pe.dto.CitaResponse;
import Cibertec.pe.dto.RegistrarCitaRequest;

import jakarta.servlet.http.HttpSession;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/mi-cuenta")
public class MiCuentaController {

    private final MascotaSoapClient mascotaSoapClient;
    private final CitaSoapClient citaSoapClient;

    public MiCuentaController(
            MascotaSoapClient mascotaSoapClient,
            CitaSoapClient citaSoapClient) {

        this.mascotaSoapClient = mascotaSoapClient;
        this.citaSoapClient = citaSoapClient;
    }

    // ==========================================
    // 1. OBTENER CLIENTE AUTENTICADO
    // ==========================================

    private Integer obtenerClienteId(HttpSession sesion) {
        Object valor = sesion.getAttribute("clienteId");

        if (!(valor instanceof Integer clienteId)) {
            return null;
        }

        String rol = String.valueOf(
                sesion.getAttribute("rol")
        );

        if (!"CLIENTE".equalsIgnoreCase(rol)) {
            return null;
        }

        return clienteId;
    }

    private ResponseEntity<?> accesoDenegado() {
        return ResponseEntity
                .status(HttpStatus.FORBIDDEN)
                .body(Map.of(
                        "mensaje",
                        "No tienes una cuenta de cliente autorizada"
                ));
    }

    // ==========================================
    // 2. VERIFICAR PROPIEDAD DE UNA MASCOTA
    // ==========================================

    private boolean perteneceAlCliente(
            Mascota mascota,
            Integer clienteId) {

        return mascota != null
                && mascota.getCliente() != null
                && clienteId.equals(
                mascota.getCliente().getId()
        );
    }

    // ==========================================
    // 3. VALIDAR DATOS DE UNA MASCOTA
    // ==========================================

    private String validarMascota(Mascota mascota) {

        if (mascota == null
                || mascota.getNombre() == null
                || mascota.getNombre().isBlank()
                || mascota.getEspecie() == null
                || mascota.getEspecie().isBlank()) {

            return "El nombre y la especie son obligatorios";
        }

        if (mascota.getNombre().trim().length() > 100
                || mascota.getEspecie().trim().length() > 100) {

            return "El nombre y la especie no pueden superar los 100 caracteres";
        }

        if (mascota.getRaza() != null
                && mascota.getRaza().trim().length() > 100) {

            return "La raza no puede superar los 100 caracteres";
        }

        return null;
    }

    private Mascota prepararMascota(Mascota datos) {

        Mascota mascota = new Mascota();

        mascota.setNombre(datos.getNombre().trim());
        mascota.setEspecie(datos.getEspecie().trim());

        if (datos.getRaza() != null) {
            mascota.setRaza(datos.getRaza().trim());
        }

        if (datos.getSexo() != null) {
            mascota.setSexo(datos.getSexo().trim());
        }

        return mascota;
    }

    // ==========================================
    // 4. CONSULTAR MIS MASCOTAS
    // ==========================================

    @GetMapping("/mascotas")
    public ResponseEntity<?> misMascotas(
            HttpSession sesion) {

        Integer clienteId = obtenerClienteId(sesion);

        if (clienteId == null) {
            return accesoDenegado();
        }

        List<Mascota> propias =
                mascotaSoapClient.listarMascotas()
                        .stream()
                        .filter(mascota ->
                                perteneceAlCliente(
                                        mascota,
                                        clienteId
                                )
                        )
                        .toList();

        return ResponseEntity.ok(propias);
    }

    // ==========================================
    // 5. REGISTRAR MI MASCOTA
    // ==========================================

    @PostMapping("/mascotas")
    public ResponseEntity<?> registrarMascota(
            @RequestBody Mascota datos,
            HttpSession sesion) {

        Integer clienteId = obtenerClienteId(sesion);

        if (clienteId == null) {
            return accesoDenegado();
        }

        String error = validarMascota(datos);

        if (error != null) {
            return ResponseEntity
                    .badRequest()
                    .body(Map.of("mensaje", error));
        }

        Mascota nuevaMascota = prepararMascota(datos);

        String resultado =
                mascotaSoapClient.crearMascota(
                        nuevaMascota,
                        clienteId
                );

        return ResponseEntity.ok(Map.of(
                "mensaje",
                resultado != null
                        ? resultado
                        : "Solicitud de registro procesada"
        ));
    }

    // ==========================================
    // 6. ACTUALIZAR MI MASCOTA
    // ==========================================

    @PutMapping("/mascotas/{codigo}")
    public ResponseEntity<?> actualizarMiMascota(
            @PathVariable("codigo") Integer codigo,
            @RequestBody Mascota datos,
            HttpSession sesion) {

        Integer clienteId = obtenerClienteId(sesion);

        if (clienteId == null) {
            return accesoDenegado();
        }

        // Buscar la mascota en el servidor SOAP.
        Mascota mascotaActual =
                mascotaSoapClient.buscarMascota(codigo);

        if (mascotaActual == null) {
            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(Map.of(
                            "mensaje",
                            "Mascota no encontrada"
                    ));
        }

        // No permitir modificar mascotas de otros clientes.
        if (!perteneceAlCliente(
                mascotaActual,
                clienteId)) {

            return ResponseEntity
                    .status(HttpStatus.FORBIDDEN)
                    .body(Map.of(
                            "mensaje",
                            "No puedes modificar una mascota de otro cliente"
                    ));
        }

        String error = validarMascota(datos);

        if (error != null) {
            return ResponseEntity
                    .badRequest()
                    .body(Map.of("mensaje", error));
        }

        // Solo se aceptan los datos editables.
        // El cliente propietario siempre se obtiene
        // de la sesión, nunca del navegador.
        Mascota mascotaActualizada =
                prepararMascota(datos);

        String resultado =
                mascotaSoapClient.actualizarMascota(
                        codigo,
                        mascotaActualizada,
                        clienteId
                );

        return ResponseEntity.ok(Map.of(
                "mensaje",
                resultado != null
                        ? resultado
                        : "Solicitud de actualización procesada"
        ));
    }

    // ==========================================
    // 7. ELIMINAR MI MASCOTA
    // ==========================================

    @DeleteMapping("/mascotas/{codigo}")
    public ResponseEntity<?> eliminarMiMascota(
            @PathVariable("codigo") Integer codigo,
            HttpSession sesion) {

        Integer clienteId = obtenerClienteId(sesion);

        if (clienteId == null) {
            return accesoDenegado();
        }

        Mascota mascota =
                mascotaSoapClient.buscarMascota(codigo);

        if (mascota == null) {
            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(Map.of(
                            "mensaje",
                            "Mascota no encontrada"
                    ));
        }

        // Verificar la propiedad antes de eliminar.
        if (!perteneceAlCliente(
                mascota,
                clienteId)) {

            return ResponseEntity
                    .status(HttpStatus.FORBIDDEN)
                    .body(Map.of(
                            "mensaje",
                            "No puedes eliminar una mascota de otro cliente"
                    ));
        }

        String resultado =
                mascotaSoapClient.eliminarMascota(codigo);

        return ResponseEntity.ok(Map.of(
                "mensaje",
                resultado != null
                        ? resultado
                        : "Solicitud de eliminación procesada"
        ));
    }

    // ==========================================
    // 8. CONSULTAR MIS CITAS
    // ==========================================

    @GetMapping("/citas")
    public ResponseEntity<?> misCitas(
            HttpSession sesion) {

        Integer clienteId = obtenerClienteId(sesion);

        if (clienteId == null) {
            return accesoDenegado();
        }

        List<CitaResponse> propias =
                citaSoapClient.listarCitas()
                        .stream()
                        .filter(cita ->
                                cita.getMascota() != null
                        )
                        .filter(cita ->
                                cita.getMascota()
                                        .getCliente() != null
                        )
                        .filter(cita ->
                                clienteId.equals(
                                        cita.getMascota()
                                                .getCliente()
                                                .getId()
                                )
                        )
                        .map(CitaResponse::desdeSoap)
                        .toList();

        return ResponseEntity.ok(propias);
    }


    // ==========================================
    // CONSULTAR HORARIOS OCUPADOS POR FECHA
    // ==========================================

    @GetMapping("/citas/horarios-ocupados")
    public ResponseEntity<?> obtenerHorariosOcupados(
            @RequestParam("fecha") String fecha,
            HttpSession sesion) {

        Integer clienteId = obtenerClienteId(sesion);

        if (clienteId == null) {
            return accesoDenegado();
        }

        LocalDate fechaConsulta;

        try {
            fechaConsulta = LocalDate.parse(fecha);
        } catch (DateTimeParseException | NullPointerException e) {
            return ResponseEntity.badRequest().body(
                    Map.of("mensaje", "La fecha debe tener formato AAAA-MM-DD")
            );
        }

        if (fechaConsulta.isBefore(LocalDate.now())) {
            return ResponseEntity.badRequest().body(
                    Map.of("mensaje", "No puedes consultar fechas pasadas")
            );
        }

        List<String> horarios =
                citaSoapClient.obtenerHorariosOcupados(
                        fechaConsulta.toString()
                );

        return ResponseEntity.ok(Map.of(
                "fecha", fechaConsulta.toString(),
                "horariosOcupados", horarios
        ));
    }

    // ==========================================
    // 9. REGISTRAR UNA NUEVA CITA
    // ==========================================

    @PostMapping("/citas")
    public ResponseEntity<?> registrarCita(
            @RequestBody RegistrarCitaRequest request,
            HttpSession sesion) {

        Integer clienteId = obtenerClienteId(sesion);

        if (clienteId == null) {
            return accesoDenegado();
        }

        if (request == null
                || request.mascotaId() == null
                || request.fecha() == null
                || request.hora() == null
                || request.motivo() == null
                || request.motivo().isBlank()) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of(
                            "mensaje",
                            "Todos los campos son obligatorios"
                    ));
        }

        // VERIFICAR PROPIEDAD DE LA MASCOTA

        boolean esSuMascota =
                mascotaSoapClient.listarMascotas()
                        .stream()
                        .anyMatch(mascota ->
                                perteneceAlCliente(
                                        mascota,
                                        clienteId
                                )
                                        &&
                                        request.mascotaId().equals(
                                                mascota.getId()
                                        )
                        );

        if (!esSuMascota) {
            return ResponseEntity
                    .status(HttpStatus.FORBIDDEN)
                    .body(Map.of(
                            "mensaje",
                            "La mascota no pertenece a tu cuenta"
                    ));
        }

        // VALIDAR FECHA Y HORA

        try {
            LocalDate fecha =
                    LocalDate.parse(request.fecha());

            LocalTime hora =
                    LocalTime.parse(request.hora());

            LocalDateTime fechaHora =
                    LocalDateTime.of(fecha, hora);

            if (!fechaHora.isAfter(LocalDateTime.now())) {
                return ResponseEntity
                        .badRequest()
                        .body(Map.of(
                                "mensaje",
                                "La cita debe tener una fecha y hora futura"
                        ));
            }

        } catch (DateTimeParseException e) {
            return ResponseEntity
                    .badRequest()
                    .body(Map.of(
                            "mensaje",
                            "Formato inválido. Usa fecha AAAA-MM-DD y hora HH:mm"
                    ));
        }

        // REGISTRAR MEDIANTE SOAP

        String resultado = citaSoapClient.crearCita(
                request.mascotaId(),
                request.fecha(),
                request.hora(),
                request.motivo().trim()
        );

        return ResponseEntity.ok(Map.of(
                "mensaje",
                resultado != null
                        ? resultado
                        : "Solicitud de cita procesada"
        ));
    }

    // ==========================================
    // 10. CANCELAR UNA CITA
    // ==========================================

    @PatchMapping("/citas/{codigo}/cancelar")
    public ResponseEntity<?> cancelarMiCita(
            @PathVariable("codigo") Integer codigo,
            HttpSession sesion) {

        Integer clienteId = obtenerClienteId(sesion);

        if (clienteId == null) {
            return accesoDenegado();
        }

        Cita cita = citaSoapClient.buscarCita(codigo);

        if (cita == null
                || cita.getMascota() == null
                || cita.getMascota().getCliente() == null) {

            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(Map.of(
                            "mensaje",
                            "Cita no encontrada"
                    ));
        }

        // VERIFICAR PROPIETARIO

        Integer propietarioId =
                cita.getMascota()
                        .getCliente()
                        .getId();

        if (!clienteId.equals(propietarioId)) {
            return ResponseEntity
                    .status(HttpStatus.FORBIDDEN)
                    .body(Map.of(
                            "mensaje",
                            "No puedes cancelar una cita de otro cliente"
                    ));
        }

        // SOLO PERMITIR CANCELAR CITAS PENDIENTES

        String estado = cita.getEstado();

        if (!"PENDIENTE".equalsIgnoreCase(estado)) {
            return ResponseEntity
                    .badRequest()
                    .body(Map.of(
                            "mensaje",
                            "Solo puedes cancelar citas pendientes"
                    ));
        }

        // CANCELAR MEDIANTE SOAP

        String resultado =
                citaSoapClient.cancelarCita(codigo);

        // CONFIRMAR ESTADO ACTUALIZADO

        Cita citaActualizada =
                citaSoapClient.buscarCita(codigo);

        if (citaActualizada != null
                && "CANCELADA".equalsIgnoreCase(
                citaActualizada.getEstado()
        )) {

            return ResponseEntity.ok(Map.of(
                    "mensaje",
                    resultado != null
                            ? resultado
                            : "Cita cancelada correctamente",
                    "estado",
                    "CANCELADA",
                    "citaId",
                    codigo
            ));
        }

        return ResponseEntity
                .status(HttpStatus.CONFLICT)
                .body(Map.of(
                        "mensaje",
                        resultado != null
                                ? resultado
                                : "No se pudo confirmar la cancelación"
                ));
    }
}
