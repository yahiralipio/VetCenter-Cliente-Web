
package Cibertec.pe.controller;

import Cibertec.pe.client.PedidoSoapClient;
import Cibertec.pe.entity.Cliente;
import Cibertec.pe.entity.Usuario;
import Cibertec.pe.repository.IClienteRepository;
import Cibertec.pe.repository.IUsuarioRepository;
import Cibertec.pe.soap.pedido.PedidoDetalleResumen;
import Cibertec.pe.soap.pedido.PedidoResumen;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/admin/pedidos")
public class PedidoAdminController {

    private final PedidoSoapClient pedidoSoapClient;
    private final IUsuarioRepository usuarioRepository;
    private final IClienteRepository clienteRepository;

    public PedidoAdminController(
            PedidoSoapClient pedidoSoapClient,
            IUsuarioRepository usuarioRepository,
            IClienteRepository clienteRepository) {

        this.pedidoSoapClient = pedidoSoapClient;
        this.usuarioRepository = usuarioRepository;
        this.clienteRepository = clienteRepository;
    }

    private ResponseEntity<?> validarAdministrador(
            HttpSession sesion) {

        if (sesion == null ||
                !(sesion.getAttribute("usuarioId")
                        instanceof Integer)) {

            return ResponseEntity.status(
                    HttpStatus.UNAUTHORIZED
            ).body(Map.of(
                    "mensaje", "Debes iniciar sesión"
            ));
        }

        Integer usuarioId =
                (Integer) sesion.getAttribute("usuarioId");

        Optional<Usuario> encontrado =
                usuarioRepository.findById(usuarioId);

        if (encontrado.isEmpty() ||
                !Boolean.TRUE.equals(
                        encontrado.get().getActivo())) {

            sesion.invalidate();

            return ResponseEntity.status(
                    HttpStatus.UNAUTHORIZED
            ).body(Map.of(
                    "mensaje", "Cuenta no disponible"
            ));
        }

        if (!"ADMIN".equalsIgnoreCase(
                encontrado.get().getRol())) {

            return ResponseEntity.status(
                    HttpStatus.FORBIDDEN
            ).body(Map.of(
                    "mensaje",
                    "Acceso exclusivo para administradores"
            ));
        }

        return null;
    }

    private Map<String, Object> datosComprador(
            Integer usuarioId) {

        Map<String, Object> datos = new LinkedHashMap<>();

        String nombreCompleto = "Cliente no identificado";
        String dni = "No registrado";

        if (usuarioId != null) {

            Optional<Usuario> usuario =
                    usuarioRepository.findById(usuarioId);

            if (usuario.isPresent()) {

                Usuario cuenta = usuario.get();

                if (cuenta.getNombres() != null &&
                        !cuenta.getNombres().isBlank()) {

                    nombreCompleto = cuenta.getNombres();
                }

                if (cuenta.getClienteId() != null) {

                    Optional<Cliente> cliente =
                            clienteRepository.findById(
                                    cuenta.getClienteId()
                            );

                    if (cliente.isPresent()) {

                        Cliente persona = cliente.get();

                        nombreCompleto = (
                                persona.getNombres() + " " +
                                        persona.getApellidos()
                        ).trim();

                        if (persona.getDni() != null &&
                                !persona.getDni().isBlank()) {

                            dni = persona.getDni();
                        }
                    }
                }
            }
        }

        datos.put("nombreCompleto", nombreCompleto);
        datos.put("dni", dni);

        return datos;
    }

    @GetMapping
    public ResponseEntity<?> listarTodos(
            HttpServletRequest request) {

        ResponseEntity<?> error = validarAdministrador(
                request.getSession(false)
        );

        if (error != null) {
            return error;
        }

        try {
            List<PedidoResumen> pedidos =
                    pedidoSoapClient.listarTodosPedidos();

            List<Map<String, Object>> resultado =
                    pedidos.stream().map(pedido -> {

                        Map<String, Object> fila =
                                new LinkedHashMap<>();

                        fila.put("id", pedido.getId());
                        fila.put(
                                "usuarioId",
                                pedido.getUsuarioId()
                        );
                        fila.put("fecha", pedido.getFecha());
                        fila.put("total", pedido.getTotal());
                        fila.put("estado", pedido.getEstado());
                        fila.put(
                                "estadoPago",
                                pedido.getEstadoPago()
                        );

                        fila.putAll(
                                datosComprador(
                                        pedido.getUsuarioId()
                                )
                        );

                        return fila;

                    }).toList();

            return ResponseEntity.ok(resultado);

        } catch (Exception e) {

            return ResponseEntity.status(
                    HttpStatus.BAD_GATEWAY
            ).body(Map.of(
                    "mensaje",
                    "No se pudieron consultar los pedidos"
            ));
        }
    }

    @GetMapping("/{pedidoId}/detalle")
    public ResponseEntity<?> obtenerDetalle(
            @PathVariable Integer pedidoId,
            HttpServletRequest request) {

        ResponseEntity<?> error = validarAdministrador(
                request.getSession(false)
        );

        if (error != null) {
            return error;
        }

        if (pedidoId == null || pedidoId <= 0) {

            return ResponseEntity.badRequest().body(
                    Map.of(
                            "mensaje",
                            "Pedido inválido"
                    )
            );
        }

        try {
            PedidoDetalleResumen detalle =
                    pedidoSoapClient.obtenerDetallePedidoAdmin(
                            pedidoId
                    );

            if (detalle == null ||
                    detalle.getId() == null) {

                return ResponseEntity.status(
                        HttpStatus.NOT_FOUND
                ).body(Map.of(
                        "mensaje",
                        "Pedido no encontrado"
                ));
            }

            Map<String, Object> resultado =
                    new LinkedHashMap<>();

            resultado.put("id", detalle.getId());
            resultado.put(
                    "usuarioId",
                    detalle.getUsuarioId()
            );
            resultado.put("fecha", detalle.getFecha());
            resultado.put("total", detalle.getTotal());
            resultado.put("estado", detalle.getEstado());
            resultado.put(
                    "estadoPago",
                    detalle.getEstadoPago()
            );
            resultado.put(
                    "detalles",
                    detalle.getDetalles()
            );

            resultado.putAll(
                    datosComprador(
                            detalle.getUsuarioId()
                    )
            );

            return ResponseEntity.ok(resultado);

        } catch (Exception e) {

            return ResponseEntity.status(
                    HttpStatus.BAD_GATEWAY
            ).body(Map.of(
                    "mensaje",
                    "No se pudo consultar el detalle"
            ));
        }
    }

    // ACTUALIZAR ESTADO DEL PEDIDO - ADMINISTRADOR
    @PatchMapping("/{pedidoId}/estado")
    public ResponseEntity<?> actualizarEstado(
            @PathVariable Integer pedidoId,
            @RequestBody Map<String, String> datos,
            HttpServletRequest request) {

        ResponseEntity<?> error = validarAdministrador(
                request.getSession(false)
        );

        if (error != null) {
            return error;
        }

        if (pedidoId == null || pedidoId <= 0) {
            return ResponseEntity.badRequest().body(
                    Map.of("mensaje", "Pedido inválido.")
            );
        }

        String nuevoEstado = datos == null
                ? null
                : datos.get("estado");

        if (nuevoEstado == null || nuevoEstado.isBlank()) {
            return ResponseEntity.badRequest().body(
                    Map.of("mensaje", "Selecciona un estado válido.")
            );
        }

        try {
            String resultado = pedidoSoapClient.actualizarEstadoPedido(
                    pedidoId,
                    nuevoEstado
            );

            if (resultado == null) {
                return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                        .body(Map.of(
                                "mensaje",
                                "El servidor SOAP no respondió."
                        ));
            }

            if (resultado.startsWith("ERROR:")) {
                return ResponseEntity.badRequest().body(
                        Map.of(
                                "mensaje",
                                resultado.substring(6).trim()
                        )
                );
            }

            return ResponseEntity.ok(
                    Map.of("mensaje", resultado)
            );

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                    .body(Map.of(
                            "mensaje",
                            "No se pudo actualizar el estado del pedido."
                    ));
        }
    }
}
