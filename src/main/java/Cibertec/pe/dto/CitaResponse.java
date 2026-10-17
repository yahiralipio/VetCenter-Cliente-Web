package Cibertec.pe.dto;

import Cibertec.pe.soap.cita.Cita;
import Cibertec.pe.soap.cita.Mascota;

public record CitaResponse(
        Integer id,
        String fecha,
        String hora,
        String motivo,
        String estado,
        Mascota mascota
) {

    public static CitaResponse desdeSoap(Cita cita) {
        return new CitaResponse(
                cita.getId(),
                limpiarXml(cita.getFecha()),
                limpiarXml(cita.getHora()),
                cita.getMotivo(),
                cita.getEstado(),
                cita.getMascota()
        );
    }

    private static String limpiarXml(Object valor) {
        if (valor == null) {
            return null;
        }

        String texto = valor.toString().trim();

        if (texto.startsWith("<")) {
            int inicio = texto.indexOf('>');
            int fin = texto.lastIndexOf('<');

            if (inicio >= 0 && fin > inicio) {
                return texto.substring(inicio + 1, fin).trim();
            }
        }

        return texto;
    }
}
