
const get = (obj, path, fallback = null) =>
  path.split('.').reduce((acc, k) => (acc && acc[k] !== undefined ? acc[k] : null), obj) ?? fallback;

const asISO = (v) => {
  // admite { $date: ... } o string ISO directo
  if (!v) return null;
  if (typeof v === 'string') return v;
  if (typeof v === 'object' && v.$date) return String(v.$date);
  return null;
};

const asString = (v) => (v === undefined || v === null ? null : String(v));

const mapAddress = (a) => {
  if (!a) return undefined;
  return {
    street: asString(a.calle ?? null),
    number: asString(a.numero ?? null),
    neighborhood: asString(a.colonia ?? null),
    zip: asString(a.CP ?? null),
    city: asString(a.ciudad ?? null),
    state: asString(a.estado ?? null),
    country: null,
    url: asString(a.url ?? null),
  };
};

const firstOrNull = (arr) => (Array.isArray(arr) && arr.length ? arr[0] : null);

// ---- Transform principal ----
export const toNewInvitation = (invitation, email, user_id) => {
  // font por defecto: usa el de generals si existe
  const defaultFont = asString(get(invitation, 'generals.font'));

  const cover = invitation.cover ?? {};

  const out = {
    user_id: user_id,
    user_email: email,
    active: true,
    started: true,
    mongo_id: invitation._id,
    name: invitation.generals.eventName,
    label: invitation.label,
    type: invitation.type, // puedes refinarlo con InvitationType si ya usas enums
    plan: null, // idem con InvitationPlan
    payment_type: null,
    data: {
      cover: {
        title: {
          text: {
            value: asString(cover.title ?? null),
            size: Number(cover.fontSize ?? 0)*15,
            weight: Number(cover.fontWeight ?? 400),
            opacity: Number(cover.opacity ?? 1),
            typeFace: asString(cover.image ?? defaultFont), // en tu ejemplo venía aquí el nombre de fuente
            color: asString(cover.color ?? '#000000'),
          },
          position: {
            column_reverse: (cover.flexDirection ?? 'column'),
            align_x: (cover.justify ?? 'center'),
            align_y: (cover.align ?? 'center'),
          },
        },
        date: {
          value: asISO(cover.date),               // "$date" -> ISO string
          active: !!cover.isDate,
          color: asString(cover.timerColor ?? '#FFFFFF'),
          type: null,
        },
        image: {
          prod: asString(cover.featured_prod ?? null),
          dev: asString(cover.featured_dev ?? null),
          background: !!cover.background,
          blur: !!cover.blur,
          position: {
            x: Number(get(cover, 'mapPosition.x') ?? 0),
            y: Number(get(cover, 'mapPosition.y') ?? 0),
          },
          zoom: Number(cover.zoomLevel ?? 1),
        },
      },

      greeting: {
        active: !!get(invitation, 'greeting.active'),
        inverted: !!get(invitation, 'greeting.invertedColors'),
        background: !!get(invitation, 'greeting.background'),
        separator: !!get(invitation, 'greeting.separator'),
        title: asString(get(invitation, 'greeting.title')),
        description: asString(get(invitation, 'greeting.description')),
      },

      people: {
        active: !!get(invitation, 'family.active'),
        background: !!get(invitation, 'family.background'),
        inverted: !!get(invitation, 'family.invertedColors'),
        separator: !!get(invitation, 'family.separator'),
        title: asString(get(invitation, 'family.title') ?? 'NUESTROS PADRES'),
        personas: (get(invitation, 'family.personas') ?? []).map((p) => ({
          title: asString(p.title ?? ''),
          description: asString(p.name ?? null),
        })),
      },

      quote: {
        active: !!get(invitation, 'quote.active'),
        inverted: !!get(invitation, 'quote.invertedColors'),
        background: !!get(invitation, 'quote.background'),
        separator: !!get(invitation, 'quote.separator'),
        image: {
          active: !!get(invitation, 'quote.image'),
          dev: asString(get(invitation, 'quote.image_dev')),
          prod: asString(get(invitation, 'quote.image_prod')),
        },
        text: {
          font: {
            value: asString(get(invitation, 'quote.description')),
            size: Number(get(invitation, 'quote.text.size') ?? 16),
            weight: Number(get(invitation, 'quote.text.weight') ?? 400),
            opacity: Number(get(invitation, 'quote.text.opacity') ?? 1),
            typeFace: asString(get(invitation, 'quote.text.font') ?? defaultFont),
            color: asString(get(invitation, 'quote.text.color') ?? '#000000'),
          },
          justify: (get(invitation, 'quote.text.justify') ?? 'center'),
          align: (get(invitation, 'quote.text.align') ?? 'center'),
          width: Number(get(invitation, 'quote.text.width') ?? 100),
          shadow: !!get(invitation, 'quote.text.shadow'),
        },
      },

      itinerary: {
        active: !!get(invitation, 'itinerary.active'),
        background: !!get(invitation, 'itinerary.background'),
        inverted: !!get(invitation, 'itinerary.invertedColors'),
        separator: !!get(invitation, 'itinerary.separator'),
        title: asString(get(invitation, 'itinerary.title') ?? null),
        type: 'cards',
        object: (get(invitation, 'itinerary.object') ?? []).map((it) => ({
          name: asString(it.name ?? ''),
          image: null, // tu fuente es un índice numérico; si luego resuelves a URL, mapea aquí
          time: asString(it.time ?? null),
          subtext: asString(it.subname ?? null),
          icon: it.image != null ? Number(it.image) : null,
          id: it.id != null ? Number(it.id) : null,
          address: mapAddress(it.address),
          moments: Array.isArray(it.subitems)
            ? it.subitems.map((s) => ({
              name: asString(s.name ?? ''),
              time: asString(s.time ?? null),
              description: asString(s.description ?? null),
            }))
            : undefined,
          music: Array.isArray(it.playlist) ? firstOrNull(it.playlist) : asString(it.playlist ?? null),
        })),
      },

      dresscode: {
        active: !!get(invitation, 'dresscode.active'),
        background: !!get(invitation, 'dresscode.background'),
        inverted: !!get(invitation, 'dresscode.invertedColors'),
        separator: !!get(invitation, 'dresscode.separator'),
        title: asString(get(invitation, 'dresscode.title') ?? null),
        description: asString(get(invitation, 'dresscode.description') ?? null),
        colors: (get(invitation, 'dresscode.colors') ?? []).map(asString),
        links: (get(invitation, 'dresscode.links') ?? []).map((l) => ({
          name: asString(l.name ?? ''),
          url: asString(l.URL ?? ''),
        })),
        prod: (get(invitation, 'dresscode.images_prod') ?? []).map(asString),
        dev: (get(invitation, 'dresscode.images_dev') ?? []).map(asString),
        images_active: !!get(invitation, 'dresscode.onImages'),
        links_active: !!get(invitation, 'dresscode.onLinks'),
      },

      gifts: {
        active: !!get(invitation, 'gifts.active'),
        background: !!get(invitation, 'gifts.background'),
        inverted: !!get(invitation, 'gifts.invertedColors'),
        separator: !!get(invitation, 'gifts.separator'),
        title: asString(get(invitation, 'gifts.title') ?? null),
        description: asString(get(invitation, 'gifts.description') ?? null),
        cards: (get(invitation, 'gifts.cards') ?? []).map((c) => {
          if (c.link) {
            return {
              kind: 'store',
              brand: asString(c.type ?? null),
              url: asString(c.url ?? null),
              bank: null,
              name: null,
              number: null,
            };
          }
          return {
            kind: 'bank',
            brand: null,
            url: null,
            bank: asString(c.bank ?? null),
            name: asString(c.name ?? null),
            number: asString(c.number ?? null),
          };
        }),
      },

      destinations: {
        active: !!get(invitation, 'destinations.active'),
        background: !!get(invitation, 'destinations.background'),
        inverted: !!get(invitation, 'destinations.invertedColors'),
        separator: !!get(invitation, 'destinations.separator'),
        title: asString(get(invitation, 'destinations.title') ?? null),
        description: asString(get(invitation, 'destinations.description') ?? null),
        cards: (get(invitation, 'destinations.cards') ?? []).map((c) => ({
          image: asString(c.image ?? null),
          name: asString(c.name ?? null),
          url: asString(c.url ?? null),
          type: asString(c.type ?? 'hotel'),
          description: asString(c.description ?? null),
        })),
      },

      notices: {
        active: !!get(invitation, 'notices.active'),
        background: !!get(invitation, 'notices.background'),
        inverted: !!get(invitation, 'notices.invertedColors'),
        separator: !!get(invitation, 'notices.separator'),
        title: asString(get(invitation, 'notices.title') ?? null),
        notices: (get(invitation, 'notices.notices') ?? []).map(asString),
      },

      gallery: {
        active: !!get(invitation, 'gallery.active'),
        background: !!get(invitation, 'gallery.background'),
        inverted: !!get(invitation, 'gallery.invertedColors'),
        separator: !!get(invitation, 'gallery.separator'),
        prod: (get(invitation, 'gallery.gallery_prod') ?? []).map(asString),
        dev: (get(invitation, 'gallery.gallery_dev') ?? []).map(asString),
        title: asString(get(invitation, 'gallery.title') ?? null),
      },

      generals: {
        colors: {
          primary: asString(get(invitation, 'generals.palette.primary') ?? null),
          secondary: asString(get(invitation, 'generals.palette.secondary') ?? null),
          accent: asString(get(invitation, 'generals.palette.accent') ?? null),
          actions: asString(get(invitation, 'generals.palette.buttons') ?? null),
        },
        fonts: {
          // si luego quieres tipar tamaños/weight, completa aquí
          titles: defaultFont
            ? { value: defaultFont, size: 0, weight: 0, opacity: 1, typeFace: defaultFont, color: '#000000' }
            : undefined,
          body: defaultFont
            ? { value: defaultFont, size: 0, weight: 0, opacity: 1, typeFace: defaultFont, color: '#000000' }
            : undefined,
        },
        event: {
          label: asString(invitation.label ?? null),
          name: asString(get(invitation, 'generals.eventName') ?? null),
        },
        separator: Number(get(invitation, 'generals.separator') ?? 0),
        positions: Array.isArray(get(invitation, 'generals.positions')) ? invitation.generals.positions : [1,2,3,4,5,6,7,8,9],
        texture: get(invitation, 'generals.texture') ?? null,
      },
    }
  }

  return out;
}

export const newFormat = (invitation) => {
  // font por defecto: usa el de generals si existe
  const defaultFont = asString(get(invitation, 'generals.font'));
  const cover = invitation.cover ?? {};

  const out = {
      cover: {
        title: {
          text: {
            value: asString(cover.title ?? null),
            size: Number(cover.fontSize ?? 0)*15,
            weight: Number(cover.fontWeight ?? 400),
            opacity: Number(cover.opacity ?? 1),
            typeFace: asString(cover.image ?? defaultFont), // en tu ejemplo venía aquí el nombre de fuente
            color: asString(cover.color ?? '#000000'),
          },
          position: {
            column_reverse: (cover.flexDirection ?? 'column'),
            align_x: (cover.justify ?? 'center'),
            align_y: (cover.align ?? 'center'),
          },
        },
        date: {
          value: asISO(cover.date),               // "$date" -> ISO string
          active: !!cover.isDate,
          color: asString(cover.timerColor ?? '#FFFFFF'),
          type: null,
        },
        image: {
          prod: asString(cover.featured_prod ?? null),
          dev: asString(cover.featured_dev ?? null),
          background: !!cover.background,
          blur: !!cover.blur,
          position: {
            x: Number(get(cover, 'mapPosition.x') ?? 0),
            y: Number(get(cover, 'mapPosition.y') ?? 0),
          },
          zoom: Number(cover.zoomLevel ?? 1),
        },
      },

      greeting: {
        active: !!get(invitation, 'greeting.active'),
        inverted: !!get(invitation, 'greeting.invertedColors'),
        background: !!get(invitation, 'greeting.background'),
        separator: !!get(invitation, 'greeting.separator'),
        title: asString(get(invitation, 'greeting.title')),
        description: asString(get(invitation, 'greeting.description')),
      },

      people: {
        active: !!get(invitation, 'family.active'),
        background: !!get(invitation, 'family.background'),
        inverted: !!get(invitation, 'family.invertedColors'),
        separator: !!get(invitation, 'family.separator'),
        title: asString(get(invitation, 'family.title') ?? 'NUESTROS PADRES'),
        personas: (get(invitation, 'family.personas') ?? []).map((p) => ({
          title: asString(p.title ?? ''),
          description: asString(p.name ?? null),
        })),
      },

      quote: {
        active: !!get(invitation, 'quote.active'),
        inverted: !!get(invitation, 'quote.invertedColors'),
        background: !!get(invitation, 'quote.background'),
        separator: !!get(invitation, 'quote.separator'),
        image: {
          active: !!get(invitation, 'quote.image'),
          dev: asString(get(invitation, 'quote.image_dev')),
          prod: asString(get(invitation, 'quote.image_prod')),
        },
        text: {
          font: {
            value: asString(get(invitation, 'quote.description')),
            size: Number(get(invitation, 'quote.text.size') ?? 16),
            weight: Number(get(invitation, 'quote.text.weight') ?? 400),
            opacity: Number(get(invitation, 'quote.text.opacity') ?? 1),
            typeFace: asString(get(invitation, 'quote.text.font') ?? defaultFont),
            color: asString(get(invitation, 'quote.text.color') ?? '#000000'),
          },
          justify: (get(invitation, 'quote.text.justify') ?? 'center'),
          align: (get(invitation, 'quote.text.align') ?? 'center'),
          width: Number(get(invitation, 'quote.text.width') ?? 100),
          shadow: !!get(invitation, 'quote.text.shadow'),
        },
      },

      itinerary: {
        active: !!get(invitation, 'itinerary.active'),
        background: !!get(invitation, 'itinerary.background'),
        inverted: !!get(invitation, 'itinerary.invertedColors'),
        separator: !!get(invitation, 'itinerary.separator'),
        title: asString(get(invitation, 'itinerary.title') ?? null),
        type: 'cards',
        object: (get(invitation, 'itinerary.object') ?? []).map((it) => ({
          name: asString(it.name ?? ''),
          image: null, // tu fuente es un índice numérico; si luego resuelves a URL, mapea aquí
          time: asString(it.time ?? null),
          subtext: asString(it.subname ?? null),
          icon: it.image != null ? Number(it.image) : null,
          id: it.id != null ? Number(it.id) : null,
          address: mapAddress(it.address),
          moments: Array.isArray(it.subitems)
            ? it.subitems.map((s) => ({
              name: asString(s.name ?? ''),
              time: asString(s.time ?? null),
              description: asString(s.description ?? null),
            }))
            : undefined,
          music: Array.isArray(it.playlist) ? firstOrNull(it.playlist) : asString(it.playlist ?? null),
        })),
      },

      dresscode: {
        active: !!get(invitation, 'dresscode.active'),
        background: !!get(invitation, 'dresscode.background'),
        inverted: !!get(invitation, 'dresscode.invertedColors'),
        separator: !!get(invitation, 'dresscode.separator'),
        title: asString(get(invitation, 'dresscode.title') ?? null),
        description: asString(get(invitation, 'dresscode.description') ?? null),
        colors: (get(invitation, 'dresscode.colors') ?? []).map(asString),
        links: (get(invitation, 'dresscode.links') ?? []).map((l) => ({
          name: asString(l.name ?? ''),
          url: asString(l.URL ?? ''),
        })),
        prod: (get(invitation, 'dresscode.images_prod') ?? []).map(asString),
        dev: (get(invitation, 'dresscode.images_dev') ?? []).map(asString),
        images_active: !!get(invitation, 'dresscode.onImages'),
        links_active: !!get(invitation, 'dresscode.onLinks'),
      },

      gifts: {
        active: !!get(invitation, 'gifts.active'),
        background: !!get(invitation, 'gifts.background'),
        inverted: !!get(invitation, 'gifts.invertedColors'),
        separator: !!get(invitation, 'gifts.separator'),
        title: asString(get(invitation, 'gifts.title') ?? null),
        description: asString(get(invitation, 'gifts.description') ?? null),
        cards: (get(invitation, 'gifts.cards') ?? []).map((c) => {
          if (c.link) {
            return {
              kind: 'store',
              brand: asString(c.type ?? null),
              url: asString(c.url ?? null),
              bank: null,
              name: null,
              number: null,
            };
          }
          return {
            kind: 'bank',
            brand: null,
            url: null,
            bank: asString(c.bank ?? null),
            name: asString(c.name ?? null),
            number: asString(c.number ?? null),
          };
        }),
      },

      destinations: {
        active: !!get(invitation, 'destinations.active'),
        background: !!get(invitation, 'destinations.background'),
        inverted: !!get(invitation, 'destinations.invertedColors'),
        separator: !!get(invitation, 'destinations.separator'),
        title: asString(get(invitation, 'destinations.title') ?? null),
        description: asString(get(invitation, 'destinations.description') ?? null),
        cards: (get(invitation, 'destinations.cards') ?? []).map((c) => ({
          image: asString(c.image ?? null),
          name: asString(c.name ?? null),
          url: asString(c.url ?? null),
          type: asString(c.type ?? 'hotel'),
          description: asString(c.description ?? null),
        })),
      },

      notices: {
        active: !!get(invitation, 'notices.active'),
        background: !!get(invitation, 'notices.background'),
        inverted: !!get(invitation, 'notices.invertedColors'),
        separator: !!get(invitation, 'notices.separator'),
        title: asString(get(invitation, 'notices.title') ?? null),
        notices: (get(invitation, 'notices.notices') ?? []).map(asString),
      },

      gallery: {
        active: !!get(invitation, 'gallery.active'),
        background: !!get(invitation, 'gallery.background'),
        inverted: !!get(invitation, 'gallery.invertedColors'),
        separator: !!get(invitation, 'gallery.separator'),
        prod: (get(invitation, 'gallery.gallery_prod') ?? []).map(asString),
        dev: (get(invitation, 'gallery.gallery_dev') ?? []).map(asString),
        title: asString(get(invitation, 'gallery.title') ?? null),
      },

      generals: {
        colors: {
          primary: asString(get(invitation, 'generals.palette.primary') ?? null),
          secondary: asString(get(invitation, 'generals.palette.secondary') ?? null),
          accent: asString(get(invitation, 'generals.palette.accent') ?? null),
          actions: asString(get(invitation, 'generals.palette.buttons') ?? null),
        },
        fonts: {
          // si luego quieres tipar tamaños/weight, completa aquí
          titles: defaultFont
            ? { value: defaultFont, size: 0, weight: 0, opacity: 1, typeFace: defaultFont, color: '#000000' }
            : undefined,
          body: defaultFont
            ? { value: defaultFont, size: 0, weight: 0, opacity: 1, typeFace: defaultFont, color: '#000000' }
            : undefined,
        },
        event: {
          label: asString(invitation.label ?? null),
          name: asString(get(invitation, 'generals.eventName') ?? null),
        },
        separator: Number(get(invitation, 'generals.separator') ?? 0),
        positions: Array.isArray(get(invitation, 'generals.positions')) ? invitation.generals.positions : [],
        texture: get(invitation, 'generals.texture') ?? null,
      },
  }

  return out;
}