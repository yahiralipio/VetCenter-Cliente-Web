
package Cibertec.pe.controller;

import Cibertec.pe.client.PedidoSoapClient;
import Cibertec.pe.entity.Cliente;
import Cibertec.pe.entity.Usuario;
import Cibertec.pe.repository.IClienteRepository;
import Cibertec.pe.repository.IUsuarioRepository;
import Cibertec.pe.service.ComprobantePdfService;
import Cibertec.pe.soap.pedido.PedidoDetalleResumen;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/pedidos")
public class ComprobanteController {

    private final PedidoSoapClient pedidoSoapClient;
    private final ComprobantePdfService pdfService;
    private final IUsuarioRepository usuarioRepository;
    private final IClienteRepository clienteRepository;

    public ComprobanteController(
            PedidoSoapClient pedidoSoapClient,
            ComprobantePdfService pdfService,
            IUsuarioRepository usuarioRepository,
            IClienteRepository clienteRepository) {

        this.pedidoSoapClient = pedidoSoapClient;
        this.pdfService = pdfService;
        this.usuarioRepository = usuarioRepository;
        this.clienteRepository = clienteRepository;
    }

    @GetMapping("/{pedidoId}/comprobante")
    public ResponseEntity<?> descargar(
            @PathVariable Integer pedidoId,
            HttpServletRequest request) {

        HttpSession sesion = request.getSession(false);

        if (sesion == null ||
                !(sesion.getAttribute("usuarioId") instanceof Integer)) {

            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of(
                            "mensaje", "Debes iniciar sesión"
                    ));
        }

        Integer usuarioId =
                (Integer) sesion.getAttribute("usuarioId");

        Optional<Usuario> encontrado =
                usuarioRepository.findById(usuarioId);

        if (encontrado.isEmpty() ||
                !Boolean.TRUE.equals(encontrado.get().getActivo())) {

            sesion.invalidate();

            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of(
                            "mensaje", "Cuenta no disponible"
                    ));
        }

        Usuario usuario = encontrado.get();

        if (!"CLIENTE".equalsIgnoreCase(usuario.getRol())) {

            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of(
                            "mensaje", "Acceso no permitido"
                    ));
        }

        if (pedidoId == null || pedidoId <= 0) {

            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "mensaje", "Pedido inválido"
                    ));
        }

        try {

            PedidoDetalleResumen pedido =
                    pedidoSoapClient.obtenerDetallePedido(
                            pedidoId,
                            usuarioId
                    );

            if (pedido == null ||
                    pedido.getId() == null ||
                    !usuarioId.equals(pedido.getUsuarioId())) {

                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of(
                                "mensaje", "Pedido no encontrado"
                        ));
            }

            String nombreCliente = usuario.getNombres();
            String correoCliente = usuario.getCorreo();
            String dniCliente = null;
            String telefonoCliente = null;

            // Recuperar información del cliente asociado al usuario
            if (usuario.getClienteId() != null) {

                Optional<Cliente> clienteEncontrado =
                        clienteRepository.findById(
                                usuario.getClienteId()
                        );

                if (clienteEncontrado.isPresent()) {

                    Cliente cliente = clienteEncontrado.get();

                    nombreCliente = (
                            cliente.getNombres() + " " +
                                    cliente.getApellidos()
                    ).trim();

                    dniCliente = cliente.getDni();
                    telefonoCliente = cliente.getTelefono();

                    if (cliente.getCorreo() != null &&
                            !cliente.getCorreo().isBlank()) {
                        correoCliente = cliente.getCorreo();
                    }
                }
            }

            byte[] pdf = pdfService.generar(
                    pedido,
                    nombreCliente,
                    correoCliente,
                    dniCliente,
                    telefonoCliente
            );

            String nombreArchivo = String.format(
                    "VetCenter-Boleta-%08d.pdf",
                    pedido.getId()
            );

            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_PDF)
                    .header(
                            HttpHeaders.CONTENT_DISPOSITION,
                            "attachment; filename=\"" +
                                    nombreArchivo + "\""
                    )
                    .body(pdf);

        } catch (Exception e) {

            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                    .body(Map.of(
                            "mensaje",
                            "No se pudo generar el comprobante"
                    ));
        }
    }
}
