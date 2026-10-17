
package Cibertec.pe.client;

import Cibertec.pe.soap.cita.Cita;
import Cibertec.pe.soap.cita.CitaImplementService;
import Cibertec.pe.soap.cita.ICitaService;

import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class CitaSoapClient {

    private final ICitaService servicio;

    public CitaSoapClient() {
        CitaImplementService conexion =
                new CitaImplementService();

        this.servicio = conexion.getCitaImplementPort();
    }

    public List<Cita> listarCitas() {
        return servicio.listarCitas();
    }

    public List<String> obtenerHorariosOcupados(String fecha) {
        return servicio.obtenerHorariosOcupados(fecha);
    }

    public Cita buscarCita(Integer codigo) {
        return servicio.buscarCita(codigo);
    }

    public String crearCita(
            Integer mascotaId,
            String fecha,
            String hora,
            String motivo) {

        return servicio.crearCita(
                mascotaId, fecha, hora, motivo);
    }

    public String actualizarCita(
            Integer codigo,
            Integer mascotaId,
            String fecha,
            String hora,
            String motivo) {

        return servicio.actualizarCita(
                codigo, mascotaId, fecha, hora, motivo);
    }

    public String confirmarCita(Integer codigo) {
        return servicio.confirmarCita(codigo);
    }

    public String marcarCitaAtendida(Integer codigo) {
        return servicio.marcarCitaAtendida(codigo);
    }

    public String cancelarCita(Integer codigo) {
        return servicio.cancelarCita(codigo);
    }

    public String eliminarCita(Integer codigo) {
        return servicio.eliminarCita(codigo);
    }
}
