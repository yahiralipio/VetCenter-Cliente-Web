
package Cibertec.pe.service;

import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.ColumnText;
import com.lowagie.text.pdf.PdfContentByte;
import com.lowagie.text.pdf.PdfPageEventHelper;
import com.lowagie.text.pdf.PdfWriter;

import java.awt.Color;

public class PiePaginaPdf extends PdfPageEventHelper {

    private static final Color VERDE = new Color(13, 125, 103);
    private static final Color GRIS = new Color(100, 110, 115);

    @Override
    public void onEndPage(PdfWriter writer, Document document) {

        PdfContentByte canvas = writer.getDirectContent();

        float izquierda = document.left();
        float derecha = document.right();
        float centro = (izquierda + derecha) / 2;

        canvas.saveState();
        canvas.setColorStroke(new Color(215, 230, 225));
        canvas.setLineWidth(0.8f);
        canvas.moveTo(izquierda, 85);
        canvas.lineTo(derecha, 85);
        canvas.stroke();
        canvas.restoreState();

        Font marca = FontFactory.getFont(
                FontFactory.HELVETICA_BOLD, 9, VERDE);

        Font texto = FontFactory.getFont(
                FontFactory.HELVETICA, 8, GRIS);

        ColumnText.showTextAligned(
                canvas, Element.ALIGN_LEFT,
                new Phrase("VETCENTER", marca),
                izquierda, 67, 0);

        ColumnText.showTextAligned(
                canvas, Element.ALIGN_RIGHT,
                new Phrase("Página " + writer.getPageNumber(), texto),
                derecha, 67, 0);

        ColumnText.showTextAligned(
                canvas, Element.ALIGN_CENTER,
                new Phrase("Cuidamos de quienes más quieres.", texto),
                centro, 49, 0);

        //ColumnText.showTextAligned(
        //        canvas, Element.ALIGN_CENTER,
        //        new Phrase("Documento sin validez tributaria.", texto),
        //        centro, 34, 0);
    }
}
