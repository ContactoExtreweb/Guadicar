// Reseñas de la ficha de Google de GuadiCar, copiadas tal cual (sin corregir).
// Las usan el carrusel de la home (Resenas.astro) y la página /opiniones.
// Para añadir una: copiar nombre y texto exactos de Google y ponerla arriba.

// Enlace para dejar reseña: redirección a Google (ver public/_redirects)
export const URL_VALORAR = '/resena'

// Ficha de Google con todas las reseñas
export const URL_GOOGLE =
  'https://www.google.com/maps/place/GUADICAR+multimarcas/@38.9678152,-5.8003009,17z/data=!4m8!3m7!1s0xd145997839be259:0xd6d2f4ad782b7333!8m2!3d38.9678152!4d-5.8003009!9m1!1b1!16s%2Fg%2F11mf47z2m5'

export const RESENAS = [
  {
    nombre: 'María Jesús Ramiro',
    texto:
      'Muy buena experiencia en la compra del coche. Me asesoró con claridad, fue profesional y cercano en todo momento, resolvió mis dudas y el proceso fue rápido y transparente. Muy contenta con la atención y con el coche. ¡Totalmente recomendable!',
  },
  {
    nombre: 'Rocío Benítez Espinosa',
    texto:
      'Estupendos!! Tanto José Juan como su hijo Jorge encantadores,súper profesionales y trato de 10! Sin duda súper recomendable,a partir de ahora todos los coches los compraré con ellos. Mil gracias por todo',
  },
  {
    nombre: 'Antonio Barajas',
    texto:
      'Les he comprado un coche, y todo han sido facilidades.\nMuy buen trato y a tope de atentos, te asesoran en todo momento y te informan de todo, los volveré a tener en cuenta si vuelvo a comprar otro coche y recomendables 100x100.',
  },
  {
    nombre: 'Ana Belen Barba Redondo',
    texto:
      'Un trato excepcional de principio a fin. Profesionales, atentos y muy cercanos. Me asesoraron perfectamente y consiguieron que todo el proceso fuera sencillo y agradable. Muy recomendable.',
  },
  {
    nombre: 'Azucena Tapia Rodriguez',
    texto:
      'Nuestra experiencia ha sido excelente de principio a fin. Recientemente hemos comprado una furgoneta en este concesionario y no podríamos estar más satisfechos. Desde el primer momento nos atendieron con mucha profesionalidad, cercanía y transparencia, resolviendo todas nuestras dudas y asesorándonos sin ningún tipo de presión.\n\nSin duda, recomendamos este concesionario al 100 % a cualquiera que esté buscando un vehículo y una atención de confianza. ¡Muchas gracias por hacer que la compra haya sido una experiencia tan positiva!',
  },
  {
    nombre: 'Juan Carlos De La Natividad Palacios',
    texto:
      'Un centro multimarca donde comprar tú próximo coche con total garantía. Entramos en su concesionario por casualidad y salimos con un coche de bajo del brazo; está claro que si te dejas asesorar por ellos, que aúnan seriedad y experiencia, el éxito está asegurado. Así que nada, a seguir así que vais por el buen camino!',
  },
  {
    nombre: 'Laura Domínguez',
    texto:
      'Un trato espectacular, súper atento a todos los detalles y sobre todo, encantador. Recomendable 100%',
  },
  {
    nombre: 'Maria cruz Carmona ponce',
    texto:
      'Trato familiar cercano, te hacen sentirte como en casa, escuchan lo que buscas y ahí tienes lo que necesitas!! Grandes profesionales.',
  },
  {
    nombre: 'Elisabet Sanchez',
    texto:
      'Grandes profesionales, se adaptan a los gustos o necesidades del cliente para ofrecer el mejor servicio. Muy recomendables.',
  },
  {
    nombre: 'José Ventura Mora ponce',
    texto:
      'Trato inigualable, siempre por y para sus clientes darles el mejor servicio. Calidad y confianza .',
  },
  {
    nombre: 'Antonio Carmona',
    texto:
      'Cada vehículo es seleccionado para difrutarlo con los más altos niveles de garantía y calidad. ¡Compramos en Guadicar!',
  },
  {
    nombre: 'Pedro José Huertas Chamizo',
    texto: 'Gran empresa, buen trato y buen producto!! Repetiremos !!',
  },
  {
    nombre: 'Ana Belén Carmona Ponce',
    texto: 'Coches de calidad, trato cercano, sin duda volveré a repetir!',
  },
  {
    nombre: 'Cristina Carmona Ponce',
    texto: 'El mejor servicio,\nTrato de 10',
  },
]

// Todas las reseñas de Google son de 5 estrellas. Si llega una distinta,
// añadir `estrellas` a esa reseña y calcular aquí la media.
export const NOTA = 5
export const TOTAL = RESENAS.length

export const iniciales = (nombre) =>
  nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('')

const COLORES = ['#cc1c1c', '#1d4ed8', '#0a7d33', '#9333ea', '#d97706', '#0891b2']
export const colorDe = (i) => COLORES[i % COLORES.length]
