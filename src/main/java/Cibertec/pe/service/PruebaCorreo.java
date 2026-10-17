
package Cibertec.pe.service;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Component
@Profile("prueba-correo")
public class PruebaCorreo implements CommandLineRunner {

    private final CorreoService correoService;

    public PruebaCorreo(CorreoService correoService) {
        this.correoService = correoService;
    }

    @Override
    public void run(String... args) {

        String destinatario = "piquiko0@gmail.com";

        System.out.println(
                "=========================================="
        );
        System.out.println(
                "VETCENTER - PRUEBA DE INVITACION HTML"
        );
        System.out.println(
                "=========================================="
        );

        System.out.println(
                "Destinatario: " + destinatario
        );

        try {

            correoService.enviarInvitacion(
                    destinatario,
                    "Cliente de prueba",
                    "TOKEN-SOLO-PARA-PRUEBA"
            );

            System.out.println(
                    "VetCenter: invitacion HTML enviada correctamente."
            );

            System.out.println(
                    "Revisa la bandeja de entrada o spam."
            );

        } catch (Exception e) {

            System.err.println(
                    "VetCenter: ERROR al enviar la invitacion HTML."
            );

            System.err.println(
                    "Tipo de error: " + e.getClass().getName()
            );

            System.err.println(
                    "Mensaje: " + e.getMessage()
            );

            e.printStackTrace();
        }
    }
}
