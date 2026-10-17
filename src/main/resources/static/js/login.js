
"use strict";

// ==========================================
// 1. ELEMENTOS DEL FORMULARIO
// ==========================================

const loginForm =
    document.getElementById("loginForm");

const mensaje =
    document.getElementById("mensaje");

const loginButton =
    document.getElementById("loginButton");

const loginButtonText =
    document.getElementById("loginButtonText");

const loginSpinner =
    document.getElementById("loginSpinner");

const correoInput =
    document.getElementById("correo");

const passwordInput =
    document.getElementById("password");

const togglePassword =
    document.getElementById("togglePassword");

const passwordIcon =
    document.getElementById("passwordIcon");

// ==========================================
// 2. MOSTRAR MENSAJES
// ==========================================

function mostrarMensaje(texto, tipo = "danger") {

    mensaje.textContent = texto;

    mensaje.className =
        `alert alert-${tipo}`;

    mensaje.setAttribute("role", "alert");
}

function ocultarMensaje() {

    mensaje.textContent = "";
    mensaje.className = "alert d-none";
}

// ==========================================
// 3. MOSTRAR / OCULTAR CONTRASEÑA
// ==========================================

togglePassword.addEventListener("click", () => {

    const mostrar =
        passwordInput.type === "password";

    passwordInput.type =
        mostrar ? "text" : "password";

    passwordIcon.className =
        mostrar
            ? "bi bi-eye-slash"
            : "bi bi-eye";

    togglePassword.setAttribute(
        "aria-label",
        mostrar
            ? "Ocultar contraseña"
            : "Mostrar contraseña"
    );

    togglePassword.setAttribute(
        "aria-pressed",
        String(mostrar)
    );
});

// ==========================================
// 4. ESTADO DE CARGA
// ==========================================

function establecerCarga(cargando) {

    loginButton.disabled = cargando;

    loginSpinner.classList.toggle(
        "d-none",
        !cargando
    );

    loginButtonText.innerHTML = cargando
        ? "Ingresando..."
        : '<i class="bi bi-box-arrow-in-right me-2"></i>Iniciar sesión';
}

// ==========================================
// 5. INICIAR SESIÓN
// ==========================================

loginForm.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();

        if (!loginForm.checkValidity()) {
            loginForm.reportValidity();
            return;
        }

        const correo =
            correoInput.value.trim();

        const password =
            passwordInput.value;

        if (!correo || !password) {

            mostrarMensaje(
                "Ingresa tu correo y contraseña."
            );

            return;
        }

        ocultarMensaje();
        establecerCarga(true);

        let redireccionando = false;

        try {

            // AUTENTICACIÓN
            const response = await fetch(
                "/api/auth/login",
                {
                    method: "POST",
                    credentials: "same-origin",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({
                        correo,
                        password
                    })
                }
            );

            const data =
                await response.json();

            if (!response.ok) {

                mostrarMensaje(
                    data.mensaje ||
                    "Correo o contraseña incorrectos."
                );

                return;
            }

            // VERIFICAR PERFIL
            const perfilResponse = await fetch(
                "/api/auth/perfil",
                {
                    credentials: "same-origin"
                }
            );

            if (!perfilResponse.ok) {

                mostrarMensaje(
                    "No se pudo verificar la sesión."
                );

                return;
            }

            const perfil =
                await perfilResponse.json();

            // REDIRECCIÓN SEGÚN ROL
            if (perfil.rol === "ADMIN") {

                redireccionando = true;

                window.location.href =
                    "/admin.html";

            } else if (perfil.rol === "CLIENTE") {

                redireccionando = true;

                window.location.href =
                    "/dashboard.html";

            } else {

                mostrarMensaje(
                    "Tu cuenta no tiene un rol válido."
                );
            }

        } catch (error) {

            mostrarMensaje(
                "No se pudo conectar con el servidor. " +
                "Inténtalo nuevamente."
            );

            console.error(
                "Error al iniciar sesión:",
                error
            );

        } finally {

            if (!redireccionando) {
                establecerCarga(false);
            }
        }
    }
);
