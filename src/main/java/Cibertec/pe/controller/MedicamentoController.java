
package Cibertec.pe.controller;

import Cibertec.pe.client.MedicamentoSoapClient;
import Cibertec.pe.soap.medicamento.Medicamento;
import Cibertec.pe.soap.medicamento.CategoriaMedicamento;

import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/medicamentos")
public class MedicamentoController {

    private final MedicamentoSoapClient medicamentoSoapClient;

    public MedicamentoController(
            MedicamentoSoapClient medicamentoSoapClient) {
        this.medicamentoSoapClient = medicamentoSoapClient;
    }

    // ==========================================
    // LISTAR MEDICAMENTOS
    // ==========================================

    @GetMapping
    public List<Medicamento> listarMedicamentos() {
        return medicamentoSoapClient.listarMedicamentos();
    }

    // ==========================================
    // LISTAR CATEGORÍAS DE MEDICAMENTOS
    // ==========================================

    @GetMapping("/categorias")
    public List<CategoriaMedicamento> listarCategoriasMedicamento() {
        return medicamentoSoapClient.listarCategoriasMedicamento();
    }

    // ==========================================
    // CREAR CATEGORÍA DE MEDICAMENTOS
    // ==========================================

    @PostMapping("/categorias")
    public String crearCategoriaMedicamento(
            @RequestBody CategoriaMedicamento categoria) {

        return medicamentoSoapClient.crearCategoriaMedicamento(
                categoria
        );
    }

    // ==========================================
    // ACTUALIZAR CATEGORÍA DE MEDICAMENTOS
    // ==========================================

    @PutMapping("/categorias/{codigo}")
    public String actualizarCategoriaMedicamento(
            @PathVariable Integer codigo,
            @RequestBody CategoriaMedicamento categoria) {

        return medicamentoSoapClient.actualizarCategoriaMedicamento(
                codigo,
                categoria
        );
    }

    // ==========================================
    // ELIMINAR CATEGORÍA DE MEDICAMENTOS
    // ==========================================

    @DeleteMapping("/categorias/{codigo}")
    public String eliminarCategoriaMedicamento(
            @PathVariable Integer codigo) {

        return medicamentoSoapClient.eliminarCategoriaMedicamento(
                codigo
        );
    }

    // ==========================================
    // BUSCAR MEDICAMENTO
    // ==========================================

    @GetMapping("/{codigo}")
    public Medicamento buscarMedicamento(
            @PathVariable Integer codigo) {

        return medicamentoSoapClient.buscarMedicamento(codigo);
    }

    // ==========================================
    // CREAR MEDICAMENTO
    // ==========================================

    @PostMapping
    public String crearMedicamento(
            @RequestBody Medicamento medicamento) {

        return medicamentoSoapClient.crearMedicamento(
                medicamento
        );
    }

    // ==========================================
    // ACTUALIZAR MEDICAMENTO
    // ==========================================

    @PutMapping("/{codigo}")
    public String actualizarMedicamento(
            @PathVariable Integer codigo,
            @RequestBody Medicamento medicamento) {

        return medicamentoSoapClient.actualizarMedicamento(
                codigo,
                medicamento
        );
    }

    // ==========================================
    // ELIMINAR MEDICAMENTO
    // ==========================================

    @DeleteMapping("/{codigo}")
    public String eliminarMedicamento(
            @PathVariable Integer codigo) {

        return medicamentoSoapClient.eliminarMedicamento(
                codigo
        );
    }
}
