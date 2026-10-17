package Cibertec.pe.controller;

import Cibertec.pe.entity.Usuario;
import Cibertec.pe.repository.IUsuarioRepository;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/admin/usuarios")
public class RolController {

    private final IUsuarioRepository usuarioRepository;

    public RolController(IUsuarioRepository usuarioRepository) {
        this.usuarioRepository = usuarioRepository;
    }

    private ResponseEntity<?> validarAdministrador(
            HttpServletRequest request) {

        HttpSession sesion = request.getSession(false);

        if (sesion == null ||
                !(sesion.getAttribute("usuarioId") instanceof Integer)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("mensaje", "Debes iniciar sesion"));
        }

        Integer id = (Integer) sesion.getAttribute("usuarioId");
        Optional<Usuario> actual = usuarioRepository.findById(id);

        if (actual.isEmpty() ||
                !Boolean.TRUE.equals(actual.get().getActivo())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("mensaje", "Cuenta no disponible"));
        }

        if (!"ADMIN".equals(actual.get().getRol())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("mensaje", "Acceso exclusivo para administradores"));
        }

        return null;
    }

    public record UsuarioRolResponse(
            Integer id,
            Integer clienteId,
            String nombres,
            String correo,
            String rol,
            Boolean activo
    ) {}

    public record CambiarRolRequest(String rol) {}

    private UsuarioRolResponse convertir(Usuario usuario) {
        return new UsuarioRolResponse(
                usuario.getId(),
                usuario.getClienteId(),
                usuario.getNombres(),
                usuario.getCorreo(),
                usuario.getRol(),
                usuario.getActivo()
        );
    }

    @GetMapping
    public ResponseEntity<?> listar(HttpServletRequest request) {

        ResponseEntity<?> error = validarAdministrador(request);
        if (error != null) return error;

        List<UsuarioRolResponse> usuarios =
                usuarioRepository.findAll()
                        .stream()
                        .map(this::convertir)
                        .toList();

        return ResponseEntity.ok(usuarios);
    }

    @Transactional
    @PutMapping("/{id}/rol")
    public ResponseEntity<?> cambiarRol(
            @PathVariable Integer id,
            @RequestBody CambiarRolRequest request,
            HttpServletRequest httpRequest) {

        ResponseEntity<?> error = validarAdministrador(httpRequest);
        if (error != null) return error;

        if (request == null || request.rol() == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of("mensaje", "Debes indicar un rol"));
        }

        String nuevoRol = request.rol().trim().toUpperCase();

        if (!nuevoRol.equals("ADMIN") &&
                !nuevoRol.equals("CLIENTE")) {
            return ResponseEntity.badRequest()
                    .body(Map.of("mensaje", "Rol no permitido"));
        }

        Optional<Usuario> encontrado = usuarioRepository.findById(id);

        if (encontrado.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("mensaje", "Usuario no encontrado"));
        }

        Usuario usuario = encontrado.get();

        if (!Boolean.TRUE.equals(usuario.getActivo())) {
            return ResponseEntity.badRequest()
                    .body(Map.of("mensaje", "No puedes cambiar el rol de una cuenta inactiva"));
        }

        Integer idActual = (Integer) httpRequest
                .getSession(false)
                .getAttribute("usuarioId");

        if (id.equals(idActual)) {
            return ResponseEntity.badRequest()
                    .body(Map.of("mensaje", "No puedes cambiar tu propio rol"));
        }
        // Proteger la cuenta administrativa principal
        if (id.equals(2) && "CLIENTE".equals(nuevoRol)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of(
                            "mensaje",
                            "No se pueden retirar los permisos del administrador principal"
                    ));
        }

        if ("ADMIN".equals(usuario.getRol()) &&
                "CLIENTE".equals(nuevoRol)) {

            long administradores = usuarioRepository.findAll()
                    .stream()
                    .filter(u -> Boolean.TRUE.equals(u.getActivo()))
                    .filter(u -> "ADMIN".equals(u.getRol()))
                    .count();

            if (administradores <= 1) {
                return ResponseEntity.badRequest()
                        .body(Map.of("mensaje", "Debe existir al menos un administrador"));
            }
        }

        usuario.setRol(nuevoRol);
        usuarioRepository.save(usuario);

        return ResponseEntity.ok(Map.of(
                "mensaje", "Rol actualizado correctamente",
                "usuarioId", usuario.getId(),
                "rol", usuario.getRol()
        ));
    }
}
