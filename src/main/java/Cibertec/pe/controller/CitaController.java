
package Cibertec.pe.controller;

import Cibertec.pe.client.CitaSoapClient;
import Cibertec.pe.dto.CitaResponse;

import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/citas")
public class CitaController {

    private final CitaSoapClient citaSoapClient;

    public CitaController(CitaSoapClient citaSoapClient) {
        this.citaSoapClient = citaSoapClient;
    }

    @GetMapping
    public List<CitaResponse> listarCitas(HttpSession session) {
        validarAdministrador(session);

        return citaSoapClient.listarCitas()
                .stream()
                .map(CitaResponse::desdeSoap)
                .toList();
    }

    @GetMapping("/{codigo}")
    public CitaResponse buscarCita(
            @PathVariable Integer codigo,
            HttpSession session) {

        validarAdministrador(session);

        var cita = citaSoapClient.buscarCita(codigo);

        if (cita == null) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Cita no encontrada"
            );
        }

        return CitaResponse.desdeSoap(cita);
    }

    @PostMapping
    public String crearCita(
            @RequestBody CitaRequest request,
            HttpSession session) {

        validarAdministrador(session);

        return citaSoapClient.crearCita(
                request.mascotaId(),
                request.fecha(),
                request.hora(),
                request.motivo()
        );
    }

    @PutMapping("/{codigo}")
    public String actualizarCita(
            @PathVariable Integer codigo,
            @RequestBody CitaRequest request,
            HttpSession session) {

        validarAdministrador(session);

        return citaSoapClient.actualizarCita(
                codigo,
                request.mascotaId(),
                request.fecha(),
                request.hora(),
                request.motivo()
        );
    }

    @PutMapping("/{codigo}/confirmar")
    public Map<String, String> confirmarCita(
            @PathVariable Integer codigo,
            HttpSession session) {

        validarAdministrador(session);

        String resultado = citaSoapClient.confirmarCita(codigo);

        return Map.of("mensaje", resultado);
    }

    @PutMapping("/{codigo}/atender")
    public Map<String, String> marcarCitaAtendida(
            @PathVariable Integer codigo,
            HttpSession session) {

        validarAdministrador(session);

        String resultado = citaSoapClient.marcarCitaAtendida(codigo);

        return Map.of("mensaje", resultado);
    }

    @PutMapping("/{codigo}/cancelar")
    public String cancelarCita(
            @PathVariable Integer codigo,
            HttpSession session) {

        validarAdministrador(session);

        return citaSoapClient.cancelarCita(codigo);
    }

    @DeleteMapping("/{codigo}")
    public String eliminarCita(
            @PathVariable Integer codigo,
            HttpSession session) {

        validarAdministrador(session);

        return citaSoapClient.eliminarCita(codigo);
    }

    private void validarAdministrador(HttpSession session) {

        Object rol = session.getAttribute("rol");

        if (rol == null) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Debes iniciar sesion"
            );
        }

        if (!"ADMIN".equalsIgnoreCase(rol.toString())) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Solo el administrador puede realizar esta accion"
            );
        }
    }

    public record CitaRequest(
            Integer mascotaId,
            String fecha,
            String hora,
            String motivo
    ) {}
}
