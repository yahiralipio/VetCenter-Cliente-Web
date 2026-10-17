
package Cibertec.pe.dto;

public record RegistrarCitaRequest(
        Integer mascotaId,
        String fecha,
        String hora,
        String motivo
) {
}
