
package Cibertec.pe.client;

import Cibertec.pe.soap.producto.Categoria;
import Cibertec.pe.soap.producto.IProductoService;
import Cibertec.pe.soap.producto.Producto;
import Cibertec.pe.soap.producto.ProductoImplementService;

import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class ProductoSoapClient {

    private final IProductoService servicio;

    public ProductoSoapClient() {
        ProductoImplementService cliente =
                new ProductoImplementService();

        this.servicio = cliente.getProductoImplementPort();
    }

    // ==========================================
    // OPERACIONES DE PRODUCTOS
    // ==========================================

    public List<Producto> listarProductos() {
        return servicio.listarProductos();
    }

    public List<Producto> listarProductosActivos() {
        return servicio.listarProductosActivos();
    }

    public Producto buscarProducto(Integer codigo) {
        return servicio.buscarProducto(codigo);
    }

    public List<Producto> buscarProductosPorNombre(
            String nombre) {
        return servicio.buscarProductosPorNombre(nombre);
    }

    public List<Producto> listarProductosPorCategoria(
            Integer categoriaId) {
        return servicio.listarProductosPorCategoria(categoriaId);
    }

    public String crearProducto(Producto producto) {
        return servicio.crearProducto(producto);
    }

    public String actualizarProducto(
            Integer codigo,
            Producto producto) {
        return servicio.actualizarProducto(codigo, producto);
    }

    public String desactivarProducto(Integer codigo) {
        return servicio.desactivarProducto(codigo);
    }

    // ==========================================
    // OPERACIONES DE CATEGORÍAS
    // ==========================================

    // LISTAR CATEGORÍAS

    public List<Categoria> listarCategorias() {
        return servicio.listarCategorias();
    }

    // CREAR CATEGORÍA

    public String crearCategoria(Categoria categoria) {
        return servicio.crearCategoria(categoria);
    }

    // ACTUALIZAR CATEGORÍA

    public String actualizarCategoria(
            Integer codigo,
            Categoria categoria) {

        return servicio.actualizarCategoria(
                codigo,
                categoria
        );
    }

    // ELIMINAR CATEGORÍA

    public String eliminarCategoria(Integer codigo) {
        return servicio.eliminarCategoria(codigo);
    }
}
