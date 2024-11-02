// Constantes de configuration
const VIDEO_WIDTH = 640;
const VIDEO_HEIGHT = 480;
let PORTRAIT, FIX = 2;
const FAST_COLOR = new FastAverageColor();
const is_mobile = mobile_check();

const TV_COLOR_LED = document.querySelector('#tv_color_led');
const WALL_COLOR_LED = document.querySelector('#wall_color_led');
const COLOR_TEXT = document.querySelector('#color_text');
const APPLY_BUTTON = document.querySelector('#calibrate_apply');
const video = document.querySelector('#source');
const CANVAS = document.querySelector('#canvas');
const ctx = CANVAS.getContext('2d');

let TV_COLOR, WALL_COLOR, CURRENT_RGB = [255, 255, 255], NEW_RGB = [255, 255, 255];
let CALIBRATION_MODE, CALIBRATION_MODE_AUTO = 'white';
const TV_COLORS = {};

// Définition de l’API Hyperion
async function hyperion_api(data = { command: 'serverinfo' }) {
    try {
        const response = await fetch('/json-rpc', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return await response.json();
    } catch (error) {
        console.error("Erreur dans l'appel API Hyperion:", error);
    }
}

// Fonction pour mettre à jour les ajustements Hyperion
async function update_hyperion_adjustments() {
    const json = await hyperion_api();
    if (json) {
        CURRENT_RGB = json.info.adjustment[0][CALIBRATION_MODE_AUTO];
    }
}

// Initialisation et gestion de la calibration
function setupCalibrationControls() {
    const controls = [
        { id: 'calibrate_init', mode: null },
        { id: 'calibrate_white', mode: 'white' },
        { id: 'calibrate_red', mode: 'red' },
        { id: 'calibrate_green', mode: 'green' },
        { id: 'calibrate_blue', mode: 'blue' },
        { id: 'calibrate_cyan', mode: 'cyan' },
        { id: 'calibrate_magenta', mode: 'magenta' },
        { id: 'calibrate_yellow', mode: 'yellow' },
        { id: 'calibrate_off', mode: null }
    ];

    controls.forEach(control => {
        document.getElementById(control.id).addEventListener('click', async (event) => {
            CALIBRATION_MODE = control.mode;
            if (control.mode) {
                await hyperion_api({
                    command: 'color',
                    color: CURRENT_RGB,
                    priority: 50,
                    origin: 'Calibrator'
                });
            } else {
                await hyperion_api({ command: 'clear', priority: 50 });
            }
            event.preventDefault();
        });
    });

    APPLY_BUTTON.addEventListener('click', async (event) => {
        await hyperion_api({
            command: "adjustment",
            adjustment: { [CALIBRATION_MODE_AUTO]: NEW_RGB }
        });
        update_hyperion_adjustments();
        event.preventDefault();
    });
}

// Initialisation de la vidéo
async function get_video() {
    const constraints = {
        audio: false,
        video: {
            facingMode: 'environment',
            frameRate: 30,
            aspectRatio: is_mobile ? (PORTRAIT ? 3 / 4 : 4 / 3) : 4 / 3
        }
    };

    try {
        const localMediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = localMediaStream;
        video.play();
    } catch (err) {
        console.error("Erreur d'accès à la caméra :", err);
    }
}

// Mise à jour du canvas pour afficher le flux vidéo
function refresh_canvas() {
    CANVAS.width = VIDEO_WIDTH;
    CANVAS.height = VIDEO_HEIGHT;
    ctx.drawImage(video, 0, 0, VIDEO_WIDTH, VIDEO_HEIGHT);

    // Analyse de la couleur de l'image capturée
    analyze_colors();

    requestAnimationFrame(refresh_canvas);
}

// Fonction pour détecter les appareils mobiles
function mobile_check() {
    const regex = /(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i;
    return regex.test(navigator.userAgent || navigator.vendor || window.opera);
}

// Fonction pour analyser les couleurs de l'image capturée
function analyze_colors() {
    // Récupérer les pixels de l'image
    const imageData = ctx.getImageData(0, 0, CANVAS.width, CANVAS.height);
    const data = imageData.data;

    // Variables pour stocker la somme des couleurs
    let r = 0, g = 0, b = 0, count = 0;

    // Itérer sur chaque pixel pour calculer la couleur moyenne
    for (let i = 0; i < data.length; i += 4) {
        r += data[i];     // Rouge
        g += data[i + 1]; // Vert
        b += data[i + 2]; // Bleu
        count++;
    }

    // Calculer les valeurs moyennes
    if (count > 0) {
        CURRENT_RGB = [
            Math.floor(r / count),
            Math.floor(g / count),
            Math.floor(b / count)
        ];

        COLOR_TEXT.innerText = `Couleur actuelle: ${CURRENT_RGB.join(':')}`;
    }
}

// Écouteur pour ajuster le mode portrait/paysage
window.addEventListener('resize', () => {
    PORTRAIT = window.matchMedia("(orientation: portrait)").matches;
});

// Initialisation de la vidéo, du canvas, et des contrôles de calibration
get_video();
refresh_canvas();
setupCalibrationControls();
