
package Cibertec.pe.client;

import Cibertec.pe.soap.pedido.IPedidoService;
import Cibertec.pe.soap.pedido.PedidoImplementService;
import Cibertec.pe.soap.pedido.PedidoDetalleResumen;
import Cibertec.pe.soap.pedido.ItemCompra;
import Cibertec.pe.soap.pedido.PedidoResumen;

import org.springframework.stereotype.Component;
import java.util.List;

@Component
public class PedidoSoapClient {

    private final IPedidoService servicio;

    public PedidoSoapClient() {
        PedidoImplementService cliente =
                new PedidoImplementService();

        this.servicio = cliente.getPedidoImplementPort();
    }

    // COMPATIBILIDAD CON EL REGISTRO ANTERIOR
    public String crearPedido(
            Integer usuarioId,
            List<ItemCompra> items) {

        return servicio.crearPedido(usuarioId, items);
    }

    // NUEVO: REGISTRAR PEDIDO CON METODO DE PAGO
    public String crearPedidoConPago(
            Integer usuarioId,
            List<ItemCompra> items,
            String metodoPago) {

        return servicio.crearPedidoConPago(
                usuarioId,
                items,
                metodoPago
        );
    }

    // HISTORIAL DEL CLIENTE
    public List<PedidoResumen> listarPedidosUsuario(
            Integer usuarioId) {

        return servicio.listarPedidosUsuario(usuarioId);
    }

    // DETALLE DEL CLIENTE
    public PedidoDetalleResumen obtenerDetallePedido(
            Integer pedidoId,
            Integer usuarioId) {

        return servicio.obtenerDetallePedido(
                pedidoId,
                usuarioId
        );
    }

    // TODOS LOS PEDIDOS - ADMINISTRADOR
    public List<PedidoResumen> listarTodosPedidos() {
        return servicio.listarTodosPedidos();
    }

    // DETALLE - ADMINISTRADOR
    public PedidoDetalleResumen obtenerDetallePedidoAdmin(
            Integer pedidoId) {

        return servicio.obtenerDetallePedidoAdmin(pedidoId);
    }

    // ACTUALIZAR ESTADO - ADMINISTRADOR
    public String actualizarEstadoPedido(
            Integer pedidoId,
            String nuevoEstado) {

        return servicio.actualizarEstadoPedido(
                pedidoId,
                nuevoEstado
        );
    }
}
