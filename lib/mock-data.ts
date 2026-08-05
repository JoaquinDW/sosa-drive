import type {
  AlertaIA,
  Conversacion,
  EtapaEmbudo,
  EventoAgenda,
  EventoLead,
  KpisHoy,
  Lead,
  Mensaje,
  Moto,
  OrigenLeads,
  Tarea,
  UnidadStock,
  Vendedor,
} from "./types";

function hace(opts: { min?: number; horas?: number; dias?: number }): string {
  const ms =
    (opts.min ?? 0) * 60_000 +
    (opts.horas ?? 0) * 3_600_000 +
    (opts.dias ?? 0) * 86_400_000;
  return new Date(Date.now() - ms).toISOString();
}

function dentroDe(opts: { min?: number; horas?: number; dias?: number }): string {
  const ms =
    (opts.min ?? 0) * 60_000 +
    (opts.horas ?? 0) * 3_600_000 +
    (opts.dias ?? 0) * 86_400_000;
  return new Date(Date.now() + ms).toISOString();
}

export const vendedores: Vendedor[] = [
  {
    id: "v1",
    nombre: "Juan Ferreyra",
    rol: "vendedor",
    nivel: 8,
    xp: 4820,
    ventasMes: 14,
    facturacionMes: 68_400_000,
    conversion: 0.24,
    tiempoRespuestaSeg: 96,
    leadsAbiertos: 12,
    insignias: [
      {
        id: "i1",
        nombre: "Mayor conversión del mes",
        descripcion: "Cerró el 24% de sus leads en junio",
        icono: "trofeo",
      },
      {
        id: "i2",
        nombre: "Rayo",
        descripcion: "El más rápido respondiendo",
        icono: "rayo",
      },
    ],
  },
  {
    id: "v2",
    nombre: "Pedro Aguirre",
    rol: "vendedor",
    nivel: 6,
    xp: 3350,
    ventasMes: 10,
    facturacionMes: 51_200_000,
    conversion: 0.19,
    tiempoRespuestaSeg: 148,
    leadsAbiertos: 15,
    insignias: [
      {
        id: "i3",
        nombre: "Racha de fuego",
        descripcion: "20 seguimientos consecutivos sin dejar pasar ninguno",
        icono: "fuego",
      },
    ],
  },
  {
    id: "v3",
    nombre: "Lucas Benítez",
    rol: "vendedor",
    nivel: 5,
    xp: 2610,
    ventasMes: 7,
    facturacionMes: 39_800_000,
    conversion: 0.14,
    tiempoRespuestaSeg: 232,
    leadsAbiertos: 21,
    insignias: [
      {
        id: "i4",
        nombre: "Mayor facturación",
        descripcion: "Vendió la CFMoto 450 más cara del trimestre",
        icono: "dinero",
      },
    ],
  },
  {
    id: "v4",
    nombre: "Sofía Ledesma",
    rol: "vendedor",
    nivel: 7,
    xp: 3980,
    ventasMes: 11,
    facturacionMes: 55_900_000,
    conversion: 0.21,
    tiempoRespuestaSeg: 121,
    leadsAbiertos: 9,
    insignias: [
      {
        id: "i5",
        nombre: "Estrella en ascenso",
        descripcion: "Subió dos niveles en un mes",
        icono: "estrella",
      },
    ],
  },
];

export const gerente: Vendedor = {
  id: "g1",
  nombre: "Martín Sosa",
  rol: "gerente",
  nivel: 10,
  xp: 9999,
  ventasMes: 0,
  facturacionMes: 0,
  conversion: 0,
  tiempoRespuestaSeg: 0,
  leadsAbiertos: 0,
  insignias: [],
};

export const motos: Moto[] = [
  {
    id: "m1",
    marca: "Honda",
    modelo: "Wave 110 S",
    anio: 2026,
    precio: 3_150_000,
    precioFinanciado: 3_690_000,
    descripcion:
      "La moto más vendida del país. Ideal para el día a día: económica, confiable y con repuestos en todos lados.",
    motor: "Monocilíndrico 4T OHC",
    cilindrada: 110,
    consumo: "2,1 L/100 km",
    velocidadMaxima: 90,
    garantia: "1 año o 12.000 km",
    colores: ["Rojo", "Negro", "Azul"],
    stock: 3,
  },
  {
    id: "m2",
    marca: "Motomel",
    modelo: "Blitz 110 V8",
    anio: 2026,
    precio: 2_390_000,
    precioFinanciado: 2_790_000,
    descripcion:
      "La entrada al mundo de las 110. Precio imbatible y bajo costo de mantenimiento.",
    motor: "Monocilíndrico 4T",
    cilindrada: 110,
    consumo: "2,3 L/100 km",
    velocidadMaxima: 85,
    garantia: "1 año o 10.000 km",
    colores: ["Negro", "Gris", "Rojo"],
    stock: 8,
  },
  {
    id: "m3",
    marca: "Honda",
    modelo: "XR 150 L",
    anio: 2026,
    precio: 5_480_000,
    precioFinanciado: 6_290_000,
    descripcion:
      "La enduro urbana por excelencia. Robusta, versátil y lista para cualquier camino.",
    motor: "Monocilíndrico 4T OHC",
    cilindrada: 150,
    consumo: "2,8 L/100 km",
    velocidadMaxima: 105,
    garantia: "1 año o 12.000 km",
    colores: ["Rojo", "Blanco"],
    stock: 5,
  },
  {
    id: "m4",
    marca: "CFMoto",
    modelo: "450 SR",
    anio: 2026,
    precio: 12_900_000,
    precioFinanciado: 14_500_000,
    descripcion:
      "Deportiva de media cilindrada con electrónica de primera: tablero TFT, ABS en curva y modos de manejo.",
    motor: "Bicilíndrico en línea, refrigerado por líquido",
    cilindrada: 449,
    consumo: "4,2 L/100 km",
    velocidadMaxima: 190,
    garantia: "2 años sin límite de km",
    colores: ["Azul Racing", "Negro"],
    stock: 2,
  },
  {
    id: "m5",
    marca: "Motomel",
    modelo: "Skua 150 Silver",
    anio: 2026,
    precio: 3_890_000,
    precioFinanciado: 4_450_000,
    descripcion:
      "On-off accesible para trabajo y aventura. La preferida del interior.",
    motor: "Monocilíndrico 4T",
    cilindrada: 150,
    consumo: "2,9 L/100 km",
    velocidadMaxima: 100,
    garantia: "1 año o 10.000 km",
    colores: ["Plata", "Negro", "Rojo"],
    stock: 6,
  },
  {
    id: "m6",
    marca: "CFMoto",
    modelo: "300 NK",
    anio: 2026,
    precio: 8_750_000,
    precioFinanciado: 9_900_000,
    descripcion:
      "Naked ágil y moderna, perfecta para la ciudad con espíritu deportivo.",
    motor: "Monocilíndrico DOHC, refrigerado por líquido",
    cilindrada: 292,
    consumo: "3,5 L/100 km",
    velocidadMaxima: 140,
    garantia: "2 años sin límite de km",
    colores: ["Blanco", "Negro"],
    stock: 0,
  },
];

export const unidadesStock: UnidadStock[] = [
  { id: "u1", motoId: "m1", numeroMotor: "HW110-88412", numeroCuadro: "8CH-99231", sucursal: "Casa Central", color: "Rojo", estado: "disponible" },
  { id: "u2", motoId: "m1", numeroMotor: "HW110-88413", numeroCuadro: "8CH-99232", sucursal: "Casa Central", color: "Negro", estado: "reservada" },
  { id: "u3", motoId: "m1", numeroMotor: "HW110-88414", numeroCuadro: "8CH-99233", sucursal: "Sucursal Norte", color: "Azul", estado: "disponible" },
  { id: "u4", motoId: "m4", numeroMotor: "CF450-10221", numeroCuadro: "LCF-45881", sucursal: "Casa Central", color: "Azul Racing", estado: "disponible" },
  { id: "u5", motoId: "m4", numeroMotor: "CF450-10222", numeroCuadro: "LCF-45882", sucursal: "Casa Central", color: "Negro", estado: "en_transito" },
  { id: "u6", motoId: "m3", numeroMotor: "XR150-55120", numeroCuadro: "8CH-77410", sucursal: "Sucursal Norte", color: "Rojo", estado: "disponible" },
];

export const leads: Lead[] = [
  {
    id: "l1",
    nombre: "Carla Domínguez",
    dni: "38.442.109",
    telefono: "+54 9 351 555-2810",
    email: "carla.dominguez@gmail.com",
    ciudad: "Córdoba",
    fuente: "instagram",
    motoInteresId: "m4",
    motoAlternativaId: "m6",
    presupuesto: 13_000_000,
    formaPago: "financiado",
    financiacion: true,
    estado: "negociacion",
    score: 95,
    scoreMotivo: "Muy caliente. Piensa comprar en menos de 7 días.",
    vendedorId: "v1",
    notas: "Quiere la 450 SR azul. Espera aprobación del banco.",
    creadoEn: hace({ dias: 2, horas: 3 }),
    ultimoContactoEn: hace({ min: 25 }),
  },
  {
    id: "l2",
    nombre: "Rodrigo Paz",
    telefono: "+54 9 351 555-9034",
    ciudad: "Villa Carlos Paz",
    fuente: "whatsapp",
    motoInteresId: "m1",
    formaPago: "contado",
    financiacion: false,
    permuta: "Zanella ZB 110 (2019)",
    estado: "visita",
    score: 82,
    scoreMotivo: "Caliente. Agendó visita para esta semana y tiene permuta.",
    vendedorId: "v2",
    creadoEn: hace({ dias: 1, horas: 5 }),
    ultimoContactoEn: hace({ horas: 2 }),
  },
  {
    id: "l3",
    nombre: "Mariana Quiroga",
    telefono: "+54 9 11 5555-7621",
    email: "mquiroga@hotmail.com",
    ciudad: "Buenos Aires",
    fuente: "mercadolibre",
    motoInteresId: "m3",
    presupuesto: 5_500_000,
    formaPago: "financiado",
    financiacion: true,
    estado: "calificado",
    score: 74,
    scoreMotivo: "Tibio-caliente. Consultó cuotas y anticipos dos veces.",
    vendedorId: "v4",
    creadoEn: hace({ horas: 8 }),
    ultimoContactoEn: hace({ horas: 1 }),
  },
  {
    id: "l4",
    nombre: "Diego Herrera",
    telefono: "+54 9 351 555-1187",
    ciudad: "Río Cuarto",
    fuente: "facebook",
    motoInteresId: "m5",
    formaPago: "contado",
    financiacion: false,
    estado: "nuevo",
    score: 45,
    scoreMotivo: "Tibio. Todavía no definió fecha de compra.",
    creadoEn: hace({ min: 18 }),
  },
  {
    id: "l5",
    nombre: "Valentina Ríos",
    telefono: "+54 9 351 555-6402",
    email: "valen.rios@gmail.com",
    ciudad: "Córdoba",
    fuente: "web",
    motoInteresId: "m2",
    presupuesto: 2_500_000,
    formaPago: "financiado",
    financiacion: true,
    estado: "contactado",
    score: 61,
    scoreMotivo: "Tibio. Pidió info de financiación pero no respondió el último mensaje.",
    vendedorId: "v3",
    creadoEn: hace({ horas: 26 }),
    ultimoContactoEn: hace({ horas: 25 }),
  },
  {
    id: "l6",
    nombre: "Nicolás Funes",
    telefono: "+54 9 3541 55-8830",
    ciudad: "Cosquín",
    fuente: "google",
    motoInteresId: "m3",
    motoAlternativaId: "m5",
    formaPago: "mixto",
    financiacion: true,
    permuta: "Honda Biz 125 (2021)",
    estado: "visita",
    score: 88,
    scoreMotivo: "Muy caliente. Confirmó test drive y tiene permuta valuada.",
    vendedorId: "v1",
    creadoEn: hace({ dias: 3 }),
    ultimoContactoEn: hace({ horas: 4 }),
  },
  {
    id: "l7",
    nombre: "Agustina Vega",
    telefono: "+54 9 351 555-3319",
    ciudad: "Alta Gracia",
    fuente: "instagram",
    motoInteresId: "m6",
    formaPago: "financiado",
    financiacion: true,
    estado: "contactado",
    score: 52,
    scoreMotivo: "Tibio. Preguntó por la 300 NK pero no hay stock.",
    vendedorId: "v4",
    creadoEn: hace({ horas: 30 }),
    ultimoContactoEn: hace({ horas: 6 }),
  },
  {
    id: "l8",
    nombre: "Federico Molina",
    dni: "35.108.774",
    telefono: "+54 9 351 555-4471",
    email: "fede.molina@gmail.com",
    ciudad: "Córdoba",
    fuente: "referido",
    motoInteresId: "m4",
    presupuesto: 15_000_000,
    formaPago: "contado",
    financiacion: false,
    estado: "vendido",
    score: 100,
    scoreMotivo: "Venta cerrada.",
    vendedorId: "v1",
    creadoEn: hace({ dias: 6 }),
    ultimoContactoEn: hace({ dias: 1 }),
  },
  {
    id: "l9",
    nombre: "Julieta Barrios",
    telefono: "+54 9 351 555-9902",
    ciudad: "Córdoba",
    fuente: "whatsapp",
    motoInteresId: "m1",
    formaPago: "financiado",
    financiacion: true,
    estado: "nuevo",
    score: 38,
    scoreMotivo: "Frío-tibio. Consultó precio y no volvió a escribir.",
    creadoEn: hace({ min: 47 }),
  },
  {
    id: "l10",
    nombre: "Marcos Ibáñez",
    telefono: "+54 9 358 555-2214",
    ciudad: "Río Cuarto",
    fuente: "mercadolibre",
    motoInteresId: "m2",
    formaPago: "contado",
    financiacion: false,
    estado: "perdido",
    score: 12,
    scoreMotivo: "Compró en otra concesionaria.",
    vendedorId: "v3",
    creadoEn: hace({ dias: 9 }),
    ultimoContactoEn: hace({ dias: 5 }),
  },
  {
    id: "l11",
    nombre: "Camila Ferrero",
    telefono: "+54 9 351 555-7755",
    email: "cami.ferrero@gmail.com",
    ciudad: "Villa María",
    fuente: "instagram",
    motoInteresId: "m5",
    presupuesto: 4_000_000,
    formaPago: "financiado",
    financiacion: true,
    estado: "calificado",
    score: 69,
    scoreMotivo: "Tibio-caliente. Espera simulación de cuotas.",
    vendedorId: "v2",
    creadoEn: hace({ horas: 12 }),
    ultimoContactoEn: hace({ horas: 3 }),
  },
  {
    id: "l12",
    nombre: "Gonzalo Torres",
    telefono: "+54 9 351 555-0968",
    ciudad: "Córdoba",
    fuente: "llamada",
    motoInteresId: "m3",
    formaPago: "contado",
    financiacion: false,
    estado: "nuevo",
    score: 55,
    scoreMotivo: "Tibio. Llamó preguntando disponibilidad de la XR 150.",
    creadoEn: hace({ min: 8 }),
  },
];

export const eventosLead: EventoLead[] = [
  // Lead 1 — Carla (negociación)
  { id: "e1", leadId: "l1", tipo: "ingreso", descripcion: "Lead ingresó desde Instagram (campaña CFMoto 450 SR)", actor: "Sistema", creadoEn: hace({ dias: 2, horas: 3 }) },
  { id: "e2", leadId: "l1", tipo: "ia", descripcion: "La IA respondió automáticamente y comenzó la cualificación", actor: "IA", creadoEn: hace({ dias: 2, horas: 3 }) },
  { id: "e3", leadId: "l1", tipo: "ia", descripcion: "Score generado: 95/100 — Muy caliente, piensa comprar en menos de 7 días", actor: "IA", creadoEn: hace({ dias: 2, horas: 2 }) },
  { id: "e4", leadId: "l1", tipo: "asignacion", descripcion: "Lead asignado a Juan Ferreyra (modo prioridad)", actor: "Sistema", creadoEn: hace({ dias: 2, horas: 2 }) },
  { id: "e5", leadId: "l1", tipo: "llamada", descripcion: "Juan llamó a la clienta. Interesada en financiar con anticipo del 30%", actor: "Juan Ferreyra", creadoEn: hace({ dias: 2, horas: 1 }) },
  { id: "e6", leadId: "l1", tipo: "cotizacion", descripcion: "Cotización enviada por WhatsApp: 450 SR con casco de regalo", actor: "Juan Ferreyra", creadoEn: hace({ dias: 1, horas: 6 }) },
  { id: "e7", leadId: "l1", tipo: "estado", descripcion: "Pasó a Negociación: espera aprobación del banco", actor: "Juan Ferreyra", creadoEn: hace({ dias: 1 }) },
  { id: "e8", leadId: "l1", tipo: "mensaje", descripcion: "Clienta: «El banco me pide un recibo más, mañana lo llevo»", actor: "Cliente", creadoEn: hace({ min: 25 }) },
  // Lead 2 — Rodrigo (visita)
  { id: "e9", leadId: "l2", tipo: "ingreso", descripcion: "Lead ingresó desde WhatsApp", actor: "Sistema", creadoEn: hace({ dias: 1, horas: 5 }) },
  { id: "e10", leadId: "l2", tipo: "ia", descripcion: "IA cualificó: contado + permuta Zanella ZB 110", actor: "IA", creadoEn: hace({ dias: 1, horas: 5 }) },
  { id: "e11", leadId: "l2", tipo: "asignacion", descripcion: "Lead asignado a Pedro Aguirre (round robin)", actor: "Sistema", creadoEn: hace({ dias: 1, horas: 4 }) },
  { id: "e12", leadId: "l2", tipo: "visita", descripcion: "Visita agendada para mañana a las 10:30", actor: "Pedro Aguirre", creadoEn: hace({ horas: 2 }) },
  // Lead 4 — Diego (nuevo, sin asignar)
  { id: "e13", leadId: "l4", tipo: "ingreso", descripcion: "Lead ingresó desde Facebook", actor: "Sistema", creadoEn: hace({ min: 18 }) },
  { id: "e14", leadId: "l4", tipo: "ia", descripcion: "IA inició cualificación automática", actor: "IA", creadoEn: hace({ min: 17 }) },
];

export const conversaciones: Conversacion[] = [
  { id: "c1", leadId: "l1", canal: "instagram", noLeidos: 1, ultimoMensaje: "El banco me pide un recibo más, mañana lo llevo", ultimoMensajeEn: hace({ min: 25 }), asignadoA: "v1" },
  { id: "c2", leadId: "l4", canal: "facebook", noLeidos: 2, ultimoMensaje: "¿La Skua 150 la tenés en negro?", ultimoMensajeEn: hace({ min: 6 }) },
  { id: "c3", leadId: "l2", canal: "whatsapp", noLeidos: 0, ultimoMensaje: "Dale, mañana 10:30 paso por el local 👍", ultimoMensajeEn: hace({ horas: 2 }), asignadoA: "v2" },
  { id: "c4", leadId: "l9", canal: "whatsapp", noLeidos: 1, ultimoMensaje: "¿Qué anticipo necesito para la Wave?", ultimoMensajeEn: hace({ min: 40 }) },
  { id: "c5", leadId: "l3", canal: "mercadolibre", noLeidos: 0, ultimoMensaje: "Gracias, espero la simulación de cuotas", ultimoMensajeEn: hace({ horas: 1 }), asignadoA: "v4" },
  { id: "c6", leadId: "l7", canal: "instagram", noLeidos: 0, ultimoMensaje: "IA: La 300 NK vuelve a estar disponible la semana que viene, ¿querés que te avise?", ultimoMensajeEn: hace({ horas: 6 }), asignadoA: "v4" },
];

export const mensajes: Mensaje[] = [
  // Conversación 1 — Carla por Instagram
  { id: "msg1", conversacionId: "c1", autor: "cliente", contenido: "Hola! Vi la publicación de la CFMoto 450 SR, ¿la tienen disponible?", creadoEn: hace({ dias: 2, horas: 3 }) },
  { id: "msg2", conversacionId: "c1", autor: "ia", contenido: "¡Hola! 👋 Sí, tenemos la 450 SR disponible en Azul Racing y Negro. ¿La comprarías de contado o con financiación?", creadoEn: hace({ dias: 2, horas: 3 }) },
  { id: "msg3", conversacionId: "c1", autor: "cliente", contenido: "Financiada. ¿Qué anticipo piden?", creadoEn: hace({ dias: 2, horas: 2 }) },
  { id: "msg4", conversacionId: "c1", autor: "ia", contenido: "Con un anticipo del 30% ($3.870.000) te quedan 18 cuotas fijas. ¿De qué ciudad sos? Así te paso la sucursal más cercana.", creadoEn: hace({ dias: 2, horas: 2 }) },
  { id: "msg5", conversacionId: "c1", autor: "cliente", contenido: "De Córdoba capital. ¿Puedo ir a verla esta semana?", creadoEn: hace({ dias: 2, horas: 2 }) },
  { id: "msg6", conversacionId: "c1", autor: "vendedor", contenido: "¡Hola Carla! Soy Juan de Sosa Motos 😊 Te llamo en un rato para coordinar, tenemos la azul en Casa Central para que la veas.", creadoEn: hace({ dias: 2, horas: 1 }) },
  { id: "msg7", conversacionId: "c1", autor: "vendedor", contenido: "Nota interna: clienta muy decidida, priorizar. Banco Galicia en trámite.", notaPrivada: true, creadoEn: hace({ dias: 1, horas: 6 }) },
  { id: "msg8", conversacionId: "c1", autor: "cliente", contenido: "El banco me pide un recibo más, mañana lo llevo", creadoEn: hace({ min: 25 }) },
  // Conversación 2 — Diego por Facebook
  { id: "msg9", conversacionId: "c2", autor: "cliente", contenido: "Hola, ¿qué precio tiene la Skua 150?", creadoEn: hace({ min: 18 }) },
  { id: "msg10", conversacionId: "c2", autor: "ia", contenido: "¡Hola! 👋 La Motomel Skua 150 Silver está $3.890.000 de contado o $4.450.000 financiada. ¿Qué moto estás buscando reemplazar o sería tu primera?", creadoEn: hace({ min: 17 }) },
  { id: "msg11", conversacionId: "c2", autor: "cliente", contenido: "¿La Skua 150 la tenés en negro?", creadoEn: hace({ min: 6 }) },
  // Conversación 3 — Rodrigo por WhatsApp
  { id: "msg12", conversacionId: "c3", autor: "cliente", contenido: "Buenas! Quiero la Wave 110, tengo una Zanella para entregar", creadoEn: hace({ dias: 1, horas: 5 }) },
  { id: "msg13", conversacionId: "c3", autor: "ia", contenido: "¡Hola! 👋 Genial, tomamos tu Zanella como parte de pago. ¿De qué año es y cuántos km tiene?", creadoEn: hace({ dias: 1, horas: 5 }) },
  { id: "msg14", conversacionId: "c3", autor: "cliente", contenido: "Es una ZB 110 del 2019, 28.000 km", creadoEn: hace({ dias: 1, horas: 4 }) },
  { id: "msg15", conversacionId: "c3", autor: "vendedor", contenido: "Hola Rodrigo, soy Pedro. Traela el jueves y te la cotizamos en el momento. ¿Te va 10:30?", creadoEn: hace({ horas: 3 }) },
  { id: "msg16", conversacionId: "c3", autor: "cliente", contenido: "Dale, mañana 10:30 paso por el local 👍", creadoEn: hace({ horas: 2 }) },
  // Conversación 4 — Julieta por WhatsApp
  { id: "msg17", conversacionId: "c4", autor: "cliente", contenido: "Hola, ¿cuánto está la Honda Wave?", creadoEn: hace({ min: 47 }) },
  { id: "msg18", conversacionId: "c4", autor: "ia", contenido: "¡Hola! 👋 La Wave 110 S está $3.150.000 de contado. También hay planes en cuotas. ¿La comprarías de contado o financiada?", creadoEn: hace({ min: 46 }) },
  { id: "msg19", conversacionId: "c4", autor: "cliente", contenido: "¿Qué anticipo necesito para la Wave?", creadoEn: hace({ min: 40 }) },
];

export const tareas: Tarea[] = [
  { id: "t1", titulo: "Llamar a Carla por la aprobación del banco", descripcion: "Confirmar si Galicia aprobó el crédito. Si aprueba, reservar la 450 SR azul.", leadId: "l1", vendedorId: "v1", venceEn: dentroDe({ horas: 2 }), prioridad: "alta" },
  { id: "t2", titulo: "Preparar cotización de permuta (Zanella ZB 110)", descripcion: "Rodrigo trae la moto mañana 10:30. Dejar lista la planilla de tasación.", leadId: "l2", vendedorId: "v2", venceEn: dentroDe({ horas: 20 }), prioridad: "alta" },
  { id: "t3", titulo: "Enviar simulación de cuotas a Mariana", descripcion: "XR 150 L financiada, anticipo $1.500.000.", leadId: "l3", vendedorId: "v4", venceEn: dentroDe({ horas: 5 }), prioridad: "media" },
  { id: "t4", titulo: "Seguimiento a Valentina (sin respuesta hace 25 h)", leadId: "l5", vendedorId: "v3", venceEn: hace({ horas: 1 }), prioridad: "alta" },
  { id: "t5", titulo: "Avisar a Agustina cuando entre stock de la 300 NK", leadId: "l7", vendedorId: "v4", venceEn: dentroDe({ dias: 4 }), prioridad: "baja" },
  { id: "t6", titulo: "Consultar al banco por el legajo de Camila", leadId: "l11", vendedorId: "v2", venceEn: dentroDe({ horas: 8 }), prioridad: "media" },
  { id: "t7", titulo: "Pedir reseña de Google a Federico", descripcion: "Entrega realizada ayer. Enviar link de reseña.", leadId: "l8", vendedorId: "v1", venceEn: hace({ horas: 3 }), prioridad: "media" },
  { id: "t8", titulo: "Confirmar test drive de Nicolás", leadId: "l6", vendedorId: "v1", venceEn: dentroDe({ horas: 26 }), prioridad: "media", },
  { id: "t9", titulo: "Actualizar precios de lista Motomel", vendedorId: "v3", venceEn: hace({ dias: 1 }), prioridad: "baja" },
  { id: "t10", titulo: "Llamar a Gonzalo por la XR 150", descripcion: "Llamó hoy preguntando disponibilidad.", leadId: "l12", vendedorId: "v3", venceEn: dentroDe({ horas: 1 }), prioridad: "alta" },
  { id: "t11", titulo: "Cargar fotos de la 450 SR negra al catálogo", vendedorId: "v4", venceEn: hace({ horas: 5 }), completadaEn: hace({ horas: 4 }), prioridad: "baja" },
  { id: "t12", titulo: "Responder consulta de Mercado Libre (Skua)", vendedorId: "v2", venceEn: hace({ horas: 8 }), completadaEn: hace({ horas: 7 }), prioridad: "media" },
];

export const agenda: EventoAgenda[] = [
  { id: "a1", tipo: "visita", titulo: "Visita de Rodrigo Paz — Wave 110 + permuta", leadId: "l2", vendedorId: "v2", inicio: dentroDe({ horas: 21 }), fin: dentroDe({ horas: 22 }), estado: "confirmado", notas: "Trae Zanella ZB 110 para tasar." },
  { id: "a2", tipo: "test_drive", titulo: "Test drive de Nicolás Funes — XR 150 L", leadId: "l6", vendedorId: "v1", inicio: dentroDe({ dias: 1, horas: 3 }), fin: dentroDe({ dias: 1, horas: 4 }), estado: "confirmado" },
  { id: "a3", tipo: "llamada", titulo: "Llamada a Carla Domínguez — banco", leadId: "l1", vendedorId: "v1", inicio: dentroDe({ horas: 2 }), fin: dentroDe({ horas: 2, min: 30 }), estado: "pendiente" },
  { id: "a4", tipo: "entrega", titulo: "Entrega CFMoto 450 SR — Federico Molina", leadId: "l8", vendedorId: "v1", inicio: hace({ dias: 1 }), fin: hace({ dias: 1 }), estado: "completado" },
  { id: "a5", tipo: "visita", titulo: "Visita de Camila Ferrero — Skua 150", leadId: "l11", vendedorId: "v2", inicio: dentroDe({ dias: 2, horas: 2 }), fin: dentroDe({ dias: 2, horas: 3 }), estado: "pendiente" },
  { id: "a6", tipo: "service", titulo: "Service 6 meses — Wave 110 de Ramiro Ponce", vendedorId: "v3", inicio: dentroDe({ dias: 3 }), fin: dentroDe({ dias: 3, horas: 1 }), estado: "confirmado" },
];

export const alertasIA: AlertaIA[] = [
  { id: "al1", severidad: "alta", mensaje: "Hay 4 leads sin responder hace más de 30 minutos.", accion: "Ver inbox" },
  { id: "al2", severidad: "alta", mensaje: "Se está agotando el stock de la Honda Wave 110 S: quedan 3 unidades y 5 leads activos la piden.", accion: "Ver stock" },
  { id: "al3", severidad: "media", mensaje: "Lucas tiene 21 leads abiertos, un 40% más que el resto del equipo.", accion: "Redistribuir" },
  { id: "al4", severidad: "media", mensaje: "Valentina Ríos espera respuesta de financiación hace más de 24 horas.", accion: "Ver lead" },
  { id: "al5", severidad: "baja", mensaje: "La conversión de Lucas bajó 6 puntos respecto del mes pasado.", accion: "Ver reporte" },
];

export const kpisHoy: KpisHoy = {
  leads: 58,
  leadsDeltaPct: 0.12,
  sinResponder: 4,
  calientes: 12,
  visitasAgendadas: 9,
  ventas: 5,
  facturacion: 24_500_000,
  facturacionDeltaPct: 0.08,
  conversion: 0.18,
  tiempoRespuestaSeg: 108,
};

export const embudo: EtapaEmbudo[] = [
  { etapa: "Leads nuevos", cantidad: 58 },
  { etapa: "Contactados", cantidad: 49 },
  { etapa: "Calificados", cantidad: 31 },
  { etapa: "Visita agendada", cantidad: 17 },
  { etapa: "Negociación", cantidad: 11 },
  { etapa: "Vendidos", cantidad: 5 },
];

export const origenLeads: OrigenLeads[] = [
  { fuente: "whatsapp", cantidad: 18 },
  { fuente: "instagram", cantidad: 14 },
  { fuente: "facebook", cantidad: 9 },
  { fuente: "mercadolibre", cantidad: 7 },
  { fuente: "google", cantidad: 5 },
  { fuente: "web", cantidad: 3 },
  { fuente: "referido", cantidad: 2 },
];

// Helpers de búsqueda
export function buscarLead(id: string): Lead | undefined {
  return leads.find((l) => l.id === id);
}

export function buscarMoto(id: string | undefined): Moto | undefined {
  return motos.find((m) => m.id === id);
}

export function buscarVendedor(id: string | undefined): Vendedor | undefined {
  if (!id) return undefined;
  return [...vendedores, gerente].find((v) => v.id === id);
}

export function eventosDeLead(leadId: string): EventoLead[] {
  return eventosLead
    .filter((e) => e.leadId === leadId)
    .sort((a, b) => b.creadoEn.localeCompare(a.creadoEn));
}

export function mensajesDeConversacion(conversacionId: string): Mensaje[] {
  return mensajes
    .filter((m) => m.conversacionId === conversacionId)
    .sort((a, b) => a.creadoEn.localeCompare(b.creadoEn));
}
