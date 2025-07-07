import {
    GoogleAuthProvider,
    signInWithPopup,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
    getFirestore,
    doc,
    setDoc,
    getDoc,
    onSnapshot,
    collection,
    addDoc,
    query,
    orderBy,
    limit,
    serverTimestamp,
    updateDoc
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const { auth, db } = window.firebaseInstances;

// --- VARIABLES GLOBALES ---
let currentUser = null;
let currentRoomId = null;
let currentRoomData = null;
let hostControlsOnly = false;
let unsubscribeRoom = null;
let unsubscribeChat = null;

// Player related
let ytPlayer;
let html5Player = document.getElementById('html5Player');
let playerReady = { youtube: false, html5: false };
let activePlayerType = null;
let isSeeking = false;
let localUpdateSource = false;
let lastSentState = null;

// UI Elements
const authModal = document.getElementById('authModal');
const authModalContent = document.getElementById('authModalContent');
const closeAuthModalBtn = document.getElementById('closeAuthModal');
const loginBtn = document.getElementById('loginBtn');
const signupBtn = document.getElementById('signupBtn');
const ctaSignupBtn = document.getElementById('ctaSignupBtn');
const authButtonsContainer = document.getElementById('authButtons');
const userInfoContainer = document.getElementById('userInfo');
const userNameDisplay = document.getElementById('userName');
const userAvatarDisplay = document.getElementById('userAvatar');
const logoutBtn = document.getElementById('logoutBtn');

const createRoomBtn = document.getElementById('createRoomBtn');
const joinRoomBtn = document.getElementById('joinRoomBtn');
const createRoomModal = document.getElementById('createRoomModal');
const closeCreateRoomModal = document.getElementById('closeCreateRoomModal');
const createRoomConfirmBtn = document.getElementById('createRoomConfirmBtn');
const createRoomErrorMsg = document.getElementById('createRoomError');

const joinRoomModal = document.getElementById('joinRoomModal');
const closeJoinRoomModal = document.getElementById('closeJoinRoomModal');
const joinRoomConfirmBtn = document.getElementById('joinRoomConfirmBtn');
const roomCodeInput = document.getElementById('roomCodeInput');
const joinRoomErrorMsg = document.getElementById('joinRoomError');

const roomContainer = document.getElementById('roomContainer');
const leaveRoomBtn = document.getElementById('leaveRoomBtn');
const currentRoomNameDisplay = document.getElementById('currentRoomName');
const roomIdDisplay = document.getElementById('roomIdDisplay');
const inviteBtn = document.getElementById('inviteBtn');

const playerWrapper = document.getElementById('playerWrapper');
const youtubePlayerContainer = document.getElementById('youtubePlayer');
const playerControls = document.getElementById('playerControls');
const playPauseBtn = document.getElementById('playPauseBtn');
const videoTimeline = document.getElementById('videoTimeline');
const timelineProgress = document.getElementById('timelineProgress');
const timelineHandle = document.getElementById('timelineHandle');
const timeDisplay = document.getElementById('timeDisplay');
const muteBtn = document.getElementById('muteBtn');
const muteIcon = document.getElementById('muteIcon');
const volumeSlider = document.getElementById('volumeSlider');
const volumeLevel = document.getElementById('volumeLevel');
const fullscreenBtn = document.getElementById('fullscreenBtn');

const micBtn = document.getElementById('micBtn');
const cameraBtn = document.getElementById('cameraBtn');

const chatMessagesContainer = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendMessageBtn = document.getElementById('sendMessageBtn');

// --- AUTENTICACIÓN ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = {
            uid: user.uid,
            displayName: user.displayName || "Usuario Anónimo",
            photoURL: user.photoURL || 'https://i.imgur.com/8Km9tLL.png'
        };
        console.log("Usuario conectado:", currentUser);
        updateUIBasedOnAuthState(true);
        sendMessageBtn.disabled = false;
        if (authModal.classList.contains('active')) {
            authModal.classList.remove('active');
        }
    } else {
        currentUser = null;
        console.log("Usuario desconectado.");
        updateUIBasedOnAuthState(false);
        sendMessageBtn.disabled = true;
        if (roomContainer.classList.contains('active')) {
            leaveRoom();
            showNotification("Debes iniciar sesión para permanecer en la sala.", "error");
        }
    }
});

function updateUIBasedOnAuthState(isLoggedIn) {
    if (isLoggedIn) {
        authButtonsContainer.style.display = 'none';
        userInfoContainer.style.display = 'flex';
        userNameDisplay.textContent = currentUser.displayName.split(' ')[0];
        userAvatarDisplay.src = currentUser.photoURL;
    } else {
        authButtonsContainer.style.display = 'flex';
        userInfoContainer.style.display = 'none';
    }
    createRoomBtn.disabled = !isLoggedIn;
    joinRoomBtn.disabled = !isLoggedIn;
    if (!isLoggedIn) {
        createRoomBtn.title = "Inicia sesión para crear una sala";
        joinRoomBtn.title = "Inicia sesión para unirte a una sala";
    } else {
        createRoomBtn.title = "";
        joinRoomBtn.title = "";
    }
}

function showAuthModal(type = 'login') {
    let htmlContent = `
        <h2 class="modal-title">${type === 'login' ? 'Iniciar Sesión' : 'Regístrate'}</h2>
        <div class="auth-options">
            <button class="btn btn-google" id="googleSignInBtn">
                <svg viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path><path fill="none" d="M0 0h48v48H0z"></path></svg>
                ${type === 'login' ? 'Iniciar con Google' : 'Registrarse con Google'}
            </button>
        </div>
        <div class="auth-divider">O</div>
        <div class="input-group">
            <label class="input-label" for="emailInput">Correo Electrónico</label>
            <input type="email" class="input-field" id="emailInput" placeholder="tu@correo.com">
        </div>
        <div class="input-group">
            <label class="input-label" for="passwordInput">Contraseña</label>
            <input type="password" class="input-field" id="passwordInput" placeholder="••••••••">
        </div>
        ${type === 'signup' ? `
        <div class="input-group">
            <label class="input-label" for="confirmPasswordInput">Confirmar Contraseña</label>
            <input type="password" class="input-field" id="confirmPasswordInput" placeholder="••••••••">
        </div>` : ''}
        <p class="error-message" id="authError"></p>
        <button class="btn btn-signup btn-modal" id="emailAuthBtn">${type === 'login' ? 'Iniciar Sesión' : 'Registrarse'}</button>
        <div class="modal-switch">
            ${type === 'login'
                ? '¿No tienes cuenta? <span class="modal-switch-link" data-switch-to="signup">Regístrate</span>'
                : '¿Ya tienes cuenta? <span class="modal-switch-link" data-switch-to="login">Inicia Sesión</span>'}
        </div>
    `;
    authModalContent.innerHTML = htmlContent;

    document.getElementById('googleSignInBtn').addEventListener('click', signInWithGoogle);
    document.getElementById('emailAuthBtn').addEventListener('click', () => {
        if (type === 'login') handleEmailLogin();
        else handleEmailSignup();
    });
    document.querySelectorAll('.modal-switch-link').forEach(link => {
        link.addEventListener('click', (e) => {
            showAuthModal(e.target.dataset.switchTo);
        });
    });

    authModal.classList.add('active');
}

const googleProvider = new GoogleAuthProvider();
async function signInWithGoogle() {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        console.log("Inicio de sesión con Google exitoso", result.user);
        showNotification(`¡Bienvenido, ${result.user.displayName.split(' ')[0]}!`);
    } catch (error) {
        console.error("Error en inicio de sesión con Google:", error);
        displayAuthError("Error al iniciar sesión con Google. Inténtalo de nuevo.");
    }
}

async function handleEmailLogin() {
    const email = document.getElementById('emailInput').value;
    const password = document.getElementById('passwordInput').value;
    const errorMsgElement = document.getElementById('authError');
    errorMsgElement.style.display = 'none';

    if (!email || !password) {
        displayAuthError("Por favor, ingresa correo y contraseña.");
        return;
    }

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log("Inicio de sesión con correo exitoso", userCredential.user);
        showNotification(`¡Bienvenido de nuevo!`);
    } catch (error) {
        console.error("Error en inicio de sesión con correo:", error);
        let friendlyMessage = "Error al iniciar sesión.";
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            friendlyMessage = "Correo o contraseña incorrectos.";
        } else if (error.code === 'auth/invalid-email') {
            friendlyMessage = "El formato del correo no es válido.";
        }
        displayAuthError(friendlyMessage);
    }
}

async function handleEmailSignup() {
    const email = document.getElementById('emailInput').value;
    const password = document.getElementById('passwordInput').value;
    const confirmPassword = document.getElementById('confirmPasswordInput').value;
    const errorMsgElement = document.getElementById('authError');
    errorMsgElement.style.display = 'none';

    if (!email || !password || !confirmPassword) {
        displayAuthError("Por favor, completa todos los campos.");
        return;
    }
    if (password !== confirmPassword) {
        displayAuthError("Las contraseñas no coinciden.");
        return;
    }
    if (password.length < 6) {
        displayAuthError("La contraseña debe tener al menos 6 caracteres.");
        return;
    }

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        console.log("Registro con correo exitoso", userCredential.user);
        showNotification("¡Registro exitoso! Bienvenido.");
    } catch (error) {
        console.error("Error en registro con correo:", error);
        let friendlyMessage = "Error al registrar la cuenta.";
        if (error.code === 'auth/email-already-in-use') {
            friendlyMessage = "Este correo electrónico ya está registrado.";
        } else if (error.code === 'auth/weak-password') {
            friendlyMessage = "La contraseña es demasiado débil.";
        } else if (error.code === 'auth/invalid-email') {
            friendlyMessage = "El formato del correo no es válido.";
        }
        displayAuthError(friendlyMessage);
    }
}

async function handleLogout() {
    try {
        await signOut(auth);
        console.log("Cierre de sesión exitoso.");
        showNotification("Has cerrado sesión.");
    } catch (error) {
        console.error("Error al cerrar sesión:", error);
        showNotification("Error al cerrar sesión.", "error");
    }
}

function displayAuthError(message) {
    const errorMsgElement = document.getElementById('authError');
    if (errorMsgElement) {
        errorMsgElement.textContent = message;
        errorMsgElement.style.display = 'block';
    }
}

// --- MANEJO DE SALAS (FIRESTORE) ---
async function createRoom() {
    if (!currentUser) {
        showNotification("Debes iniciar sesión para crear una sala.", "error");
        showAuthModal('login');
        return;
    }

    const roomName = document.getElementById('roomNameInput').value.trim() || 'Sala Cósmica';
    const isPrivate = document.getElementById('privateRoomToggle').checked;
    hostControlsOnly = document.getElementById('onlyHostControlsToggle').checked;
    const activeTab = document.querySelector('.modal-tab.active').dataset.tab;
    let videoUrl, videoId, videoType;
    createRoomErrorMsg.style.display = 'none';

    if (activeTab === 'youtube') {
        videoUrl = document.getElementById('youtubeUrlInput').value.trim();
        videoId = extractYouTubeID(videoUrl);
        videoType = 'youtube';
        if (!videoId) {
            createRoomErrorMsg.textContent = 'URL de YouTube inválida.';
            createRoomErrorMsg.style.display = 'block';
            return;
        }
    } else if (activeTab === 'drive') {
        videoUrl = document.getElementById('driveUrlInput').value.trim();
        if (!videoUrl || !videoUrl.toLowerCase().includes('drive.google.com')) {
            createRoomErrorMsg.textContent = 'URL de Google Drive inválida.';
            createRoomErrorMsg.style.display = 'block';
            return;
        }
        videoId = videoUrl;
        videoType = 'html5';
    } else {
        createRoomErrorMsg.textContent = 'Selecciona una fuente de video válida.';
        createRoomErrorMsg.style.display = 'block';
        return;
    }

    const newRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();

    const roomData = {
        roomId: newRoomId,
        name: roomName,
        creatorUid: currentUser.uid,
        creatorName: currentUser.displayName,
        videoType: videoType,
        videoId: videoId,
        isPrivate: isPrivate,
        hostControlsOnly: hostControlsOnly,
        currentState: 'paused',
        currentTime: 0,
        lastUpdateBy: currentUser.uid,
        createdAt: serverTimestamp()
    };

    try {
        const roomRef = doc(db, "rooms", newRoomId);
        await setDoc(roomRef, roomData);
        console.log("Sala creada con ID:", newRoomId);
        createRoomModal.classList.remove('active');
        document.getElementById('roomNameInput').value = '';
        document.getElementById('youtubeUrlInput').value = '';
        document.getElementById('driveUrlInput').value = '';
        document.getElementById('privateRoomToggle').checked = false;
        document.getElementById('onlyHostControlsToggle').checked = false;

        enterRoom(newRoomId);

    } catch (error) {
        console.error("Error al crear sala en Firestore:", error);
        createRoomErrorMsg.textContent = 'Error al crear la sala. Inténtalo de nuevo.';
        createRoomErrorMsg.style.display = 'block';
    }
}

async function joinRoom() {
    if (!currentUser) {
        showNotification("Debes iniciar sesión para unirte a una sala.", "error");
        showAuthModal('login');
        return;
    }
    const roomIdToJoin = roomCodeInput.value.trim().toUpperCase();
    joinRoomErrorMsg.style.display = 'none';

    if (!roomIdToJoin || roomIdToJoin.length !== 6) {
        joinRoomErrorMsg.textContent = 'Código de sala inválido (debe tener 6 caracteres).';
        joinRoomErrorMsg.style.display = 'block';
        return;
    }

    try {
        const roomRef = doc(db, "rooms", roomIdToJoin);
        const roomSnap = await getDoc(roomRef);

        if (roomSnap.exists()) {
            console.log("Sala encontrada:", roomIdToJoin);
            joinRoomModal.classList.remove('active');
            roomCodeInput.value = '';
            enterRoom(roomIdToJoin);
        } else {
            console.log("Sala no encontrada:", roomIdToJoin);
            joinRoomErrorMsg.textContent = 'Sala no encontrada. Verifica el código.';
            joinRoomErrorMsg.style.display = 'block';
        }
    } catch (error) {
        console.error("Error al buscar sala:", error);
        joinRoomErrorMsg.textContent = 'Error al buscar la sala. Inténtalo de nuevo.';
        joinRoomErrorMsg.style.display = 'block';
    }
}

function enterRoom(roomId) {
    if (!currentUser) return;
    currentRoomId = roomId;
    console.log(`Entrando a la sala: ${currentRoomId}`);

    roomContainer.classList.add('active');
    currentRoomNameDisplay.textContent = 'Cargando...';
    roomIdDisplay.textContent = `ID: ${currentRoomId}`;
    chatMessagesContainer.innerHTML = '';
    sendMessageBtn.disabled = false;
    resetPlayerState();

    const roomRef = doc(db, "rooms", currentRoomId);
    unsubscribeRoom = onSnapshot(roomRef, (docSnap) => {
        if (docSnap.exists()) {
            const previousRoomData = currentRoomData;
            currentRoomData = docSnap.data();
            console.log("Datos de la sala actualizados:", currentRoomData);
            currentRoomNameDisplay.textContent = currentRoomData.name;
            hostControlsOnly = currentRoomData.hostControlsOnly;

            if (!previousRoomData || previousRoomData.videoId !== currentRoomData.videoId || previousRoomData.videoType !== currentRoomData.videoType) {
                loadVideo(currentRoomData.videoType, currentRoomData.videoId);
            } else {
                syncPlayerState(currentRoomData);
            }

            updatePlayerControlsAccess();

        } else {
            console.warn(`La sala ${currentRoomId} ya no existe.`);
            leaveRoom();
            showNotification("La sala a la que estabas conectado ya no existe.", "error");
        }
    }, (error) => {
        console.error(`Error al escuchar cambios en la sala ${currentRoomId}:`, error);
        leaveRoom();
        showNotification("Error de conexión con la sala.", "error");
    });

    const chatRef = collection(db, "rooms", currentRoomId, "messages");
    const q = query(chatRef, orderBy("timestamp", "asc"), limit(100));
    unsubscribeChat = onSnapshot(q, (querySnapshot) => {
        querySnapshot.docChanges().forEach((change) => {
            if (change.type === "added") {
                const messageData = change.doc.data();
                displayChatMessage(messageData);
            }
        });
        scrollToBottomIfNear(chatMessagesContainer);
    }, (error) => {
        console.error(`Error al escuchar chat de la sala ${currentRoomId}:`, error);
        displaySystemMessage("Error al cargar mensajes del chat.");
    });
}

function leaveRoom() {
    console.log(`Saliendo de la sala: ${currentRoomId}`);
    roomContainer.classList.remove('active');

    if (unsubscribeRoom) {
        unsubscribeRoom();
        unsubscribeRoom = null;
    }
    if (unsubscribeChat) {
        unsubscribeChat();
        unsubscribeChat = null;
    }

    if (ytPlayer && typeof ytPlayer.destroy === 'function') {
        ytPlayer.destroy();
        ytPlayer = null;
    }
    html5Player.pause();
    html5Player.removeAttribute('src');
    html5Player.load();
    html5Player.style.display = 'none';
    youtubePlayerContainer.style.display = 'block';
    playerReady = { youtube: false, html5: false };
    activePlayerType = null;

    currentRoomId = null;
    currentRoomData = null;
    hostControlsOnly = false;
    chatMessagesContainer.innerHTML = '';
    sendMessageBtn.disabled = true;
    resetPlayerState();
}

// --- SINCRONIZACIÓN DEL REPRODUCTOR ---
function loadVideo(type, id) {
    console.log(`Cargando video: Tipo=${type}, ID=${id}`);
    activePlayerType = type;
    resetPlayerState();

    youtubePlayerContainer.style.display = 'none';
    html5Player.style.display = 'none';
    playerReady.youtube = false;
    playerReady.html5 = false;

    if (type === 'youtube') {
        youtubePlayerContainer.style.display = 'block';
        if (ytPlayer && typeof ytPlayer.loadVideoById === 'function') {
            playerReady.youtube = false;
            ytPlayer.loadVideoById(id);
        } else {
            initYouTubePlayer(id);
        }
    } else if (type === 'html5') {
        html5Player.style.display = 'block';
        html5Player.src = id;
        html5Player.load();
    }
}

function syncPlayerState(roomData) {
    if (!activePlayerType || !roomData) return;
    if (localUpdateSource && roomData.lastUpdateBy === currentUser?.uid) {
        console.log("Sincronización: Ignorando actualización local reciente.");
        return;
    }

    console.log("Sincronizando estado del player:", roomData.currentState, "@", roomData.currentTime);
    const targetTime = roomData.currentTime || 0;
    const targetState = roomData.currentState || 'paused';

    if (activePlayerType === 'youtube' && playerReady.youtube) {
        const currentTime = ytPlayer.getCurrentTime() || 0;
        if (Math.abs(currentTime - targetTime) > 2.0) {
            console.log(`YT Sync: Seeking to ${targetTime} (current: ${currentTime})`);
            ytPlayer.seekTo(targetTime, true);
        }

        const currentState = ytPlayer.getPlayerState();
        if (targetState === 'playing' && currentState !== YT.PlayerState.PLAYING) {
            console.log("YT Sync: Playing video");
            ytPlayer.playVideo();
        } else if (targetState === 'paused' && currentState !== YT.PlayerState.PAUSED) {
            console.log("YT Sync: Pausing video");
            ytPlayer.pauseVideo();
        }
        updatePlayPauseButton(targetState === 'playing');

    } else if (activePlayerType === 'html5' && playerReady.html5) {
        if (!html5Player.seeking && Math.abs(html5Player.currentTime - targetTime) > 2.0) {
            console.log(`HTML5 Sync: Seeking to ${targetTime} (current: ${html5Player.currentTime})`);
            html5Player.currentTime = targetTime;
        }

        if (targetState === 'playing' && html5Player.paused) {
            console.log("HTML5 Sync: Playing video");
            html5Player.play().catch(e => console.warn("Error al auto-play HTML5:", e));
        } else if (targetState === 'paused' && !html5Player.paused) {
            console.log("HTML5 Sync: Pausing video");
            html5Player.pause();
        }
        updatePlayPauseButton(targetState === 'playing');
    }
}

async function sendPlayerStateUpdate(newState) {
    if (!currentRoomId || !currentUser || !currentRoomData) return;

    if (hostControlsOnly && currentRoomData.creatorUid !== currentUser.uid) {
        console.log("Actualización bloqueada: Solo el host puede controlar.");
        return;
    }

    const stateKey = `${newState.currentState}-${Math.round(newState.currentTime ?? 0)}`;
    if (stateKey === lastSentState) {
        return;
    }

    const roomRef = doc(db, "rooms", currentRoomId);
    const updateData = {
        lastUpdateBy: currentUser.uid
    };

    if (newState.currentState !== undefined) {
        updateData.currentState = newState.currentState;
    }
    if (newState.currentTime !== undefined) {
        updateData.currentTime = Math.round(newState.currentTime * 100) / 100;
    }
    if (newState.currentState !== undefined || newState.currentTime !== undefined) {
        updateData.updatedAt = serverTimestamp();
    }

    console.log("Enviando actualización a Firestore:", updateData);
    localUpdateSource = true;
    lastSentState = stateKey;

    try {
        await updateDoc(roomRef, updateData);
        console.log("Estado actualizado en Firestore");
        setTimeout(() => { localUpdateSource = false; }, 500);
    } catch (error) {
        console.error("Error al actualizar estado en Firestore:", error);
        localUpdateSource = false;
        showNotification("Error al sincronizar.", "error");
    }
}

// --- YOUTUBE PLAYER API ---
window.onYouTubeIframeAPIReady = function() {
    console.log("YouTube IFrame API Ready");
}

function initYouTubePlayer(videoId) {
    if (ytPlayer && typeof ytPlayer.destroy === 'function') {
        ytPlayer.destroy();
        ytPlayer = null;
    }
    playerReady.youtube = false;

    console.log("Iniciando YT Player con video ID:", videoId);
    ytPlayer = new YT.Player('youtubePlayer', {
        videoId: videoId,
        playerVars: {
            'playsinline': 1,
            'autoplay': 0,
            'controls': 0,
            'rel': 0,
            'modestbranding': 1,
            'disablekb': 1
        },
        events: {
            'onReady': onYouTubePlayerReady,
            'onStateChange': onYouTubePlayerStateChange,
            'onError': onYouTubePlayerError
        }
    });
}

function onYouTubePlayerReady(event) {
    console.log("YT Player Listo");
    playerReady.youtube = true;
    activePlayerType = 'youtube';
    if (currentRoomData) {
        syncPlayerState(currentRoomData);
        updatePlayerControlsAccess();
        updateVolumeUI(ytPlayer.isMuted() ? 0 : ytPlayer.getVolume());
    }
    startTimelineUpdater();
}

function onYouTubePlayerStateChange(event) {
    console.log("YT Player State Change:", event.data);
    if (!playerReady.youtube || localUpdateSource) {
        return;
    }

    let newState;
    let syncTime = true;

    switch (event.data) {
        case YT.PlayerState.PLAYING:
            newState = 'playing';
            startTimelineUpdater();
            break;
        case YT.PlayerState.PAUSED:
            newState = 'paused';
            stopTimelineUpdater();
            break;
        case YT.PlayerState.ENDED:
            newState = 'paused';
            syncTime = false;
            stopTimelineUpdater();
            break;
        case YT.PlayerState.BUFFERING:
            stopTimelineUpdater();
            return;
        case YT.PlayerState.CUED:
            newState = 'paused';
            syncTime = false;
            stopTimelineUpdater();
            break;
        default:
            return;
    }

    updatePlayPauseButton(newState === 'playing');

    if (newState) {
        const updatePayload = { currentState: newState };
        if (syncTime && ytPlayer && typeof ytPlayer.getCurrentTime === 'function') {
            updatePayload.currentTime = ytPlayer.getCurrentTime();
        }
        sendPlayerStateUpdate(updatePayload);
    }
}

function onYouTubePlayerError(event) {
    console.error("Error en YT Player:", event.data);
    let errorMsg = "Error desconocido del reproductor de YouTube.";
    switch (event.data) {
        case 2: errorMsg = "Solicitud inválida (ID de video incorrecto?)."; break;
        case 5: errorMsg = "Error del reproductor HTML5."; break;
        case 100: errorMsg = "Video no encontrado o marcado como privado."; break;
        case 101: case 150: errorMsg = "El propietario no permite la reproducción embebida."; break;
    }
    showNotification(errorMsg, "error");
    displaySystemMessage(errorMsg);
}

// --- HTML5 PLAYER API ---
html5Player.addEventListener('loadedmetadata', () => {
    console.log("HTML5 Player Metadata Loaded");
    updateTimelineUI(0, html5Player.duration);
    startTimelineUpdater();
});

html5Player.addEventListener('canplay', () => {
    console.log("HTML5 Player Can Play");
    playerReady.html5 = true;
    activePlayerType = 'html5';
    if (currentRoomData) {
        syncPlayerState(currentRoomData);
        updatePlayerControlsAccess();
        updateVolumeUI(html5Player.muted ? 0 : html5Player.volume * 100);
    }
});

html5Player.addEventListener('play', () => {
    console.log("HTML5 Player Play event");
    if (!playerReady.html5 || localUpdateSource) return;
    updatePlayPauseButton(true);
    sendPlayerStateUpdate({ currentState: 'playing', currentTime: html5Player.currentTime });
    startTimelineUpdater();
});

html5Player.addEventListener('pause', () => {
    console.log("HTML5 Player Pause event");
    if (!playerReady.html5 || localUpdateSource || html5Player.ended) return;
    updatePlayPauseButton(false);
    sendPlayerStateUpdate({ currentState: 'paused', currentTime: html5Player.currentTime });
    stopTimelineUpdater();
});

html5Player.addEventListener('ended', () => {
    console.log("HTML5 Player Ended event");
    if (!playerReady.html5 || localUpdateSource) return;
    updatePlayPauseButton(false);
    sendPlayerStateUpdate({ currentState: 'paused' });
    stopTimelineUpdater();
});

html5Player.addEventListener('seeking', () => {
    console.log("HTML5 Player Seeking event");
    isSeeking = true;
    stopTimelineUpdater();
});

html5Player.addEventListener('seeked', () => {
    console.log("HTML5 Player Seeked event");
    isSeeking = false;
    if (!playerReady.html5 || !localUpdateSource) return;
    sendPlayerStateUpdate({
        currentState: html5Player.paused ? 'paused' : 'playing',
        currentTime: html5Player.currentTime
    });
    startTimelineUpdater();
});

html5Player.addEventListener('timeupdate', () => {
    if (!playerReady.html5 || isSeeking) return;
    updateTimelineUI(html5Player.currentTime, html5Player.duration);
});

html5Player.addEventListener('volumechange', () => {
    if (!playerReady.html5 || localUpdateSource) return;
    updateVolumeUI(html5Player.muted ? 0 : html5Player.volume * 100);
});

html5Player.addEventListener('error', (e) => {
    console.error("Error en HTML5 Player:", e);
    let errorMsg = "Error al cargar el video.";
    const error = html5Player.error;
    if (error) {
        switch (error.code) {
            case error.MEDIA_ERR_ABORTED: errorMsg = "Carga de video abortada."; break;
            case error.MEDIA_ERR_NETWORK: errorMsg = "Error de red al cargar video."; break;
            case error.MEDIA_ERR_DECODE: errorMsg = "Error al decodificar el video."; break;
            case error.MEDIA_ERR_SRC_NOT_SUPPORTED: errorMsg = "Formato de video no soportado o enlace inválido."; break;
        }
    }
    showNotification(errorMsg, "error");
    displaySystemMessage(errorMsg);
});

// --- CONTROLES DEL REPRODUCTOR (Comunes) ---
let timelineUpdaterInterval = null;

function startTimelineUpdater() {
    stopTimelineUpdater();
    timelineUpdaterInterval = setInterval(() => {
        if (activePlayerType === 'youtube' && playerReady.youtube && ytPlayer.getPlayerState() === YT.PlayerState.PLAYING) {
            updateTimelineUI(ytPlayer.getCurrentTime(), ytPlayer.getDuration());
        } else if (activePlayerType === 'html5' && playerReady.html5 && !html5Player.paused && !isSeeking) {
            updateTimelineUI(html5Player.currentTime, html5Player.duration);
        }
    }, 500);
}

function stopTimelineUpdater() {
    if (timelineUpdaterInterval) {
        clearInterval(timelineUpdaterInterval);
        timelineUpdaterInterval = null;
    }
}

function updateTimelineUI(current, duration) {
    if (!isNaN(current) && !isNaN(duration) && duration > 0) {
        const progress = (current / duration) * 100;
        timelineProgress.style.width = `${progress}%`;
        timelineHandle.style.left = `${progress}%`;
        timeDisplay.textContent = `${formatTime(current)} / ${formatTime(duration)}`;
    } else {
        timelineProgress.style.width = '0%';
        timelineHandle.style.left = '0%';
        timeDisplay.textContent = `0:00 / ${formatTime(duration || 0)}`;
    }
}

function resetPlayerState() {
    updateTimelineUI(0, 0);
    updatePlayPauseButton(false);
    stopTimelineUpdater();
    playerControls.querySelectorAll('button, .timeline, .volume-slider').forEach(el => el.disabled = true);
}

function updatePlayerControlsAccess() {
    const canControl = !hostControlsOnly || (currentUser && currentRoomData && currentUser.uid === currentRoomData.creatorUid);
    const playerIsReady = (activePlayerType === 'youtube' && playerReady.youtube) || (activePlayerType === 'html5' && playerReady.html5);

    console.log(`Actualizando acceso a controles: Puede controlar=${canControl}, Player Listo=${playerIsReady}`);

    const shouldEnable = playerIsReady && canControl;

    playPauseBtn.disabled = !shouldEnable;
    videoTimeline.style.pointerEvents = shouldEnable ? 'auto' : 'none';
    playPauseBtn.title = shouldEnable ? "Reproducir/Pausar" : (playerIsReady ? "Solo el host controla" : "Cargando...");
    videoTimeline.title = shouldEnable ? "Buscar en video" : (playerIsReady ? "Solo el host controla" : "Cargando...");

    const secondaryControlsEnabled = playerIsReady;
    muteBtn.disabled = !secondaryControlsEnabled;
    volumeSlider.style.pointerEvents = secondaryControlsEnabled ? 'auto' : 'none';
    fullscreenBtn.disabled = !secondaryControlsEnabled;
}

function updatePlayPauseButton(isPlaying) {
    if (isPlaying) {
        playPauseBtn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;
        playPauseBtn.title = "Pausar";
    } else {
        playPauseBtn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7L8 5z"/></svg>`;
        playPauseBtn.title = "Reproducir";
    }
}

function togglePlayPause() {
    if (!activePlayerType || !currentUser) return;

    if (hostControlsOnly && currentRoomData?.creatorUid !== currentUser.uid) {
        showNotification("Solo el host puede controlar la reproducción.", "warning");
        return;
    }

    let isPlaying = false;
    let currentTime = 0;

    if (activePlayerType === 'youtube' && playerReady.youtube) {
        const state = ytPlayer.getPlayerState();
        if (state === YT.PlayerState.PLAYING) {
            ytPlayer.pauseVideo();
            isPlaying = false;
        } else {
            ytPlayer.playVideo();
            isPlaying = true;
        }
        currentTime = ytPlayer.getCurrentTime();
    } else if (activePlayerType === 'html5' && playerReady.html5) {
        if (html5Player.paused || html5Player.ended) {
            html5Player.play().catch(e => console.warn("Error al play HTML5:", e));
            isPlaying = true;
        } else {
            html5Player.pause();
            isPlaying = false;
        }
        currentTime = html5Player.currentTime;
    }

    updatePlayPauseButton(isPlaying);
    sendPlayerStateUpdate({ currentState: isPlaying ? 'playing' : 'paused', currentTime: currentTime });
}

function handleTimelineSeek(event) {
    if (!activePlayerType || !currentUser) return;

    if (hostControlsOnly && currentRoomData?.creatorUid !== currentUser.uid) {
        showNotification("Solo el host puede controlar la reproducción.", "warning");
        return;
    }

    const timelineRect = videoTimeline.getBoundingClientRect();
    const clickPosition = event.clientX - timelineRect.left;
    const totalWidth = timelineRect.width;
    const seekRatio = Math.max(0, Math.min(1, clickPosition / totalWidth));

    let seekTime = 0;
    let duration = 0;
    let currentState = 'paused';

    if (activePlayerType === 'youtube' && playerReady.youtube) {
        duration = ytPlayer.getDuration();
        seekTime = seekRatio * duration;
        console.log(`YT Seek request: ${seekTime}`);
        ytPlayer.seekTo(seekTime, true);
        currentState = ytPlayer.getPlayerState() === YT.PlayerState.PLAYING ? 'playing' : 'paused';
    } else if (activePlayerType === 'html5' && playerReady.html5) {
        duration = html5Player.duration;
        if (isNaN(duration) || duration <= 0) return;
        seekTime = seekRatio * duration;
        console.log(`HTML5 Seek request: ${seekTime}`);
        html5Player.currentTime = seekTime;
        currentState = html5Player.paused ? 'paused' : 'playing';
    }

    updateTimelineUI(seekTime, duration);
    localUpdateSource = true;
    sendPlayerStateUpdate({ currentState: currentState, currentTime: seekTime });
}

function toggleMute() {
    if (!activePlayerType) return;
    let isMutedNow = false;
    let currentVolume = 100;

    if (activePlayerType === 'youtube' && playerReady.youtube) {
        if (ytPlayer.isMuted()) {
            ytPlayer.unMute();
            isMutedNow = false;
            currentVolume = ytPlayer.getVolume();
        } else {
            ytPlayer.mute();
            isMutedNow = true;
        }
    } else if (activePlayerType === 'html5' && playerReady.html5) {
        if (html5Player.muted) {
            html5Player.muted = false;
            isMutedNow = false;
            currentVolume = html5Player.volume * 100;
        } else {
            html5Player.muted = true;
            isMutedNow = true;
        }
    }
    updateVolumeUI(isMutedNow ? 0 : currentVolume, isMutedNow);
}

function handleVolumeChange(event) {
    if (!activePlayerType) return;

    const sliderRect = volumeSlider.getBoundingClientRect();
    const clickPosition = event.clientX - sliderRect.left;
    const totalWidth = sliderRect.width;
    const volumeRatio = Math.max(0, Math.min(1, clickPosition / totalWidth));
    const volumePercent = Math.round(volumeRatio * 100);

    if (activePlayerType === 'youtube' && playerReady.youtube) {
        ytPlayer.setVolume(volumePercent);
        if (ytPlayer.isMuted() && volumePercent > 0) {
            ytPlayer.unMute();
        } else if (!ytPlayer.isMuted() && volumePercent === 0) {
            ytPlayer.mute();
        }
    } else if (activePlayerType === 'html5' && playerReady.html5) {
        html5Player.volume = volumeRatio;
        if (html5Player.muted && volumeRatio > 0) {
            html5Player.muted = false;
        } else if (!html5Player.muted && volumeRatio === 0) {
            html5Player.muted = true;
        }
    }

    updateVolumeUI(volumePercent, volumePercent === 0);
}

function updateVolumeUI(volumePercent, isMutedOverride = undefined) {
    const isActuallyMuted = (isMutedOverride !== undefined) ? isMutedOverride : (volumePercent === 0);
    volumeLevel.style.width = `${isActuallyMuted ? 0 : volumePercent}%`;

    if (isActuallyMuted) {
        muteIcon.innerHTML = `<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>`;
        muteBtn.title = "Activar Sonido";
    } else {
        muteIcon.innerHTML = `<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>`;
        muteBtn.title = "Silenciar";
    }
}

function toggleFullScreen() {
    if (!document.fullscreenElement) {
        playerWrapper.requestFullscreen().catch(err => {
            console.error(`Error al entrar en pantalla completa: ${err.message} (${err.name})`);
        });
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
}

// --- CHAT (FIRESTORE) ---
async function sendMessage() {
    if (!currentUser || !currentRoomId) {
        showNotification("No se puede enviar mensaje. No estás conectado o en una sala.", "error");
        return;
    }
    const messageText = chatInput.value.trim();
    if (!messageText) {
        return;
    }

    chatInput.disabled = true;
    sendMessageBtn.disabled = true;

    const messageData = {
        userId: currentUser.uid,
        userName: currentUser.displayName || "Usuario Anónimo",
        text: messageText,
        timestamp: serverTimestamp()
    };

    try {
        const chatRef = collection(db, "rooms", currentRoomId, "messages");
        await addDoc(chatRef, messageData);
        console.log("Mensaje enviado:", messageText);
        chatInput.value = '';
    } catch (error) {
        console.error("Error al enviar mensaje:", error);
        showNotification("Error al enviar el mensaje.", "error");
    } finally {
        chatInput.disabled = false;
        sendMessageBtn.disabled = false;
        chatInput.focus();
    }
}

function displayChatMessage(messageData) {
    if (!messageData || !messageData.text) return;

    const messageEl = document.createElement('div');
    messageEl.classList.add('message');

    const isSent = messageData.userId === currentUser?.uid;
    messageEl.classList.add(isSent ? 'sent' : 'received');

    const displayName = messageData.userName || 'Usuario';

    messageEl.innerHTML = `
        <div class="message-user">${displayName}</div>
        <div class="message-text">${escapeHTML(messageData.text)}</div>
    `;
    chatMessagesContainer.appendChild(messageEl);
    scrollToBottomIfNear(chatMessagesContainer);
}

function displaySystemMessage(text) {
    const messageEl = document.createElement('div');
    messageEl.classList.add('message', 'received');
    messageEl.style.opacity = '0.8';
    messageEl.innerHTML = `
        <div class="message-user" style="color: #aaa;">Sistema</div>
        <div class="message-text" style="font-style: italic;">${escapeHTML(text)}</div>
    `;
    chatMessagesContainer.appendChild(messageEl);
    scrollToBottomIfNear(chatMessagesContainer);
}

function scrollToBottomIfNear(element, threshold = 50) {
    const isScrolledToBottom = element.scrollHeight - element.clientHeight <= element.scrollTop + threshold;
    if (isScrolledToBottom) {
        element.scrollTop = element.scrollHeight;
    }
}

// --- UTILIDADES ---
function formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) {
        return "0:00";
    }
    seconds = Math.floor(seconds);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
}

function extractYouTubeID(url) {
    if (!url) return false;
    const regExp = /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(regExp);
    console.log("URL:", url, "Match:", match);
    return (match && match[1]) ? match[1] : false;
}

function escapeHTML(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}

function showNotification(message, type = 'success') {
    const container = document.getElementById('notificationContainer');
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;

    if (type === 'error') {
        notification.style.background = 'linear-gradient(to right, #e53935, #c62828)';
    } else if (type === 'warning') {
        notification.style.background = 'linear-gradient(to right, #ffb300, #ffa000)';
    }

    container.appendChild(notification);
    notification.offsetHeight;
    notification.classList.add('show');

    setTimeout(() => {
        notification.classList.remove('show');
        notification.addEventListener('transitionend', () => {
            if (notification.parentNode === container) {
                container.removeChild(notification);
            }
        });
    }, 3000);
}

function copyRoomIdToClipboard() {
    if (!currentRoomId) return;
    navigator.clipboard.writeText(currentRoomId)
        .then(() => {
            showNotification(`ID de Sala ${currentRoomId} copiado!`);
        })
        .catch(err => {
            console.error('Error al copiar ID de sala: ', err);
            showNotification('No se pudo copiar el ID.', 'error');
        });
}

function createStars() {
    const starsContainer = document.getElementById('stars');
    if (!starsContainer) return;
    starsContainer.innerHTML = '';
    const starsCount = 150;
    for (let i = 0; i < starsCount; i++) {
        const star = document.createElement('div');
        star.classList.add('star');
        star.style.width = `${Math.random() * 2 + 0.5}px`;
        star.style.height = star.style.width;
        star.style.left = `${Math.random() * 100}%`;
        star.style.top = `${Math.random() * 100}%`;
        star.style.animationDuration = `${Math.random() * 4 + 3}s`;
        star.style.animationDelay = `${Math.random() * 5}s`;
        starsContainer.appendChild(star);
    }
}

// --- EVENT LISTENERS GLOBALES ---
loginBtn.addEventListener('click', () => showAuthModal('login'));
signupBtn.addEventListener('click', () => showAuthModal('signup'));
ctaSignupBtn.addEventListener('click', () => showAuthModal('signup'));
closeAuthModalBtn.addEventListener('click', () => authModal.classList.remove('active'));

createRoomBtn.addEventListener('click', () => {
    if (!currentUser) {
        showNotification("Inicia sesión para crear una sala", "warning");
        showAuthModal('login');
    } else {
        createRoomModal.classList.add('active');
    }
});
closeCreateRoomModal.addEventListener('click', () => createRoomModal.classList.remove('active'));
createRoomConfirmBtn.addEventListener('click', createRoom);

joinRoomBtn.addEventListener('click', () => {
    if (!currentUser) {
        showNotification("Inicia sesión para unirte a una sala", "warning");
        showAuthModal('login');
    } else {
        joinRoomModal.classList.add('active');
        roomCodeInput.focus();
    }
});
closeJoinRoomModal.addEventListener('click', () => joinRoomModal.classList.remove('active'));
joinRoomConfirmBtn.addEventListener('click', joinRoom);
roomCodeInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        joinRoomConfirmBtn.click();
    }
});

logoutBtn.addEventListener('click', handleLogout);
leaveRoomBtn.addEventListener('click', leaveRoom);
inviteBtn.addEventListener('click', copyRoomIdToClipboard);
roomIdDisplay.addEventListener('click', copyRoomIdToClipboard);

playPauseBtn.addEventListener('click', togglePlayPause);
videoTimeline.addEventListener('click', handleTimelineSeek);
muteBtn.addEventListener('click', toggleMute);
volumeSlider.addEventListener('click', handleVolumeChange);
fullscreenBtn.addEventListener('click', toggleFullScreen);

sendMessageBtn.addEventListener('click', sendMessage);
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessageBtn.click();
    }
});

micBtn.addEventListener('click', () => {
    micBtn.classList.toggle('active');
    showNotification(`Micrófono ${micBtn.classList.contains('active') ? 'activado' : 'desactivado'} (Funcionalidad Próximamente)`, 'warning');
});
cameraBtn.addEventListener('click', () => {
    cameraBtn.classList.toggle('active');
    showNotification(`Cámara ${cameraBtn.classList.contains('active') ? 'activada' : 'desactivada'} (Funcionalidad Próximamente)`, 'warning');
});

document.querySelectorAll('.modal-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        if (tab.hasAttribute('disabled')) return;

        const targetTabId = tab.dataset.tab;
        document.querySelectorAll('.modal-tab-content').forEach(content => content.classList.remove('active'));
        document.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));

        document.getElementById(`${targetTabId}-tab`).classList.add('active');
        tab.classList.add('active');
        createRoomErrorMsg.style.display = 'none';
    });
});

createStars();
updateUIBasedOnAuthState(auth.currentUser != null);
