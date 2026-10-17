
package Cibertec.pe.controller;

import Cibertec.pe.client.ProductoSoapClient;
import Cibertec.pe.soap.producto.Categoria;
import Cibertec.pe.soap.producto.Producto;

import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/productos")
public class ProductoController {

    private final ProductoSoapClient productoSoapClient;

    public ProductoController(
            ProductoSoapClient productoSoapClient) {
        this.productoSoapClient = productoSoapClient;
    }

    // ==========================================
    // OPERACIONES DE PRODUCTOS
    // ==========================================

    @GetMapping
    public List<Producto> listarProductos() {
        return productoSoapClient.listarProductosActivos();
    }

    @GetMapping("/admin/todos")
    public List<Producto> listarTodos() {
        return productoSoapClient.listarProductos();
    }

    @GetMapping("/buscar")
    public List<Producto> buscarPorNombre(
            @RequestParam String nombre) {
        return productoSoapClient.buscarProductosPorNombre(nombre);
    }

    @GetMapping("/categoria/{categoriaId}")
    public List<Producto> listarPorCategoria(
            @PathVariable Integer categoriaId) {
        return productoSoapClient
                .listarProductosPorCategoria(categoriaId);
    }

    @GetMapping("/{codigo}")
    public Producto buscarProducto(
            @PathVariable Integer codigo) {
        return productoSoapClient.buscarProducto(codigo);
    }

    @PostMapping
    public String crearProducto(
            @RequestBody Producto producto) {
        return productoSoapClient.crearProducto(producto);
    }

    @PutMapping("/{codigo}")
    public String actualizarProducto(
            @PathVariable Integer codigo,
            @RequestBody Producto producto) {
        return productoSoapClient.actualizarProducto(
                codigo, producto
        );
    }

    @DeleteMapping("/{codigo}")
    public String desactivarProducto(
            @PathVariable Integer codigo) {
        return productoSoapClient.desactivarProducto(codigo);
    }

    // ==========================================
    // OPERACIONES DE CATEGORÍAS
    // ==========================================

    // LISTAR CATEGORÍAS

    @GetMapping("/categorias")
    public List<Categoria> listarCategorias() {
        return productoSoapClient.listarCategorias();
    }

    // CREAR CATEGORÍA

    @PostMapping("/categorias")
    public String crearCategoria(
            @RequestBody Categoria categoria) {
        return productoSoapClient.crearCategoria(categoria);
    }

    // ACTUALIZAR CATEGORÍA

    @PutMapping("/categorias/{codigo}")
    public String actualizarCategoria(
            @PathVariable Integer codigo,
            @RequestBody Categoria categoria) {

        return productoSoapClient.actualizarCategoria(
                codigo, categoria
        );
    }

    // ELIMINAR CATEGORÍA

    @DeleteMapping("/categorias/{codigo}")
    public String eliminarCategoria(
            @PathVariable Integer codigo) {

        return productoSoapClient.eliminarCategoria(codigo);
    }
}
