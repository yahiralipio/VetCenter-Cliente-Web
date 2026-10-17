
package Cibertec.pe.service;

import Cibertec.pe.soap.pedido.DetallePedidoResumen;
import Cibertec.pe.soap.pedido.PedidoDetalleResumen;

import com.lowagie.text.*;
import com.lowagie.text.pdf.*;

import org.springframework.stereotype.Service;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.Locale;

@Service
public class ComprobantePdfService {

    private static final Color VERDE = new Color(13, 125, 103);
    private static final Color GRIS = new Color(85, 100, 108);
    private static final Color CLARO = new Color(239, 247, 244);
    private static final Color BORDE = new Color(225, 232, 230);

    private final Font normal = FontFactory.getFont(
            FontFactory.HELVETICA, 9, Color.DARK_GRAY);

    private final Font negrita = FontFactory.getFont(
            FontFactory.HELVETICA_BOLD, 9, Color.BLACK);

    private final Font titulo = FontFactory.getFont(
            FontFactory.HELVETICA_BOLD, 19, VERDE);

    // Compatible con llamadas anteriores
    public byte[] generar(PedidoDetalleResumen pedido) {
        return generar(pedido, null, null, null, null);
    }


    // Generar boleta con datos reales del cliente
    public byte[] generar(
            PedidoDetalleResumen pedido,
            String nombreCliente,
            String correoCliente,
            String dniCliente,
            String telefonoCliente) {

        if (pedido == null || pedido.getId() == null) {
            throw new IllegalArgumentException(
                    "Pedido no disponible");
        }

        try (ByteArrayOutputStream salida =
                     new ByteArrayOutputStream()) {

            Document documento = new Document(
                    PageSize.A4, 42, 42, 45, 105);

            PdfWriter writer =
                    PdfWriter.getInstance(documento, salida);

            writer.setPageEvent(new PiePaginaPdf());

            documento.open();

            // CABECERA
            PdfPTable cabecera = new PdfPTable(2);
            cabecera.setWidthPercentage(100);
            cabecera.setWidths(new float[]{1.2f, 1.8f});

            PdfPCell marca = new PdfPCell();
            marca.setBorder(Rectangle.NO_BORDER);
            marca.setPaddingBottom(15);

            try (InputStream logo = getClass()
                    .getResourceAsStream(
                            "/static/images/Logo_VetCenter.png")) {

                if (logo != null) {
                    Image imagen = Image.getInstance(
                            logo.readAllBytes());

                    imagen.scaleToFit(65, 65);
                    marca.addElement(imagen);
                }
            }

            marca.addElement(
                    new Paragraph("VETCENTER", titulo));

            marca.addElement(
                    new Paragraph("Tienda veterinaria", normal));

            cabecera.addCell(marca);

            PdfPCell comprobante = new PdfPCell();
            comprobante.setBorderColor(VERDE);
            comprobante.setBorderWidth(1.2f);
            comprobante.setPadding(12);
            comprobante.setBackgroundColor(CLARO);

            Paragraph nombreBoleta = new Paragraph(
                    "BOLETA DE COMPRA",
                    FontFactory.getFont(
                            FontFactory.HELVETICA_BOLD,
                            13, VERDE));

            nombreBoleta.setAlignment(Element.ALIGN_CENTER);
            comprobante.addElement(nombreBoleta);

            Paragraph numero = new Paragraph(
                    "B001-" + String.format(
                            "%08d", pedido.getId()),
                    FontFactory.getFont(
                            FontFactory.HELVETICA_BOLD,
                            12, Color.BLACK));

            numero.setAlignment(Element.ALIGN_CENTER);
            numero.setSpacingBefore(8);
            comprobante.addElement(numero);

            cabecera.addCell(comprobante);
            documento.add(cabecera);

            Paragraph separacion = new Paragraph(" ");
            separacion.setSpacingAfter(8);
            documento.add(separacion);

            // INFORMACIÓN DEL PEDIDO
            seccion(documento, "INFORMACIÓN DEL PEDIDO");

            PdfPTable datos = new PdfPTable(2);
            datos.setWidthPercentage(100);
            datos.setWidths(new float[]{1, 1});

            dato(datos, "Código de pedido",
                    "VC-" + String.format(
                            "%06d", pedido.getId()));

            dato(datos, "Fecha de compra",
                    formatearFecha(pedido.getFecha()));

            dato(datos, "Estado del pago",
                    estadoPagoVisible(pedido.getEstadoPago()));

            dato(datos, "Método de pago",
                    formatearMetodoPago(
                            pedido.getMetodoPago()));

            documento.add(datos);


// DATOS DEL CLIENTE
            seccion(documento, "DATOS DEL CLIENTE");

            PdfPTable datosCliente = new PdfPTable(2);
            datosCliente.setWidthPercentage(100);
            datosCliente.setWidths(new float[]{1, 1});

            dato(datosCliente, "Nombre completo",
                    texto(nombreCliente));

            dato(datosCliente, "DNI",
                    texto(dniCliente));

            dato(datosCliente, "Correo electrónico",
                    texto(correoCliente));

            dato(datosCliente, "Teléfono",
                    texto(telefonoCliente));

            documento.add(datosCliente);


            // PRODUCTOS
            seccion(documento, "DETALLE DE COMPRA");

            PdfPTable tabla = new PdfPTable(4);
            tabla.setWidthPercentage(100);
            tabla.setWidths(
                    new float[]{4.4f, 0.9f, 1.8f, 1.8f});

            tabla.setHeaderRows(1);
            tabla.setSpacingAfter(12);

            encabezado(tabla, "DESCRIPCIÓN");
            encabezado(tabla, "CANT.");
            encabezado(tabla, "P. UNIT.");
            encabezado(tabla, "IMPORTE");

            if (pedido.getDetalles() != null) {

                for (DetallePedidoResumen item :
                        pedido.getDetalles()) {

                    celda(tabla,
                            texto(item.getNombreProducto()),
                            false);

                    celda(tabla,
                            String.valueOf(item.getCantidad()),
                            true);

                    celda(tabla,
                            dinero(item.getPrecioUnitario()),
                            true);

                    celda(tabla,
                            dinero(item.getSubtotal()),
                            true);
                }
            }

            documento.add(tabla);

            // TOTAL
            PdfPTable totalTabla = new PdfPTable(2);
            totalTabla.setWidthPercentage(48);
            totalTabla.setHorizontalAlignment(
                    Element.ALIGN_RIGHT);

            totalTabla.setWidths(
                    new float[]{1, 1.2f});

            PdfPCell etiquetaTotal = new PdfPCell(
                    new Phrase("TOTAL", negrita));

            etiquetaTotal.setPadding(12);
            etiquetaTotal.setBackgroundColor(CLARO);
            etiquetaTotal.setBorderColor(VERDE);

            PdfPCell importeTotal = new PdfPCell(
                    new Phrase(
                            dinero(pedido.getTotal()),
                            FontFactory.getFont(
                                    FontFactory.HELVETICA_BOLD,
                                    12, VERDE)));

            importeTotal.setPadding(12);
            importeTotal.setHorizontalAlignment(
                    Element.ALIGN_RIGHT);

            importeTotal.setBorderColor(VERDE);

            totalTabla.addCell(etiquetaTotal);
            totalTabla.addCell(importeTotal);

            documento.add(totalTabla);

            // ENTREGA
            Paragraph entrega = new Paragraph(
                    "Modalidad de entrega: Recojo en VetCenter",
                    normal);

            entrega.setSpacingBefore(22);
            documento.add(entrega);

            // AGRADECIMIENTO
            Paragraph agradecimiento = new Paragraph(
                    "¡Gracias por confiar en VetCenter!",
                    FontFactory.getFont(
                            FontFactory.HELVETICA_BOLD,
                            11, VERDE));

            agradecimiento.setAlignment(
                    Element.ALIGN_CENTER);

            agradecimiento.setSpacingBefore(25);
            documento.add(agradecimiento);

            documento.close();
            return salida.toByteArray();

        } catch (Exception e) {
            throw new IllegalStateException(
                    "No se pudo generar el comprobante PDF",
                    e);
        }
    }

    private void seccion(
            Document documento,
            String nombre) throws DocumentException {

        Paragraph tituloSeccion = new Paragraph(
                nombre,
                FontFactory.getFont(
                        FontFactory.HELVETICA_BOLD,
                        10, VERDE));

        tituloSeccion.setSpacingBefore(17);
        tituloSeccion.setSpacingAfter(10);

        documento.add(tituloSeccion);
    }

    private void dato(
            PdfPTable tabla,
            String etiqueta,
            String valor) {

        PdfPCell celda = new PdfPCell();
        celda.setBorder(Rectangle.NO_BORDER);
        celda.setPaddingBottom(10);

        celda.addElement(
                new Paragraph(etiqueta, normal));

        celda.addElement(
                new Paragraph(valor, negrita));

        tabla.addCell(celda);
    }

    private void encabezado(
            PdfPTable tabla,
            String valor) {

        PdfPCell celda = new PdfPCell(
                new Phrase(
                        valor,
                        FontFactory.getFont(
                                FontFactory.HELVETICA_BOLD,
                                8, Color.WHITE)));

        celda.setBackgroundColor(VERDE);
        celda.setPadding(10);
        celda.setBorderColor(VERDE);

        tabla.addCell(celda);
    }

    private void celda(
            PdfPTable tabla,
            String valor,
            boolean derecha) {

        PdfPCell celda = new PdfPCell(
                new Phrase(valor, normal));

        celda.setPadding(9);
        celda.setBorderColor(BORDE);

        if (derecha) {
            celda.setHorizontalAlignment(
                    Element.ALIGN_RIGHT);
        }

        tabla.addCell(celda);
    }

    private String texto(String valor) {
        return valor == null || valor.isBlank()
                ? "No disponible"
                : valor;
    }

    private String dinero(BigDecimal valor) {
        return "S/ " + String.format(
                Locale.US,
                "%,.2f",
                valor == null
                        ? BigDecimal.ZERO
                        : valor);
    }

    private String estadoPagoVisible(String estado) {

        if ("PAGADO".equalsIgnoreCase(estado)
                || "DEMO_PAGADO".equalsIgnoreCase(estado)) {
            return "PAGADO";
        }

        return texto(estado);
    }

    private String formatearMetodoPago(String metodo) {

        if (metodo == null || metodo.isBlank()) {
            return "No disponible";
        }

        return switch (
                metodo.trim().toUpperCase(Locale.ROOT)) {

            case "YAPE" -> "Yape";
            case "PLIN" -> "Plin";
            case "TARJETA" -> "Tarjeta";
            default -> metodo;
        };
    }

    private String formatearFecha(String fechaOriginal) {

        if (fechaOriginal == null
                || fechaOriginal.isBlank()) {
            return "No disponible";
        }

        try {
            LocalDateTime fecha =
                    LocalDateTime.parse(fechaOriginal);

            return fecha.format(
                    DateTimeFormatter.ofPattern(
                            "dd/MM/yyyy - HH:mm",
                            Locale.forLanguageTag("es-PE")));

        } catch (DateTimeParseException e) {
            return fechaOriginal;
        }
    }
}
