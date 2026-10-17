package Cibertec.pe.client;

import Cibertec.pe.soap.mascota.Mascota;
import Cibertec.pe.soap.mascota.MascotaImplementService;
import Cibertec.pe.soap.mascota.IMascotaService;

import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class MascotaSoapClient {

    private final IMascotaService servicio;

    public MascotaSoapClient() {
        MascotaImplementService conexion =
                new MascotaImplementService();

        this.servicio = conexion.getMascotaImplementPort();
    }

    public List<Mascota> listarMascotas() {
        return servicio.listarMascotas();
    }

    public Mascota buscarMascota(Integer codigo) {
        return servicio.buscarMascota(codigo);
    }

    public String crearMascota(Mascota mascota, Integer clienteId) {
        return servicio.crearMascota(mascota, clienteId);
    }

    public String actualizarMascota(
            Integer codigo, Mascota mascota, Integer clienteId) {
        return servicio.actualizarMascota(codigo, mascota, clienteId);
    }

    public String eliminarMascota(Integer codigo) {
        return servicio.eliminarMascota(codigo);
    }
}
