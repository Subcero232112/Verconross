// main.js - Lógica para el micrófono

console.log("main.js cargado como módulo.");

// --- Variables Globales para el Micrófono ---
let localStream = null; // Almacenará el stream de audio del micrófono
let isMicActive = false; // Estado actual del micrófono

// --- Elementos del DOM ---
// Esperamos que el DOM esté listo, aunque los módulos a menudo se difieren.
// Es más seguro buscar elementos después de que el DOM esté cargado.
let micBtn = null;

// Función para inicializar cuando el DOM esté listo
function initializeMicFeature() {
    micBtn = document.getElementById('micBtn');

    if (!micBtn) {
        console.error("Botón del micrófono (micBtn) no encontrado en el DOM.");
        return; // Salir si no encontramos el botón
    }

    // --- Event Listener para el Botón del Micrófono ---
    micBtn.addEventListener('click', toggleMicrophone);

    console.log("Funcionalidad del micrófono inicializada y listener añadido.");
}

// --- Función para Activar/Desactivar Micrófono ---
async function toggleMicrophone() {
    if (!micBtn) return; // Seguridad extra

    if (isMicActive) {
        // --- Desactivar Micrófono ---
        console.log("Intentando desactivar micrófono...");
        if (localStream) {
            localStream.getTracks().forEach(track => {
                track.stop(); // Detiene la pista de audio/video
                console.log(`Pista detenida: ${track.kind} - ${track.label}`);
            });
            localStream = null; // Limpiar la variable
        }
        isMicActive = false;
        micBtn.classList.remove('active'); // Actualizar estilo del botón
        micBtn.title = "Activar Micrófono (Próximamente)";
        console.log("Micrófono desactivado.");
        showTemporaryNotification("Micrófono desactivado"); // Feedback visual

    } else {
        // --- Activar Micrófono ---
        console.log("Intentando activar micrófono...");
        try {
            // Solicitar acceso SOLO al audio
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: false // Asegurarse de no pedir video aquí
            });

            console.log("Acceso al micrófono concedido.");
            localStream = stream; // Guardar el stream para uso futuro (ej. WebRTC)
            isMicActive = true;
            micBtn.classList.add('active'); // Actualizar estilo del botón
            micBtn.title = "Desactivar Micrófono";
            console.log("Micrófono activado. Stream listo para usar:", localStream);
            showTemporaryNotification("Micrófono activado (listo para WebRTC)"); // Feedback

            // Aquí es donde usarías localStream para añadir la pista a una conexión WebRTC:
            // Ejemplo: peerConnection.addTrack(localStream.getAudioTracks()[0], localStream);
            // Por ahora, solo lo activamos y lo tenemos listo.

            // Opcional: Escuchar si el usuario detiene el permiso desde el navegador
            localStream.getTracks().forEach(track => {
                track.onended = () => {
                    console.log("El usuario detuvo el permiso del micrófono desde el navegador.");
                    // Asegurarse de que el estado de la UI refleje esto
                    if (isMicActive) { // Solo si nosotros pensábamos que estaba activo
                        isMicActive = false;
                        micBtn.classList.remove('active');
                        micBtn.title = "Activar Micrófono (Próximamente)";
                        localStream = null;
                    }
                };
            });


        } catch (error) {
            console.error("Error al obtener acceso al micrófono:", error.name, error.message);
            isMicActive = false;
            micBtn.classList.remove('active'); // Asegurarse que no quede activo visualmente
            micBtn.title = "Activar Micrófono (Error)";

            // Mostrar mensajes de error más específicos al usuario
            if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
                showTemporaryNotification("Permiso de micrófono denegado.", "error");
                alert("Necesitamos permiso para acceder a tu micrófono para el chat de voz. Revisa los permisos del sitio en tu navegador.");
            } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
                 showTemporaryNotification("No se encontró micrófono.", "error");
                 alert("No parece haber un micrófono conectado o disponible en tu dispositivo.");
            } else {
                 showTemporaryNotification("Error al acceder al micrófono.", "error");
                 alert(`Error al acceder al micrófono: ${error.message}`);
            }
        }
    }
}

// --- Función de Utilidad para Notificaciones (Ejemplo) ---
// Puedes usar tu función showNotification existente si main.js puede acceder a ella,
// o definir una simple aquí. Idealmente, importarías la función.
function showTemporaryNotification(message, type = 'info') {
    // Intenta usar la función global si existe (definida en el script inline)
    if (typeof window.showNotification === 'function') {
        window.showNotification(message, type);
    } else {
        // Fallback muy simple si no existe la función global
        console.log(`[${type.toUpperCase()}] Notificación: ${message}`);
        // Podrías añadir un div temporal al DOM aquí si quieres algo visual básico
    }
}


// --- Inicialización ---
// Asegurarse de que el DOM esté completamente cargado antes de buscar elementos
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeMicFeature);
} else {
    // El DOM ya está listo
    initializeMicFeature();
}
