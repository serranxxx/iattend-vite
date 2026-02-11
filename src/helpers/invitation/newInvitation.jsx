import { BsStars } from "react-icons/bs";
import { FaLock, FaRegFile, FaRegFileImage, FaStar, FaUnlockAlt } from "react-icons/fa";
import { PiShootingStarFill } from "react-icons/pi";

export const inv_types = [
    {
        title: "Invitación Pública",
        description: "Permiten que cualquier persona pueda acceder a los detalles del evento, siendo ideales para celebraciones públicas o eventos donde se desea una amplia participación. Comparte el enlace y deja que todos se unan a la fiesta.",
        type: 'open',
        icon: FaUnlockAlt
    },
    {
        title: "Invitación Privada",
        description: "Restringen el acceso solo a las personas en tu lista de invitados, asegurando que solo los invitados específicos puedan ver los detalles del evento. Perfectas para eventos privados o exclusivos donde deseas mantener un control estricto sobre la asistencia.",
        type: 'closed',
        icon: FaLock
    }
]

export const design_types = [
    {
        title: "Diseño desde Cero",
        description: "Está enfocado en brindar total control creativo, permitiendo que el usuario diseñe cada aspecto de la invitación.",
        type: 'blank',
        icon: FaRegFile
    },
    {
        title: "Diseño con Plantilla",
        description: "Facilita el uso de un diseño predefinido, para que el usuario solo tenga que cambiar la información, haciendo el proceso más rápido y sencillo",
        type: 'template',
        icon: FaRegFileImage
    },
    // {
    //     title: "Diseño hecho por un Experto",
    //     description: "Un diseñador se encargará de crear una invitación personalizada para ti, cuidando cada detalle para que sea perfecta. Al finalizar, podrás editarla a tu gusto para hacer cualquier ajuste. Este servicio tiene un costo adicional de $300.",
    //     type: 'design',
    //     icon: BsFileEarmarkPerson
    // }
]

export const inv_planes = [
    // {
    //     name: 'Prueba',
    //     price: "GRATIS",
    //     time: "8 horas",
    //     type: 'test',
    //     real_time: 8 * 60 * 60 * 1000,
    //     description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit."
    // },
    {
        name: 'Bodas / XV años',
        price: "$2,500",
        amount: 2500,
        time: "Hasta el final de tu evento",
        type: 'pro',
        real_time: 365 * 24 * 60 * 60 * 1000,
        description: "Para los eventos más especiales de la vida. Con todo el tiempo de acceso que necesites, este plan ofrece la flexibilidad y el tiempo necesario para organizar y gestionar tu evento de manera impecable.",
        icon: <BsStars size={24} />
    },
    {
        name: 'Fiestas / Eventos',
        price: "$900",
        amount: 900,
        time: "3 meses",
        type: 'regular',
        real_time: 90 * 24 * 60 * 60 * 1000,
        description: "Perfecto para eventos que requieren un poco más de tiempo y flexibilidad. Personaliza y gestiona tu invitación sin prisas, asegurando que cada detalle esté perfecto para el día del evento.",
        icon: <PiShootingStarFill size={18} />
    },
    {
        name: 'Celebraciones Exprés',
        price: "$450",
        amount: 450,
        time: "25 días",
        type: 'fast',
        real_time: 25 * 24 * 60 * 60 * 1000,
        description: "Una solución rápida y efectiva. Perfecto para cumpleaños, reuniones familiares o cualquier ocasión que merezca ser celebrada con estilo, sin complicaciones y en poco tiempo.",
        icon: <FaStar size={18} />
    },


    // {
    //     name: 'Eventos',
    //     price: "$1,800",
    //     time: "6 meses",
    //     type: 'basic',
    //     real_time: 180 * 24 * 60 * 60 * 1000,
    //     description: "Para eventos que requieren una planificación y seguimiento más detallado. Manten tus invitaciones activas durante 6 meses, asegurando que todos tus invitados tengan tiempo suficiente para organizarse.",
    //     icon: <PiShootingStarFill size={24} />
    // },




]

const getDueDate = (type) => {
    const now = new Date();
    const plan = inv_planes.find(plan => plan.type === type)
    return new Date(now.getTime() + plan.real_time)
}


export const handleTemplates = (user, currentType, currentPlan, dominio, currentTemplate, currentDesign) => {


    const blank = {
        userID: user, //
        active: false,
        started: currentTemplate === 'wedding' && false,
        due_date: getDueDate(currentPlan),
        type: currentType,
        plan: currentPlan,
        creation_date: new Date(),
        last_update_date: new Date(),
        label: currentTemplate,
        payment: "",
        greeting: { //
            active: false, //
            background: false, //
            invertedColors: false, //
            separator: true, //
            id: 1, //
            title: "", //
            description: "" //
        },
        family: {
            active: false, //
            background: true,//
            invertedColors: false,//
            separator: false,//
            id: 2,//
            title: "",//
            personas: [
            ] //
        },
        quote: {
            active: false, //
            id: 3, //
            background: false, //
            invertedColors: false, //
            separator: false, //
            image: false, //
            description: "", //
            image_dev: "", //
            image_prod: "", //
            text: {
                justify: "center", //
                align: "center", //
                font: null, //
                size: 18, //
                opacity: 0.6, //
                weight: 500, //
                color: "#f6f6f2", //
                width: 70, //
                shadow: true //
            }
        },
        itinerary: {
            active: false,
            background: false,
            invertedColors: false,
            separator: false,
            id: 4,
            title: "",
            object: []
        },
        dresscode: {
            active: false,
            background: false,
            invertedColors: false,
            separator: true,
            id: 5,
            title: "",
            description: "",
            colors: [],
            images_prod: [],
            images_dev: [],
            available: 2,
            links: [],
            onImages: false,
            onLinks: false
        },
        gifts: {
            active: false,
            background: false,
            invertedColors: false,
            separator: false,
            id: 6,
            title: "",
            description: "",
            cards: []
        },
        destinations: {
            active: false,
            background: false,
            invertedColors: false,
            separator: false,
            id: 7,
            title: "",
            description: "",
            cards: []
        },
        notices: {
            active: false,
            background: false,
            invertedColors: false,
            separator: false,
            id: 8,
            title: "",
            notices: []
        },
        cover: {
            flexDirection: "column", //
            title: "Nueva Invitación", //
            fontSize: 6, //
            fontWeight: 1000, //
            opacity: 1, //
            align: "flex-end", //
            justify: "center", //
            date: getDueDate(currentPlan), //
            isDate: true, //
            featured_prod: "", //
            featured_dev: "", //
            image: "Outfit", //
            color: "#FFFFFF", //
            timerColor: "#fefefd",
            timerType: 0,
            auto: false, //
            background: true, //
            mapPosition: {
                x: 0,
                y: 0
            }, //
            zoomLevel: 1, //
        },
        gallery: {
            active: false,
            background: false,
            invertedColors: false,
            separator: false,
            id: 9,
            title: "",
            gallery_prod: [],
            gallery_dev: [],
            available: 0
        },
        generals: {
            color: "#E1E1E1",
            palette: {
                base: "#161914",
                primary: "#ffffff",
                secondary: "#f3f3f6",
                accent: "#737373",
                buttons: "#000000"
            },
            eventName: dominio,
            font: "Noto Sans",
            separator: 1,
            texture: null,
            theme: true,
            positions: [
                1,
                2,
                3,
                4,
                5,
                6,
                7,
                8,
                9
            ]
        }


    }
    const template = {
        userID: user,
        active: false,
        started: currentTemplate === 'wedding' && false,
        due_date: getDueDate(currentPlan),
        type: currentType,
        plan: currentPlan,
        creation_date: new Date(),
        last_update_date: new Date(),
        label: currentTemplate,
        payment: "",
        greeting: {
            active: true,
            background: false,
            invertedColors: false,
            separator: true,
            id: 1,
            title: "ESTAMOS  FELICES DE INVITARTE",
            description: "Tu presencia hará que este día sea aún más especial para nosotros. Esperamos que puedas acompañarnos y compartir este momento de felicidad."
        },
        family: {
            active: true,
            background: true,
            invertedColors: false,
            separator: false,
            id: 2,
            title: "NUESTROS PADRES",
            personas: [
                {
                    title: "Padre del novio",
                    name: "Jesus Gutierrez Arzate"
                },
                {
                    title: "Madre del novio",
                    name: "Teresa Pencina Macias"
                },
                {
                    title: "Padre de la novia",
                    name: "Jose Manuel Carrillo"
                },
                {
                    title: "Madre de la novia",
                    name: "Maria Guerra Hernandez"
                }
            ]
        },
        quote: {
            active: true,
            id: 3,
            background: true,
            invertedColors: false,
            separator: false,
            description: "Amar no es mirarse el uno al otro. Es mirar juntos en la misma dirección.",
            image: false,
            image_dev: "",
            image_prod: "",
            text: {
                justify: "center",
                align: "center",
                font: null,
                size: 18,
                opacity: 0.6,
                weight: 500,
                color: "#f6f6f2",
                width: 70,
                shadow: true
            }
        },
        itinerary: {
            active: true,
            background: false,
            invertedColors: false,
            separator: false,
            id: 4,
            title: "ITINERARIO",
            object: [
                {
                    name: "Ceremonia",
                    time: "4:00 pm",
                    subname: "Templo de San Francisco de Asís",
                    address: {
                        calle: "Juan de Dios Martin Barba Antes",
                        numero: "6112",
                        colonia: "Nombre de Dios",
                        CP: "31110",
                        ciudad: "Chihuahua",
                        estado: "Chihuahua",
                        url: "https://maps.app.goo.gl/AsZ3fRS8M8yBQehu8"
                    },
                    subitems: null,
                    playlist: null,
                    active: false,
                    image: 55,
                    id: "1"
                },
                {
                    name: "Recepción",
                    time: "6:00 pm",
                    subname: "Jardines del Alba",
                    address: {
                        calle: "Sierra magisterial",
                        numero: "5362",
                        colonia: "Los nogales",
                        CP: "31380",
                        ciudad: "Chihuahua",
                        estado: "Chihuahua",
                        url: "https://maps.app.goo.gl/yRmaSoLsyDGg9FjK9"
                    },
                    subitems: [
                        {
                            name: "Coktail hour",
                            time: "6:00 pm",
                            description: "Cocteles, refrigerios y fotos bajo el sol mientras llegan los invitados. ¡Comienza la magia de la boda!"
                        },
                        {
                            name: "Boda civil",
                            time: "7:00 pm",
                            description: "El amor se oficializa. La ceremonia civil será aquí mismo. ¡La emoción está por comenzar"
                        }
                    ],
                    playlist: null,
                    active: false,
                    image: 44,
                    id: "2"
                },
            ]
        },
        dresscode: {
            active: true,
            background: true,
            invertedColors: false,
            separator: false,
            id: 5,
            title: "DRESS CODE",
            description: "Queremos que te sientas increíble y deslumbres con tu estilo único. Explora nuestros boards en Pinterest para encontrar inspiración.",
            colors: [
                "#ac8f51",
                "#aea87e",
                "#747951"
            ],
            images_prod: [
            ],
            images_dev: [],
            available: 2,
            onImages: false,
            onLinks: false
        },
        gifts: {
            active: true,
            background: false,
            invertedColors: false,
            separator: false,
            id: 6,
            title: "MESA DE REGALOS",
            description: "¡Tu presencia es el mejor regalo, pero tus buenos deseos se hacen aún más especiales con un toque personal!",
            cards: [
                {
                    link: true,
                    type: "Amazon",
                    url: "https://www.amazon.com",
                    bank: null,
                    name: null,
                    number: null
                },
                {
                    link: true,
                    type: "Sears",
                    url: "https://www.sears.com.mx/",
                    bank: null,
                    name: null,
                    number: null
                },
                {
                    link: false,
                    type: null,
                    url: null,
                    bank: "BBVA",
                    name: "Jorge Perez",
                    number: "4152 3136 5528 4915"
                }
            ]
        },
        destinations: {
            active: true,
            background: true,
            invertedColors: true,
            separator: false,
            id: 7,
            title: "DESTINOS",
            description: "Sabemos que este viaje es especial y queremos que lo disfrutes al máximo. Aquí encontrarás una selección de lugares para hospedarte.",
            cards: []
        },
        notices: {
            active: true,
            background: false,
            invertedColors: false,
            separator: false,
            id: 8,
            title: "AVISOS",
            notices: [
                "Revisa la ubicación y horario de la ceremonia y recepción. ¡Nos vemos pronto!",
                "Queremos que la boda sea sin estrés. Lleguen a tiempo para disfrutar cada momento. ¡Gracias por ser parte de este día especial!"
            ]
        },
        cover: {
            date: getDueDate(currentPlan),
            isDate: true,
            flexDirection: "column",
            fontSize: 3.29,
            fontWeight: 600,
            opacity: 0.95,
            align: "flex-end",
            justify: "center",
            featured_prod: "",
            featured_dev: "",
            background: true,
            image: "Outfit",
            color: "#000000",
            auto: false,
            timerColor: "#F5F5F5",
            timerType: 0,
            title: "Andrea & Jorge",
            mapPosition: {
                x: 0,
                y: 0
            },
            zoomLevel: 1,
        },
        gallery: {
            active: true,
            background: false,
            invertedColors: false,
            separator: false,
            id: 9,
            title: "GALERÍA",
            gallery_prod: [
            ],
            gallery_dev: [],
            available: 3
        },
        generals: {
            color: "#9151ac",
            palette: {
                base: "#9b9068",
                primary: "#f5f3ef",
                secondary: "#ebe8e0",
                accent: "#3e3929",
                buttons: "#c3bca4"
            },
            eventName: dominio,
            font: "Outfit",
            separator: 1,
            texture: null,
            theme: true,
            positions: [
                1,
                2,
                3,
                4,
                5,
                6,
                7,
                8,
                9
            ]
        },




    }

    if (currentDesign === 'blank') {
        return blank
    } else {
        return template
    }



}


