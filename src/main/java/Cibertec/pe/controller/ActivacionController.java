package Cibertec.pe.controller;

import Cibertec.pe.service.ActivacionService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/activacion")
public class ActivacionController {

    private final ActivacionService activacionService;

    public ActivacionController(
            ActivacionService activacionService) {
        this.activacionService = activacionService;
    }

    // ==========================================
    // 1. ACTIVAR CUENTA DESDE EL CORREO
    // ==========================================

    @PostMapping("/activar")
    public ResponseEntity<?> activarCuenta(
            @RequestBody ActivarCuentaRequest request) {

        try {
            String resultado = activacionService.activarCuenta(
                    request.token(),
                    request.password()
            );

            return ResponseEntity.ok(
                    Map.of("mensaje", resultado)
            );

        } catch (IllegalArgumentException |
                 IllegalStateException e) {

            return ResponseEntity.badRequest().body(
                    Map.of("mensaje", e.getMessage())
            );
        }
    }

    // ==========================================
    // 2. REENVIAR INVITACION (SOLO ADMIN)
    // ==========================================

    @PostMapping("/reenviar")
    public ResponseEntity<?> reenviarInvitacion(
            @RequestBody ReenviarInvitacionRequest request,
            HttpServletRequest httpRequest) {

        HttpSession sesion =
                httpRequest.getSession(false);

        if (sesion == null ||
                sesion.getAttribute("usuarioId") == null) {

            return ResponseEntity.status(
                    HttpStatus.UNAUTHORIZED
            ).body(
                    Map.of(
                            "mensaje",
                            "Debes iniciar sesion"
                    )
            );
        }

        Object rol = sesion.getAttribute("rol");

        if (!"ADMIN".equals(rol)) {

            return ResponseEntity.status(
                    HttpStatus.FORBIDDEN
            ).body(
                    Map.of(
                            "mensaje",
                            "Solo el administrador puede reenviar invitaciones"
                    )
            );
        }

        try {
            String resultado =
                    activacionService.reenviarInvitacion(
                            request.correo()
                    );

            return ResponseEntity.ok(
                    Map.of("mensaje", resultado)
            );

        } catch (IllegalArgumentException |
                 IllegalStateException e) {

            return ResponseEntity.badRequest().body(
                    Map.of("mensaje", e.getMessage())
            );

        } catch (Exception e) {

            return ResponseEntity.status(
                    HttpStatus.INTERNAL_SERVER_ERROR
            ).body(
                    Map.of(
                            "mensaje",
                            "No se pudo enviar la invitacion. "
                                    + "La cuenta existente no fue eliminada."
                    )
            );
        }
    }

    // ==========================================
    // 3. DTO PARA ACTIVAR CUENTA
    // ==========================================

    public record ActivarCuentaRequest(
            String token,
            String password
    ) {
    }

    // ==========================================
    // 4. DTO PARA REENVIAR INVITACION
    // ==========================================

    public record ReenviarInvitacionRequest(
            String correo
    ) {
    }
}
