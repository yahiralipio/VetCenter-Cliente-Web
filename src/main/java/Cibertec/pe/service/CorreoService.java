
package Cibertec.pe.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.web.util.HtmlUtils;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

@Service
public class CorreoService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String remitente;

    @Value("${vetcenter.app.base-url:http://localhost:8091}")
    private String baseUrl;

    public CorreoService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    // ==========================================
    // 1. CORREO DE TEXTO NORMAL
    // ==========================================

    public void enviarCorreo(
            String destinatario,
            String asunto,
            String contenido) {

        SimpleMailMessage mensaje = new SimpleMailMessage();

        mensaje.setFrom(remitente);
        mensaje.setTo(destinatario);
        mensaje.setSubject(asunto);
        mensaje.setText(contenido);

        mailSender.send(mensaje);
    }

    // ==========================================
    // 2. INVITACION HTML DE VETCENTER
    // ==========================================

    public void enviarInvitacion(
            String correo,
            String nombres,
            String token) {

        String enlace = baseUrl.replaceAll("/+$", "")
                + "/activar-cuenta.html?token="
                + URLEncoder.encode(
                token,
                StandardCharsets.UTF_8
        );

        String nombreSeguro = HtmlUtils.htmlEscape(nombres);
        String enlaceSeguro = HtmlUtils.htmlEscape(enlace);

        String html = """
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport"
                      content="width=device-width, initial-scale=1">
                <title>Bienvenido a VetCenter</title>
            </head>

            <body style="
                margin:0;
                padding:0;
                background-color:#edf7f4;
                font-family:Arial,Helvetica,sans-serif;
                color:#173d39;">

                <table role="presentation"
                       width="100%%"
                       cellpadding="0"
                       cellspacing="0"
                       style="
                           background-color:#edf7f4;
                           padding:35px 12px;">

                    <tr>
                        <td align="center">

                            <table role="presentation"
                                   width="100%"
                                   cellpadding="0"
                                   cellspacing="0"
                                   style="
                                       max-width:560px;
                                       background-color:#ffffff;
                                       border-radius:16px;
                                       overflow:hidden;">

                                <!-- ENCABEZADO -->

                                <tr>
                                    <td align="center"
                                        style="
                                            background-color:#087f72;
                                            padding:35px 20px;">

                                        <div style="
                                            font-size:30px;
                                            font-weight:bold;
                                            color:#ffffff;">
                                            🐾 VetCenter
                                        </div>

                                        <p style="
                                            margin:12px 0 0;
                                            font-size:13px;
                                            color:#d7f7ee;">
                                            Cuidamos lo que más quieres.
                                        </p>

                                    </td>
                                </tr>

                                <!-- CONTENIDO -->

                                <tr>
                                    <td style="padding:35px 30px;">

                                        <p style="
                                            margin:0 0 14px;
                                            font-size:12px;
                                            font-weight:bold;
                                            letter-spacing:1.5px;
                                            color:#087f72;">
                                            BIENVENIDO A VETCENTER
                                        </p>

                                        <h1 style="
                                            margin:0 0 24px;
                                            font-size:26px;
                                            line-height:1.3;
                                            color:#173d39;">
                                            ¡Tu nueva experiencia
                                            comienza aquí!
                                        </h1>

                                        <p style="
                                            font-size:15px;
                                            line-height:1.8;">
                                            Hola, <strong>%s</strong>:
                                        </p>

                                        <p style="
                                            font-size:15px;
                                            line-height:1.8;">
                                            Nos alegra darte la bienvenida
                                            a <strong>VetCenter</strong>.
                                            Hemos preparado tu cuenta
                                            para que puedas gestionar
                                            el cuidado de tus mascotas
                                            de manera sencilla y segura.
                                        </p>

                                        <p style="
                                            font-size:15px;
                                            line-height:1.8;">
                                            Solo falta un paso:
                                            <strong>
                                                crea tu contraseña personal
                                                y activa tu cuenta.
                                            </strong>
                                        </p>

                                        <!-- BOTON -->

                                        <table role="presentation"
                                               width="100%"
                                               cellpadding="0"
                                               cellspacing="0">

                                            <tr>
                                                <td align="center"
                                                    style="
                                                        padding:25px 0;">

                                                    <a href="%s"
                                                       style="
                                                           display:inline-block;
                                                           background-color:#087f72;
                                                           color:#ffffff;
                                                           text-decoration:none;
                                                           padding:16px 30px;
                                                           border-radius:9px;
                                                           font-size:15px;
                                                           font-weight:bold;">
                                                        Activar mi cuenta
                                                    </a>

                                                </td>
                                            </tr>

                                        </table>

                                        <!-- SEGURIDAD -->

                                        <table role="presentation"
                                               width="100%"
                                               cellpadding="0"
                                               cellspacing="0"
                                               style="
                                                   background-color:#f0f8f5;
                                                   border-radius:10px;">

                                            <tr>
                                                <td style="padding:20px;">

                                                    <p style="
                                                        margin:0 0 8px;
                                                        font-size:14px;
                                                        font-weight:bold;
                                                        color:#087f72;">
                                                        🔒 Tu seguridad
                                                        es importante
                                                    </p>

                                                    <p style="
                                                        margin:0;
                                                        font-size:13px;
                                                        line-height:1.7;
                                                        color:#45645e;">
                                                        Este enlace es personal,
                                                        válido durante 24 horas
                                                        y solo puede utilizarse
                                                        una vez.
                                                        Nunca compartas
                                                        tu contraseña.
                                                    </p>

                                                </td>
                                            </tr>

                                        </table>

                                        <p style="
                                            margin-top:25px;
                                            font-size:13px;
                                            line-height:1.7;
                                            color:#69817b;">
                                            Si no esperabas esta invitación,
                                            puedes ignorar este mensaje.
                                        </p>

                                        <!-- ENLACE ALTERNATIVO -->

                                        <p style="
                                            margin-top:22px;
                                            font-size:12px;
                                            line-height:1.7;
                                            color:#69817b;">
                                            ¿El botón no funciona?
                                            Copia este enlace en tu navegador:
                                        </p>

                                        <p style="
                                            font-size:12px;
                                            line-height:1.7;
                                            overflow-wrap:anywhere;
                                            word-break:break-all;">

                                            <a href="%s"
                                               style="color:#087f72;">
                                                %s
                                            </a>

                                        </p>

                                    </td>
                                </tr>

                                <!-- PIE DE PAGINA -->

                                <tr>
                                    <td align="center"
                                        style="
                                            background-color:#f7faf9;
                                            border-top:1px solid #e5efea;
                                            padding:25px;">

                                        <p style="
                                            margin:0;
                                            color:#087f72;
                                            font-size:16px;
                                            font-weight:bold;">
                                            VetCenter 🐾
                                        </p>

                                        <p style="
                                            margin:10px 0;
                                            font-size:12px;
                                            color:#81928c;">
                                            El bienestar de tu mascota
                                            comienza aquí.
                                        </p>

                                        <p style="
                                            margin:0;
                                            font-size:11px;
                                            color:#81928c;">
                                            © 2026 VetCenter
                                        </p>

                                    </td>
                                </tr>

                            </table>

                        </td>
                    </tr>
                </table>

            </body>
            </html>
"""
                .replace("Hola, <strong>%s</strong>", "Hola, <strong>" + nombreSeguro + "</strong>")
                .replace("href=\"%s\"", "href=\"" + enlaceSeguro + "\"")
                .replace(">%s\n", ">" + enlaceSeguro + "\n");

        try {

            MimeMessage mensaje =
                    mailSender.createMimeMessage();

            MimeMessageHelper helper =
                    new MimeMessageHelper(
                            mensaje,
                            false,
                            StandardCharsets.UTF_8.name()
                    );

            helper.setFrom(remitente);
            helper.setTo(correo);

            helper.setSubject(
                    "Bienvenido a VetCenter | Activa tu cuenta"
            );

            helper.setText(html, true);

            mailSender.send(mensaje);

        } catch (MessagingException e) {

            throw new IllegalStateException(
                    "No se pudo preparar el correo de invitacion",
                    e
            );
        }
    }
}
