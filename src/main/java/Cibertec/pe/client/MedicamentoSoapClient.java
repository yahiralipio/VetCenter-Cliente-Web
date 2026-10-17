
package Cibertec.pe.client;

import Cibertec.pe.soap.medicamento.Medicamento;
import Cibertec.pe.soap.medicamento.CategoriaMedicamento;
import Cibertec.pe.soap.medicamento.MedicamentoImplementService;
import Cibertec.pe.soap.medicamento.IMedicamentoService;

import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class MedicamentoSoapClient {

    private final IMedicamentoService servicio;

    public MedicamentoSoapClient() {
        MedicamentoImplementService conexion =
                new MedicamentoImplementService();

        this.servicio = conexion.getMedicamentoImplementPort();
    }

    // ==========================================
    // OPERACIONES DE MEDICAMENTOS
    // ==========================================

    @SuppressWarnings("unused")
    public List<Medicamento> listarMedicamentos() {
        return servicio.listarMedicamentos();
    }

    public Medicamento buscarMedicamento(Integer codigo) {
        return servicio.buscarMedicamento(codigo);
    }

    public String crearMedicamento(Medicamento medicamento) {
        return servicio.crearMedicamento(medicamento);
    }

    public String actualizarMedicamento(
            Integer codigo,
            Medicamento medicamento) {

        return servicio.actualizarMedicamento(
                codigo,
                medicamento
        );
    }

    public String eliminarMedicamento(Integer codigo) {
        return servicio.eliminarMedicamento(codigo);
    }

    // ==========================================
    // OPERACIONES DE CATEGORÍAS DE MEDICAMENTOS
    // ==========================================

    // LISTAR CATEGORÍAS

    public List<CategoriaMedicamento> listarCategoriasMedicamento() {
        return servicio.listarCategoriasMedicamento();
    }

    // CREAR CATEGORÍA

    public String crearCategoriaMedicamento(
            CategoriaMedicamento categoria) {

        return servicio.crearCategoriaMedicamento(categoria);
    }

    // ACTUALIZAR CATEGORÍA

    public String actualizarCategoriaMedicamento(
            Integer codigo,
            CategoriaMedicamento categoria) {

        return servicio.actualizarCategoriaMedicamento(
                codigo,
                categoria
        );
    }

    // ELIMINAR CATEGORÍA

    public String eliminarCategoriaMedicamento(Integer codigo) {

        return servicio.eliminarCategoriaMedicamento(codigo);
    }
}
