
package Cibertec.pe.controller;

import Cibertec.pe.client.PedidoSoapClient;
import Cibertec.pe.entity.Usuario;
import Cibertec.pe.repository.IUsuarioRepository;
import Cibertec.pe.soap.pedido.ItemCompra;
import Cibertec.pe.soap.pedido.PedidoResumen;
import Cibertec.pe.soap.pedido.PedidoDetalleResumen;

import jakarta.servlet.http.HttpSession;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

@RestController
@RequestMapping("/api/pedidos")
public class PedidoController {

    private final PedidoSoapClient pedidoSoapClient;
    private final IUsuarioRepository usuarioRepository;

    private static final Set<String> METODOS_PERMITIDOS =
            Set.of("YAPE", "PLIN", "TARJETA");

    public PedidoController(
            PedidoSoapClient pedidoSoapClient,
            IUsuarioRepository usuarioRepository) {

        this.pedidoSoapClient = pedidoSoapClient;
        this.usuarioRepository = usuarioRepository;
    }

    // Ahora acepta productos y medicamentos.
    // Se conserva productoId para compatibilidad.
    public record ItemSolicitud(
            Integer productoId,
            Integer medicamentoId,
            Integer cantidad
    ) {}

    public record PedidoSolicitud(
            List<ItemSolicitud> items,
            String metodoPago
    ) {}

    private ResponseEntity<?> validarSesion(
            HttpSession sesion) {

        if (sesion == null ||
                !(sesion.getAttribute("usuarioId")
                        instanceof Integer)) {

            return ResponseEntity.status(
                    HttpStatus.UNAUTHORIZED
            ).body(Map.of(
                    "mensaje", "Debes iniciar sesion"
            ));
        }

        Integer usuarioId =
                (Integer) sesion.getAttribute("usuarioId");

        Optional<Usuario> encontrado =
                usuarioRepository.findById(usuarioId);

        if (encontrado.isEmpty() ||
                !Boolean.TRUE.equals(
                        encontrado.get().getActivo()
                )) {

            sesion.invalidate();

            return ResponseEntity.status(
                    HttpStatus.UNAUTHORIZED
            ).body(Map.of(
                    "mensaje", "Cuenta no disponible"
            ));
        }

        if (!"CLIENTE".equalsIgnoreCase(
                encontrado.get().getRol()
        )) {

            return ResponseEntity.status(
                    HttpStatus.FORBIDDEN
            ).body(Map.of(
                    "mensaje",
                    "Solo los clientes pueden comprar"
            ));
        }

        return null;
    }

    // REGISTRAR PEDIDO CON METODO DE PAGO
    @PostMapping
    public ResponseEntity<?> crearPedido(
            @RequestBody PedidoSolicitud solicitud,
            HttpSession sesion) {

        ResponseEntity<?> error = validarSesion(sesion);
        if (error != null) return error;

        if (solicitud == null ||
                solicitud.items() == null ||
                solicitud.items().isEmpty()) {

            return ResponseEntity.badRequest().body(
                    Map.of("mensaje", "El carrito esta vacio")
            );
        }

        if (solicitud.items().size() > 100) {
            return ResponseEntity.badRequest().body(
                    Map.of(
                            "mensaje",
                            "Demasiados articulos en el carrito"
                    )
            );
        }

        if (solicitud.metodoPago() == null ||
                solicitud.metodoPago().isBlank()) {

            return ResponseEntity.badRequest().body(
                    Map.of(
                            "mensaje",
                            "Selecciona un metodo de pago"
                    )
            );
        }

        String metodoPago = solicitud.metodoPago()
                .trim()
                .toUpperCase(Locale.ROOT);

        if (!METODOS_PERMITIDOS.contains(metodoPago)) {
            return ResponseEntity.badRequest().body(
                    Map.of(
                            "mensaje",
                            "Selecciona YAPE, PLIN o TARJETA"
                    )
            );
        }

        List<ItemCompra> items = new ArrayList<>();

        for (ItemSolicitud item : solicitud.items()) {

            if (item == null ||
                    item.cantidad() == null ||
                    item.cantidad() <= 0) {

                return ResponseEntity.badRequest().body(
                        Map.of(
                                "mensaje",
                                "Articulo o cantidad invalida"
                        )
                );
            }

            boolean tieneProducto =
                    item.productoId() != null;

            boolean tieneMedicamento =
                    item.medicamentoId() != null;

            // Cada fila representa un unico articulo.
            if (tieneProducto == tieneMedicamento) {

                return ResponseEntity.badRequest().body(
                        Map.of(
                                "mensaje",
                                "Cada articulo debe indicar un producto "
                                        + "o un medicamento, pero no ambos"
                        )
                );
            }

            if (tieneProducto && item.productoId() <= 0) {

                return ResponseEntity.badRequest().body(
                        Map.of(
                                "mensaje",
                                "Identificador de producto invalido"
                        )
                );
            }

            if (tieneMedicamento &&
                    item.medicamentoId() <= 0) {

                return ResponseEntity.badRequest().body(
                        Map.of(
                                "mensaje",
                                "Identificador de medicamento invalido"
                        )
                );
            }

            ItemCompra compra = new ItemCompra();

            if (tieneProducto) {
                compra.setProductoId(item.productoId());
            } else {
                compra.setMedicamentoId(item.medicamentoId());
            }

            compra.setCantidad(item.cantidad());

            items.add(compra);
        }

        Integer usuarioId =
                (Integer) sesion.getAttribute("usuarioId");

        try {
            String resultado =
                    pedidoSoapClient.crearPedidoConPago(
                            usuarioId,
                            items,
                            metodoPago
                    );

            if (resultado == null) {
                return ResponseEntity.status(
                        HttpStatus.BAD_GATEWAY
                ).body(Map.of(
                        "mensaje",
                        "El servicio SOAP no respondio"
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
                    Map.of(
                            "mensaje", resultado,
                            "metodoPago", metodoPago,
                            "estadoPago", "PAGADO"
                    )
            );

        } catch (Exception e) {

            return ResponseEntity.status(
                    HttpStatus.BAD_GATEWAY
            ).body(Map.of(
                    "mensaje",
                    "No se pudo comunicar con el servicio de pedidos. "
                            + "Verifica tu historial antes de reintentar, "
                            + "para evitar compras duplicadas."
            ));
        }
    }

    // HISTORIAL DE COMPRAS
    @GetMapping("/mis-pedidos")
    public ResponseEntity<?> listarMisPedidos(
            HttpSession sesion) {

        ResponseEntity<?> error = validarSesion(sesion);
        if (error != null) return error;

        Integer usuarioId =
                (Integer) sesion.getAttribute("usuarioId");

        try {
            List<PedidoResumen> pedidos =
                    pedidoSoapClient.listarPedidosUsuario(
                            usuarioId
                    );

            return ResponseEntity.ok(pedidos);

        } catch (Exception e) {

            return ResponseEntity.status(
                    HttpStatus.BAD_GATEWAY
            ).body(Map.of(
                    "mensaje",
                    "No se pudo consultar el historial"
            ));
        }
    }

    // DETALLE DE PEDIDO DEL CLIENTE
    @GetMapping("/{pedidoId}/detalle")
    public ResponseEntity<?> obtenerDetallePedido(
            @PathVariable Integer pedidoId,
            HttpSession sesion) {

        ResponseEntity<?> error = validarSesion(sesion);
        if (error != null) return error;

        if (pedidoId == null || pedidoId <= 0) {
            return ResponseEntity.badRequest().body(
                    Map.of("mensaje", "Pedido invalido")
            );
        }

        Integer usuarioId =
                (Integer) sesion.getAttribute("usuarioId");

        try {
            PedidoDetalleResumen detalle =
                    pedidoSoapClient.obtenerDetallePedido(
                            pedidoId,
                            usuarioId
                    );

            if (detalle == null || detalle.getId() == null) {

                return ResponseEntity.status(
                        HttpStatus.NOT_FOUND
                ).body(Map.of(
                        "mensaje",
                        "Pedido no encontrado"
                ));
            }

            return ResponseEntity.ok(detalle);

        } catch (Exception e) {

            return ResponseEntity.status(
                    HttpStatus.BAD_GATEWAY
            ).body(Map.of(
                    "mensaje",
                    "No se pudo consultar el detalle del pedido"
            ));
        }
    }
}
