
package Cibertec.pe.controller;

import Cibertec.pe.client.MascotaSoapClient;
import Cibertec.pe.soap.mascota.Mascota;

import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/mascotas")
public class MascotaController {

    private final MascotaSoapClient mascotaSoapClient;

    public MascotaController(MascotaSoapClient mascotaSoapClient) {
        this.mascotaSoapClient = mascotaSoapClient;
    }

    @GetMapping
    public List<Mascota> listarMascotas() {
        return mascotaSoapClient.listarMascotas();
    }

    @GetMapping("/{codigo}")
    public Mascota buscarMascota(@PathVariable Integer codigo) {
        return mascotaSoapClient.buscarMascota(codigo);
    }

    @PostMapping("/cliente/{clienteId}")
    public String crearMascota(
            @PathVariable Integer clienteId,
            @RequestBody Mascota mascota) {
        return mascotaSoapClient.crearMascota(mascota, clienteId);
    }

    @PutMapping("/{codigo}/cliente/{clienteId}")
    public String actualizarMascota(
            @PathVariable Integer codigo,
            @PathVariable Integer clienteId,
            @RequestBody Mascota mascota) {
        return mascotaSoapClient.actualizarMascota(
                codigo, mascota, clienteId);
    }

    @DeleteMapping("/{codigo}")
    public String eliminarMascota(@PathVariable Integer codigo) {
        return mascotaSoapClient.eliminarMascota(codigo);
    }
}
