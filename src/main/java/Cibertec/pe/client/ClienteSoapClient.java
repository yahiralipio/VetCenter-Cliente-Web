
package Cibertec.pe.client;

import Cibertec.pe.soap.cliente.Cliente;
import Cibertec.pe.soap.cliente.ClienteImplementService;
import Cibertec.pe.soap.cliente.IClienteService;

import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ClienteSoapClient {

    private final IClienteService servicio;

    public ClienteSoapClient() {
        ClienteImplementService conexion =
                new ClienteImplementService();

        this.servicio = conexion.getClienteImplementPort();
    }


    public List<Cliente> listarClientes() {
        return servicio.listarClientes();
    }


    public Cliente buscarCliente(Integer codigo) {
        return servicio.buscarCliente(codigo);
    }


    public String crearCliente(Cliente cliente) {
        return servicio.crearCliente(cliente);
    }


    public Integer crearClienteConId(Cliente cliente) {
        return servicio.crearClienteConId(cliente);
    }

    public String actualizarCliente(
            Integer codigo,
            Cliente cliente) {

        return servicio.actualizarCliente(codigo, cliente);
    }

    public String eliminarCliente(Integer codigo) {
        return servicio.eliminarCliente(codigo);
    }
}
