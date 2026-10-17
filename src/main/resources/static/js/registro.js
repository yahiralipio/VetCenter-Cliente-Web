
"use strict";

// ==========================================
// 1. ELEMENTOS DEL FORMULARIO
// ==========================================

const registroForm =
    document.getElementById("registroForm");

const mensaje =
    document.getElementById("mensaje");

const registroButton =
    document.getElementById("registroButton");

const registroButtonText =
    document.getElementById("registroButtonText");

const registroSpinner =
    document.getElementById("registroSpinner");

const passwordInput =
    document.getElementById("password");

const confirmPasswordInput =
    document.getElementById("confirmPassword");

const passwordMismatch =
    document.getElementById("passwordMismatch");

// ==========================================
// 2. MOSTRAR MENSAJES
// ==========================================

function mostrarMensaje(texto, tipo = "danger") {

    mensaje.textContent = texto;

    mensaje.className =
        `alert alert-${tipo}`;

    mensaje.setAttribute("role", "alert");

    mensaje.scrollIntoView({
        behavior: "smooth",
        block: "nearest"
    });
}

// ==========================================
// 3. MOSTRAR / OCULTAR CONTRASEÑAS
// ==========================================

function configurarVisibilidad(
    inputId,
    buttonId,
    iconId
) {

    const input =
        document.getElementById(inputId);

    const button =
        document.getElementById(buttonId);

    const icon =
        document.getElementById(iconId);

    button.addEventListener("click", () => {

        const mostrar =
            input.type === "password";

        input.type =
            mostrar ? "text" : "password";

        icon.className =
            mostrar
                ? "bi bi-eye-slash"
                : "bi bi-eye";

        button.setAttribute(
            "aria-label",
            mostrar
                ? "Ocultar contraseña"
                : "Mostrar contraseña"
        );

        button.setAttribute(
            "aria-pressed",
            String(mostrar)
        );
    });
}

configurarVisibilidad(
    "password",
    "togglePassword",
    "passwordIcon"
);

configurarVisibilidad(
    "confirmPassword",
    "toggleConfirmPassword",
    "confirmPasswordIcon"
);

// ==========================================
// 4. VALIDAR CONTRASEÑAS
// ==========================================

function validarContrasenas() {

    const password =
        passwordInput.value;

    const confirmPassword =
        confirmPasswordInput.value;

    if (
        confirmPassword.length > 0 &&
        password !== confirmPassword
    ) {

        confirmPasswordInput.classList.add(
            "is-invalid"
        );

        confirmPasswordInput.setCustomValidity(
            "Las contraseñas no coinciden"
        );

        return false;
    }

    confirmPasswordInput.classList.remove(
        "is-invalid"
    );

    confirmPasswordInput.setCustomValidity("");

    return true;
}

passwordInput.addEventListener(
    "input",
    validarContrasenas
);

confirmPasswordInput.addEventListener(
    "input",
    validarContrasenas
);

// ==========================================
// 5. ESTADO DE CARGA
// ==========================================

function establecerCarga(cargando) {

    registroButton.disabled = cargando;

    registroSpinner.classList.toggle(
        "d-none",
        !cargando
    );

    registroButtonText.innerHTML = cargando
        ? "Creando tu cuenta..."
        : '<i class="bi bi-person-plus me-2"></i>Crear mi cuenta';
}

// ==========================================
// 6. REGISTRAR USUARIO
// ==========================================

registroForm.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();

        // Validar campos HTML
        if (!registroForm.checkValidity()) {
            registroForm.reportValidity();
            return;
        }

        // Validar coincidencia de contraseñas
        if (!validarContrasenas()) {

            mostrarMensaje(
                "Las contraseñas no coinciden."
            );

            confirmPasswordInput.focus();

            return;
        }

        const datos = {

            nombres:
                document.getElementById("nombres")
                    .value.trim(),

            apellidos:
                document.getElementById("apellidos")
                    .value.trim(),

            dni:
                document.getElementById("dni")
                    .value.trim(),

            telefono:
                document.getElementById("telefono")
                    .value.trim(),

            correo:
                document.getElementById("correo")
                    .value.trim(),

            password:
            passwordInput.value
        };

        mensaje.className = "alert d-none";

        establecerCarga(true);

        let registroExitoso = false;

        try {

            const response = await fetch(
                "/api/auth/registro",
                {
                    method: "POST",
                    credentials: "same-origin",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify(datos)
                }
            );

            const data =
                await response.json();

            if (!response.ok) {

                mostrarMensaje(
                    data.mensaje ||
                    "No se pudo crear la cuenta."
                );

                return;
            }

            registroExitoso = true;

            mostrarMensaje(
                "¡Cuenta creada correctamente! " +
                "Serás redirigido para iniciar sesión.",
                "success"
            );

            registroForm.reset();

            // Restaurar estado de las contraseñas
            passwordInput.type = "password";
            confirmPasswordInput.type = "password";

            document.getElementById(
                "passwordIcon"
            ).className = "bi bi-eye";

            document.getElementById(
                "confirmPasswordIcon"
            ).className = "bi bi-eye";

            document.getElementById(
                "togglePassword"
            ).setAttribute("aria-pressed", "false");

            document.getElementById(
                "toggleConfirmPassword"
            ).setAttribute("aria-pressed", "false");

            document.getElementById(
                "togglePassword"
            ).setAttribute(
                "aria-label",
                "Mostrar contraseña"
            );

            document.getElementById(
                "toggleConfirmPassword"
            ).setAttribute(
                "aria-label",
                "Mostrar contraseña"
            );

            confirmPasswordInput.classList.remove(
                "is-invalid"
            );

            confirmPasswordInput.setCustomValidity("");

            window.setTimeout(() => {

                window.location.href =
                    "/login.html";

            }, 1800);

        } catch (error) {

            mostrarMensaje(
                "No se pudo conectar con el servidor. " +
                "Comprueba tu conexión e intenta nuevamente."
            );

            console.error(
                "Error al registrar usuario:",
                error
            );

        } finally {

            if (!registroExitoso) {
                establecerCarga(false);
            }
        }
    }
);
