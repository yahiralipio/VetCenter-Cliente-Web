
package Cibertec.pe.controller;

import Cibertec.pe.client.ClienteSoapClient;
import Cibertec.pe.entity.Usuario;
import Cibertec.pe.repository.IUsuarioRepository;
import Cibertec.pe.service.UsuarioService;
import Cibertec.pe.soap.cliente.Cliente;
import Cibertec.pe.service.PerfilService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UsuarioService usuarioService;
    private final IUsuarioRepository usuarioRepository;
    private final ClienteSoapClient clienteSoapClient;
    private final PerfilService perfilService;

    public AuthController(
            UsuarioService usuarioService,
            IUsuarioRepository usuarioRepository,
            ClienteSoapClient clienteSoapClient,
            PerfilService perfilService) {

        this.usuarioService = usuarioService;
        this.usuarioRepository = usuarioRepository;
        this.clienteSoapClient = clienteSoapClient;
        this.perfilService = perfilService;
    }

    // ==========================================
    // 1. REGISTRO PUBLICO
    // ==========================================

    @PostMapping("/registro")
    public ResponseEntity<?> registrar(
            @RequestBody RegistroRequest request) {

        String resultado = usuarioService.registrar(
                request.nombres(),
                request.apellidos(),
                request.dni(),
                request.telefono(),
                request.correo(),
                request.password()
        );

        if (!resultado.equals(
                "Usuario registrado correctamente")) {

            return ResponseEntity.badRequest()
                    .body(Map.of("mensaje", resultado));
        }

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(Map.of("mensaje", resultado));
    }

    // ==========================================
    // 2. INICIAR SESION
    // ==========================================

    @PostMapping("/login")
    public ResponseEntity<?> login(
            @RequestBody LoginRequest request,
            HttpServletRequest httpRequest) {

        Usuario usuario = usuarioService.autenticar(
                request.correo(),
                request.password()
        );

        if (usuario == null) {
            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of(
                            "mensaje",
                            "Credenciales incorrectas"
                    ));
        }

        // Invalidar sesion anterior
        HttpSession anterior =
                httpRequest.getSession(false);

        if (anterior != null) {
            anterior.invalidate();
        }

        // Crear sesion nueva
        HttpSession sesion =
                httpRequest.getSession(true);

        sesion.setAttribute(
                "usuarioId",
                usuario.getId()
        );

        sesion.setAttribute(
                "nombres",
                usuario.getNombres()
        );

        sesion.setAttribute(
                "rol",
                usuario.getRol()
        );

        if (usuario.getClienteId() != null) {
            sesion.setAttribute(
                    "clienteId",
                    usuario.getClienteId()
            );
        }

        sesion.setMaxInactiveInterval(30 * 60);

        Map<String, Object> respuesta =
                new HashMap<>();

        respuesta.put(
                "mensaje",
                "Inicio de sesion correcto"
        );

        respuesta.put(
                "usuarioId",
                usuario.getId()
        );

        respuesta.put(
                "nombres",
                usuario.getNombres()
        );

        respuesta.put(
                "rol",
                usuario.getRol()
        );

        respuesta.put(
                "clienteId",
                usuario.getClienteId()
        );

        return ResponseEntity.ok(respuesta);
    }

    // ==========================================
    // 3. PERFIL DE SESION ACTUALIZADO
    // ==========================================

    @GetMapping("/perfil")
    public ResponseEntity<?> perfil(
            HttpServletRequest httpRequest) {

        HttpSession sesion =
                httpRequest.getSession(false);

        if (sesion == null
                || sesion.getAttribute("usuarioId") == null) {

            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of(
                            "mensaje",
                            "No has iniciado sesion"
                    ));
        }

        Integer usuarioId =
                (Integer) sesion.getAttribute("usuarioId");

        Optional<Usuario> usuarioOptional =
                usuarioRepository.findById(usuarioId);

        if (usuarioOptional.isEmpty()) {
            sesion.invalidate();

            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of(
                            "mensaje",
                            "La cuenta ya no existe"
                    ));
        }

        Usuario usuario = usuarioOptional.get();

        Map<String, Object> respuesta =
                new HashMap<>();

        respuesta.put(
                "mensaje",
                "Sesion activa"
        );

        respuesta.put(
                "usuarioId",
                usuario.getId()
        );

        respuesta.put(
                "nombres",
                usuario.getNombres()
        );

        respuesta.put(
                "correo",
                usuario.getCorreo()
        );

        respuesta.put(
                "rol",
                usuario.getRol()
        );

        respuesta.put(
                "clienteId",
                usuario.getClienteId()
        );

        // Consultar datos personales desde SOAP
        if ("CLIENTE".equalsIgnoreCase(usuario.getRol())
                && usuario.getClienteId() != null) {

            Cliente cliente = clienteSoapClient.buscarCliente(
                    usuario.getClienteId()
            );

            if (cliente != null) {

                respuesta.put(
                        "nombres",
                        cliente.getNombres()
                );

                respuesta.put(
                        "apellidos",
                        cliente.getApellidos()
                );

                respuesta.put(
                        "telefono",
                        cliente.getTelefono()
                );

                respuesta.put(
                        "dni",
                        cliente.getDni()
                );
            }
        }

        return ResponseEntity.ok(respuesta);
    }


    // ==========================================
    // CAMBIAR MI CONTRASEÑA
    // ==========================================

    @PutMapping("/password")
    public ResponseEntity<?> cambiarPassword(
            @RequestBody CambiarPasswordRequest request,
            HttpServletRequest httpRequest) {

        HttpSession sesion = httpRequest.getSession(false);

        if (sesion == null ||
                !(sesion.getAttribute("usuarioId") instanceof Integer)) {

            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of(
                            "mensaje",
                            "Debes iniciar sesion"
                    ));
        }

        Integer usuarioId =
                (Integer) sesion.getAttribute("usuarioId");

        String resultado = perfilService.cambiarPassword(
                usuarioId,
                request.passwordActual(),
                request.passwordNueva(),
                request.confirmarPassword()
        );

        if (!"Contraseña actualizada correctamente".equals(resultado)) {
            return ResponseEntity.badRequest()
                    .body(Map.of("mensaje", resultado));
        }

        return ResponseEntity.ok(
                Map.of("mensaje", resultado)
        );
    }

    public record CambiarPasswordRequest(
            String passwordActual,
            String passwordNueva,
            String confirmarPassword
    ) {}


    // ==========================================
    // ACTUALIZAR MI PERFIL
    // ==========================================

    @PutMapping("/perfil")
    public ResponseEntity<?> actualizarPerfil(
            @RequestBody ActualizarPerfilRequest request,
            HttpServletRequest httpRequest) {

        HttpSession sesion = httpRequest.getSession(false);

        if (sesion == null ||
                !(sesion.getAttribute("usuarioId") instanceof Integer)) {

            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of(
                            "mensaje",
                            "Debes iniciar sesion"
                    ));
        }

        Integer usuarioId =
                (Integer) sesion.getAttribute("usuarioId");

        String resultado = perfilService.actualizarPerfil(
                usuarioId,
                request.nombres(),
                request.apellidos(),
                request.telefono()
        );

        if (!"Perfil actualizado correctamente".equals(resultado)) {
            return ResponseEntity
                    .badRequest()
                    .body(Map.of("mensaje", resultado));
        }

        sesion.setAttribute("nombres", request.nombres().trim());

        return ResponseEntity.ok(
                Map.of("mensaje", resultado)
        );
    }

    public record ActualizarPerfilRequest(
            String nombres,
            String apellidos,
            String telefono
    ) {}

    // ==========================================
    // 4. CERRAR SESION
    // ==========================================

    @PostMapping("/logout")
    public ResponseEntity<?> logout(
            HttpServletRequest httpRequest) {

        HttpSession sesion =
                httpRequest.getSession(false);

        if (sesion != null) {
            sesion.invalidate();
        }

        return ResponseEntity.ok(
                Map.of(
                        "mensaje",
                        "Sesion cerrada correctamente"
                )
        );
    }

    // ==========================================
    // 5. DTO DE REGISTRO
    // ==========================================

    public record RegistroRequest(
            String nombres,
            String apellidos,
            String dni,
            String telefono,
            String correo,
            String password
    ) {}

    // ==========================================
    // 6. DTO DE LOGIN
    // ==========================================

    public record LoginRequest(
            String correo,
            String password
    ) {}
}
