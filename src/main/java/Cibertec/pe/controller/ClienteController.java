
package Cibertec.pe.controller;

import Cibertec.pe.client.ClienteSoapClient;
import Cibertec.pe.repository.IUsuarioRepository;
import Cibertec.pe.service.ActivacionService;
import Cibertec.pe.soap.cliente.Cliente;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Locale;
import java.util.Map;

@RestController
@RequestMapping("/api/clientes")
public class ClienteController {

    private static final Logger log =
            LoggerFactory.getLogger(ClienteController.class);

    private final ClienteSoapClient clienteSoapClient;
    private final ActivacionService activacionService;
    private final IUsuarioRepository usuarioRepository;

    public ClienteController(
            ClienteSoapClient clienteSoapClient,
            ActivacionService activacionService,
            IUsuarioRepository usuarioRepository) {

        this.clienteSoapClient = clienteSoapClient;
        this.activacionService = activacionService;
        this.usuarioRepository = usuarioRepository;
    }

    // ==========================================
    // 1. LISTAR CLIENTES
    // ==========================================

    @GetMapping
    public List<Cliente> listarClientes() {
        return clienteSoapClient.listarClientes();
    }

    // ==========================================
    // 2. BUSCAR CLIENTE
    // ==========================================

    @GetMapping("/{codigo}")
    public Cliente buscarCliente(
            @PathVariable Integer codigo) {

        return clienteSoapClient.buscarCliente(codigo);
    }

    // ==========================================
    // 3. REGISTRAR CLIENTE E INVITARLO
    // ==========================================

    @PostMapping
    public ResponseEntity<?> crearCliente(
            @RequestBody Cliente cliente,
            HttpServletRequest request) {

        ResponseEntity<?> acceso = verificarAdmin(request);

        if (acceso != null) {
            return acceso;
        }

        if (cliente == null
                || cliente.getNombres() == null
                || cliente.getNombres().isBlank()
                || cliente.getApellidos() == null
                || cliente.getApellidos().isBlank()
                || cliente.getCorreo() == null
                || cliente.getCorreo().isBlank()) {

            return ResponseEntity.badRequest().body(
                    Map.of(
                            "mensaje",
                            "Nombres, apellidos y correo son obligatorios"
                    )
            );
        }

        String correo = cliente.getCorreo()
                .trim()
                .toLowerCase(Locale.ROOT);

        if (usuarioRepository.existsByCorreo(correo)) {

            return ResponseEntity.status(409).body(
                    Map.of(
                            "mensaje",
                            "Ya existe una cuenta con este correo. "
                                    + "No se ha creado otro cliente."
                    )
            );
        }

        cliente.setCorreo(correo);
        cliente.setId(null);

        Integer clienteId;

        try {

            clienteId =
                    clienteSoapClient.crearClienteConId(cliente);

        } catch (Exception e) {

            log.error(
                    "Error al registrar cliente mediante SOAP",
                    e
            );

            return ResponseEntity.internalServerError().body(
                    Map.of(
                            "mensaje",
                            "No se pudo confirmar el registro SOAP. "
                                    + "Revisa la lista antes de intentar nuevamente."
                    )
            );
        }

        if (clienteId == null || clienteId <= 0) {

            return ResponseEntity.internalServerError().body(
                    Map.of(
                            "mensaje",
                            "SOAP no devolvio un identificador valido. "
                                    + "Revisa los clientes registrados."
                    )
            );
        }

        try {

            activacionService.crearInvitacion(
                    clienteId,
                    cliente.getNombres().trim() + " "
                            + cliente.getApellidos().trim(),
                    correo
            );

            return ResponseEntity.ok(
                    Map.of(
                            "mensaje",
                            "Cliente registrado e invitacion enviada correctamente",
                            "clienteId",
                            clienteId,
                            "invitacionEnviada",
                            true
                    )
            );

        } catch (Exception e) {

            log.error(
                    "Cliente SOAP {} registrado, pero fallo la invitacion",
                    clienteId,
                    e
            );

            return ResponseEntity.internalServerError().body(
                    Map.of(
                            "mensaje",
                            "El cliente fue registrado con ID "
                                    + clienteId
                                    + ", pero no se pudo completar la invitacion. "
                                    + "No vuelvas a registrarlo.",
                            "clienteId",
                            clienteId,
                            "invitacionEnviada",
                            false
                    )
            );
        }
    }

    // ==========================================
    // 4. INVITAR CLIENTE SOAP EXISTENTE
    // ==========================================

    @PostMapping("/{codigo}/invitar")
    public ResponseEntity<?> invitarClienteExistente(
            @PathVariable Integer codigo,
            HttpServletRequest request) {

        ResponseEntity<?> acceso = verificarAdmin(request);

        if (acceso != null) {
            return acceso;
        }

        if (codigo == null || codigo <= 0) {

            return ResponseEntity.badRequest().body(
                    Map.of(
                            "mensaje",
                            "El ID del cliente no es valido"
                    )
            );
        }

        Cliente cliente;

        try {

            cliente = clienteSoapClient.buscarCliente(codigo);

        } catch (Exception e) {

            log.error(
                    "Error consultando cliente SOAP {}",
                    codigo,
                    e
            );

            return ResponseEntity.internalServerError().body(
                    Map.of(
                            "mensaje",
                            "No se pudo consultar el cliente SOAP"
                    )
            );
        }

        if (cliente == null || cliente.getId() == null) {

            return ResponseEntity.status(404).body(
                    Map.of(
                            "mensaje",
                            "No existe un cliente SOAP con ese ID"
                    )
            );
        }

        if (cliente.getCorreo() == null
                || cliente.getCorreo().isBlank()
                || cliente.getNombres() == null
                || cliente.getNombres().isBlank()) {

            return ResponseEntity.badRequest().body(
                    Map.of(
                            "mensaje",
                            "El cliente debe tener nombre y correo"
                    )
            );
        }

        String correo = cliente.getCorreo()
                .trim()
                .toLowerCase(Locale.ROOT);

        if (usuarioRepository.existsByCorreo(correo)) {

            return ResponseEntity.status(409).body(
                    Map.of(
                            "mensaje",
                            "Ya existe una cuenta con este correo. "
                                    + "No se ha creado otra."
                    )
            );
        }

        String nombresCompletos =
                cliente.getNombres().trim();

        if (cliente.getApellidos() != null
                && !cliente.getApellidos().isBlank()) {

            nombresCompletos += " "
                    + cliente.getApellidos().trim();
        }

        try {

            activacionService.crearInvitacion(
                    codigo,
                    nombresCompletos,
                    correo
            );

            log.info(
                    "Invitacion procesada para cliente SOAP {}",
                    codigo
            );

            return ResponseEntity.ok(
                    Map.of(
                            "mensaje",
                            "Invitacion enviada correctamente",
                            "clienteId",
                            codigo,
                            "invitacionEnviada",
                            true
                    )
            );

        } catch (Exception e) {

            log.error(
                    "Error al invitar al cliente SOAP {}",
                    codigo,
                    e
            );

            return ResponseEntity.internalServerError().body(
                    Map.of(
                            "mensaje",
                            "No se pudo completar la invitacion. "
                                    + "Revisa si la cuenta fue creada "
                                    + "antes de volver a intentarlo.",
                            "clienteId",
                            codigo,
                            "invitacionEnviada",
                            false
                    )
            );
        }
    }

    // ==========================================
    // 5. ACTUALIZAR CLIENTE
    // ==========================================

    @PutMapping("/{codigo}")
    public String actualizarCliente(
            @PathVariable Integer codigo,
            @RequestBody Cliente cliente) {

        return clienteSoapClient.actualizarCliente(
                codigo,
                cliente
        );
    }

    // ==========================================
    // 6. ELIMINAR CLIENTE
    // ==========================================

    @DeleteMapping("/{codigo}")
    public String eliminarCliente(
            @PathVariable Integer codigo) {

        return clienteSoapClient.eliminarCliente(codigo);
    }

    // ==========================================
    // 7. VERIFICAR ADMINISTRADOR
    // ==========================================

    private ResponseEntity<?> verificarAdmin(
            HttpServletRequest request) {

        HttpSession sesion = request.getSession(false);

        if (sesion == null
                || sesion.getAttribute("usuarioId") == null) {

            return ResponseEntity.status(401).body(
                    Map.of(
                            "mensaje",
                            "Debes iniciar sesion"
                    )
            );
        }

        if (!"ADMIN".equals(sesion.getAttribute("rol"))) {

            return ResponseEntity.status(403).body(
                    Map.of(
                            "mensaje",
                            "Solo el administrador puede realizar esta operacion"
                    )
            );
        }

        return null;
    }
}
