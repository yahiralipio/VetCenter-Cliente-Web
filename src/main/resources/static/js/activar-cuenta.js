document.addEventListener("DOMContentLoaded", () => {

    const formulario = document.getElementById("activacionForm");
    const password = document.getElementById("password");
    const confirmar = document.getElementById("confirmarPassword");
    const boton = document.getElementById("activarButton");
    const mensaje = document.getElementById("mensaje");

    const parametros = new URLSearchParams(window.location.search);
    const token = parametros.get("token");

    // Retirar el token de la barra de direcciones.
    window.history.replaceState(
        {},
        document.title,
        window.location.pathname
    );

    function mostrarMensaje(texto, tipo) {
        mensaje.textContent = texto;
        mensaje.className = "alert alert-" + tipo;
    }

    if (!token) {
        mostrarMensaje(
            "El enlace de activación no es válido. Revisa el correo recibido.",
            "danger"
        );

        formulario.classList.add("d-none");
        return;
    }

    formulario.addEventListener("submit", async (event) => {
        event.preventDefault();

        const nuevaPassword = password.value;
        const confirmacion = confirmar.value;

        if (nuevaPassword.length < 8) {
            mostrarMensaje(
                "La contraseña debe tener al menos 8 caracteres.",
                "danger"
            );
            return;
        }

        if (nuevaPassword !== confirmacion) {
            mostrarMensaje(
                "Las contraseñas no coinciden.",
                "danger"
            );
            return;
        }

        boton.disabled = true;
        boton.textContent = "Activando cuenta...";

        try {
            const respuesta = await fetch(
                "/api/activacion/activar",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        token: token,
                        password: nuevaPassword
                    })
                }
            );

            const datos = await respuesta.json();

            if (!respuesta.ok) {
                throw new Error(
                    datos.mensaje || "No se pudo activar la cuenta."
                );
            }

            mostrarMensaje(
                "¡Tu cuenta fue activada correctamente! Ya puedes iniciar sesión.",
                "success"
            );

            formulario.classList.add("d-none");

            // No redirigir automáticamente:
            // permitir que el usuario lea la confirmación.
            const enlace = document.createElement("a");
            enlace.href = "/login.html";
            enlace.className = "btn btn-primary w-100 mt-3";
            enlace.textContent = "Ir a iniciar sesión";

            mensaje.insertAdjacentElement("afterend", enlace);

        } catch (error) {
            mostrarMensaje(error.message, "danger");

            boton.disabled = false;
            boton.textContent = "Activar mi cuenta";
        }
    });
});
