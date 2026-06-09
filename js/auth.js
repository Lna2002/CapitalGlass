document.addEventListener('DOMContentLoaded', () => {
    // Referencias de los contenedores (Cajas de Login y Registro)
    const loginBox = document.getElementById('login-box');
    const registerBox = document.getElementById('register-box');

    // Enlaces de intercambio de pantalla
    const goToRegisterLink = document.getElementById('go-to-register');
    const goToLoginLink = document.getElementById('go-to-login');

    // Formularios activos
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');

    // --- INTERCAMBIO DE PANTALLAS CON ANIMACIÓN ---
    if (goToRegisterLink && goToLoginLink) {
        goToRegisterLink.addEventListener('click', (e) => {
            e.preventDefault();
            loginBox.classList.add('hidden');
            registerBox.classList.remove('hidden');
            registerForm.reset();
        });

        goToLoginLink.addEventListener('click', (e) => {
            e.preventDefault();
            registerBox.classList.add('hidden');
            loginBox.classList.remove('hidden');
            loginForm.reset();
        });
    }

    // --- LÓGICA DE REGISTRO DE USUARIOS ---
    if (registerForm) {
        registerForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const fullName = document.getElementById('reg-name').value.trim();
            const userEmail = document.getElementById('reg-email').value.trim().toLowerCase();
            const userPassword = document.getElementById('reg-password').value;

            if (userPassword.length < 6) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Seguridad Débil',
                    text: 'La contraseña corporativa debe contener al menos 6 caracteres.',
                    confirmButtonColor: '#6366f1'
                });
                return;
            }

            // Obtener base de datos global de usuarios de CapitalGlass
            let userBase = JSON.parse(localStorage.getItem('cg_user_base')) || [];

            // Validar que el correo no esté registrado
            const userExists = userBase.some(user => user.userEmail === userEmail);
            if (userExists) {
                Swal.fire({
                    icon: 'error',
                    title: 'Conflicto de Canal',
                    text: 'Este correo electrónico ya se encuentra asignado a un operador.',
                    confirmButtonColor: '#6366f1'
                });
                return;
            }

            // Registrar nuevo operador
            const newOperator = { fullName, userEmail, userPassword };
            userBase.push(newOperator);
            localStorage.setItem('cg_user_base', JSON.stringify(userBase));

            Swal.fire({
                icon: 'success',
                title: 'Operador Registrado',
                text: 'Las credenciales de CapitalGlass fueron añadidas con éxito.',
                timer: 2000,
                showConfirmButton: false
            }).then(() => {
                // Redirigir automáticamente a la pantalla de login
                registerBox.classList.add('hidden');
                loginBox.classList.remove('hidden');
                loginForm.reset();
            });
        });
    }

    // --- LÓGICA DE INICIO DE SESIÓN ---
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const emailInput = document.getElementById('login-email').value.trim().toLowerCase();
            const passwordInput = document.getElementById('login-password').value;

            // Obtener base de datos global
            let userBase = JSON.parse(localStorage.getItem('cg_user_base')) || [];

            // Buscar coincidencia de credenciales
            const accountFound = userBase.find(user => user.userEmail === emailInput && user.userPassword === passwordInput);

            if (!accountFound) {
                Swal.fire({
                    icon: 'error',
                    title: 'Fallo de Autenticación',
                    text: 'Las credenciales introducidas no coinciden con nuestros registros.',
                    confirmButtonColor: '#f43f5e'
                });
                return;
            }

            // Crear token de sesión asíncrona seguro en SessionStorage
            const sessionToken = {
                fullName: accountFound.fullName,
                userEmail: accountFound.userEmail,
                loginTimestamp: Date.now()
            };
            sessionStorage.setItem('cg_token_auth', JSON.stringify(sessionToken));

            Swal.fire({
                icon: 'success',
                title: 'Conexión Establecida',
                text: `Cargando entorno de ${accountFound.fullName}...`,
                timer: 1500,
                showConfirmButton: false
            }).then(() => {
                // Redirección al panel interior
                window.location.href = 'dashboard.html';
            });
        });
    }
});