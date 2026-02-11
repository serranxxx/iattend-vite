
import dayjs from 'dayjs';

export function tokenExpires() {
    // Clonar la fecha original para evitar modificaciones no deseadas
    const newDate = new Date();
    // Sumar 7 horas y 30 minutos a la nueva fecha
    newDate.setHours(newDate.getHours() + 7);
    newDate.setMinutes(newDate.getMinutes() + 30);

    // const formatDate = newDate.toISOString();

    return newDate;
}


export function formatDate(dateString) {
    // Crear una fecha desde el string sin aplicar desfase horario
    const date = new Date(dateString);

    // Ajustar la fecha sumando las horas para evitar desfase
    const adjustedDate = new Date(date.getTime() + date.getTimezoneOffset() * 60000);

    // Opciones de formateo
    const options = { year: 'numeric', month: 'long', day: 'numeric' };

    return adjustedDate.toLocaleDateString('es-ES', options);
}

export function formatDateShorter(dateString) {
    // Crear un objeto Date a partir de la cadena de fecha
    const date = new Date(dateString);

    // Obtener el día, el mes y el año
    const day = String(date.getDate()).padStart(2, '0'); // Añadir cero inicial si es necesario
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Los meses comienzan desde 0, por eso sumamos 1
    const year = date.getFullYear();

    // Formatear la fecha en el formato DD/MM/YYYY
    return `${day}/${month}/${year}`;
}

export function darker(hex, factor) {
    // Validar el formato del código hexadecimal
    if (!/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex)) {
        console.error("Formato hexadecimal no válido");
        return null;
    }

    // Extraer los componentes de color
    let r = parseInt(hex.slice(1, 3), 16);
    let g = parseInt(hex.slice(3, 5), 16);
    let b = parseInt(hex.slice(5, 7), 16);

    // Aplicar el factor para oscurecer el color
    r = Math.max(0, Math.floor(r * factor));
    g = Math.max(0, Math.floor(g * factor));
    b = Math.max(0, Math.floor(b * factor));

    // Convertir los componentes de nuevo a hexadecimal y devolver el nuevo código
    return `#${(r < 16 ? '0' : '') + r.toString(16)}${(g < 16 ? '0' : '') + g.toString(16)}${(b < 16 ? '0' : '') + b.toString(16)}`;
}

export function lighter(hex, factor) {
    // Validar el formato del código hexadecimal
    if (!/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex)) {
        console.error("Formato hexadecimal no válido");
        return null;
    }

    // Extraer los componentes de color
    let r = parseInt(hex.slice(1, 3), 16);
    let g = parseInt(hex.slice(3, 5), 16);
    let b = parseInt(hex.slice(5, 7), 16);

    // Aplicar el factor para aclarar el color
    r = Math.min(255, Math.floor(r + (255 - r) * factor));
    g = Math.min(255, Math.floor(g + (255 - g) * factor));
    b = Math.min(255, Math.floor(b + (255 - b) * factor));

    // Convertir los componentes de nuevo a hexadecimal y devolver el nuevo código
    return `#${(r < 16 ? '0' : '') + r.toString(16)}${(g < 16 ? '0' : '') + g.toString(16)}${(b < 16 ? '0' : '') + b.toString(16)}`;
}

export function buttonsColorText(hex) {
    // Convert hex to RGB
    let r = parseInt(hex.slice(1, 3), 16);
    let g = parseInt(hex.slice(3, 5), 16);
    let b = parseInt(hex.slice(5, 7), 16);

    // Calculate the luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    // Determine if the color is light or dark
    const isLight = luminance > 0.5;

    // Adjust color brightness
    const adjustment = 150; // You can increase this value for more contrast
    if (isLight) {
        // Make the color much darker
        r = Math.max(0, r - adjustment);
        g = Math.max(0, g - adjustment);
        b = Math.max(0, b - adjustment);
    } else {
        // Make the color much lighter
        r = Math.min(255, r + adjustment);
        g = Math.min(255, g + adjustment);
        b = Math.min(255, b + adjustment);
    }

    // Convert RGB back to hex
    const newHex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;

    return newHex;
}


export function switchdt(timestamp) {
    // Crear un nuevo objeto Date usando el timestamp
    const date = new Date(timestamp * 1000);

    // Obtener las horas y minutos
    let horas = date.getHours();
    let minutos = date.getMinutes();

    // Agregar un cero inicial si los minutos son menores que 10
    minutos = minutos < 10 ? '0' + minutos : minutos;

    // Formar la cadena de la hora legible
    const horaLegible = `${horas}:${minutos}`;

    return horaLegible;
}

export function colorFactoryToHex(colorFactory) {
    // Si el valor ya es un código hexadecimal válido, lo retorna sin cambios
    if (typeof colorFactory === 'string' && /^#([0-9A-Fa-f]{3}){1,2}$/.test(colorFactory)) {
        return colorFactory;
    }

    // Extrae los componentes RGB del objeto ColorFactory
    const { r, g, b } = colorFactory.toRgb();

    // Convierte los componentes RGB a hexadecimal
    const redHex = Math.round(r).toString(16).padStart(2, '0');
    const greenHex = Math.round(g).toString(16).padStart(2, '0');
    const blueHex = Math.round(b).toString(16).padStart(2, '0');

    // Devuelve el color en formato hexadecimal
    return `#${redHex}${greenHex}${blueHex}`;
}

export function formatDateToISO(dateObj) {
    const year = dateObj.$y;
    const month = String(dateObj.$M + 1).padStart(2, '0');
    const day = String(dateObj.$D).padStart(2, '0');
    const hours = String(dateObj.$H).padStart(2, '0');
    const minutes = String(dateObj.$m).padStart(2, '0');
    const seconds = String(dateObj.$s).padStart(2, '0');

    // console.log(`${year}-${month}-${day}T${hours}:${minutes}:${seconds}`)

    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

export const formatTimeTo12Hours = (time) => {
    // Parseamos el objeto time usando dayjs
    const parsedTime = dayjs(time);

    // Obtenemos las horas y minutos en formato de 12 horas
    const hours = parsedTime.format('h');
    const minutes = parsedTime.format('mm');

    // Obtenemos 'am' o 'pm'
    const meridiem = parsedTime.format('A').toLowerCase();

    // Construimos la hora en formato de 12 horas
    const formattedTime = `${hours}:${minutes} ${meridiem}`;

    return formattedTime;
}

export const convert12HrTo24Hr = (time12hr) => {
    // Parseamos la hora usando dayjs en formato de 12 horas
    const parsedTime = dayjs(time12hr, 'h:mm A');

    // Formateamos la hora en formato de 24 horas
    const formattedTime = parsedTime.format('HH:mm');

    return formattedTime;
};


export function generateSimpleId() {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const chars = letters + numbers;

    let result = '';

    // Obtener 3 caracteres aleatorios para la primera parte
    for (let i = 0; i < 3; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    result += '-';

    // Obtener 3 caracteres aleatorios para la segunda parte
    for (let i = 0; i < 3; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return result;
}

const key = "AIzaSyBZ8NLpvAl4DiTeE2gYekBqhmSZFx43R0M"

export function simpleaddress(direccion, numero, colonia, codigoPostal, ciudad, estado) {
    const direccionCompleta = `${direccion} ${numero}, ${colonia}, ${codigoPostal}, ${ciudad}, ${estado}, Mexico`;
    const direccionCodificada = encodeURIComponent(direccionCompleta);

    const urlMapaGenerado = `https://maps.googleapis.com/maps/api/staticmap?center=${direccionCodificada}&zoom=17&size=800x1000&sensor=false&markers=${direccionCodificada}&scale=2&key=${key}`;

    // console.log('Generated URL:', urlMapaGenerado);  // Agrega este console.log para verificar la URL
    return urlMapaGenerado;
}


