// Catálogo de precios (RUTA_CATALOGO y Admin › Ventas › Precios). Foto de lo
// que hay en Stripe (live) al 2026-11-10, ya con el catálogo nuevo (un precio
// de contado y uno "a meses"; en Stripe los meses solo salen desde $4,000):
// cada producto con su precio principal (`default_price`), la imagen del
// producto y su Payment Link. Los
// links llevan metadata `origen: catalogo_precios`; una compra por link no
// trae `priceId` en la metadata, así que el webhook la ignora y la activa un
// asesor. Si cambia un precio o un link en Stripe, hay que actualizarlo aquí.
// `meses`: se puede pagar a meses (hasta ese plazo; el cliente lo elige en
// Stripe). `mismoPrecio`: cuesta lo mismo de contado o a meses. `pops`: Pops
// que incluye (para "$450 por Pop").

// Ruta pública del catálogo. El id solo la hace difícil de adivinar: viaja en
// el bundle, así que no es un secreto. Para cambiarla, cambiar el id aquí.
export const RUTA_CATALOGO = '/precios/n26b3coei7jj2yc0'

export const CATALOGO = [
    {
      clave: 'wedding',
      grupos: [
        {
          titulo: null,
          productos: [
            { id: 'wedding.pro_contado', nombre: 'PRO - Contado', monto: 3999,
              productId: 'prod_VbSVIYg0eJbVFv', priceId: 'price_1UaFaqAAdNlITNVb73fqH4yd',
              imagen: 'https://files.stripe.com/links/MDB8YWNjdF8xU2M2ZDVBQWRObElUTlZifGZsX2xpdmVfbVNZWHY5azF2SHZlTUJRMXFzNnhnM2hJ00lw8PQ4jn',
              link: 'https://buy.stripe.com/aFa00i4OE8wNdyn8TEd7q0b' },
            { id: 'wedding.pro_meses', nombre: 'PRO a meses', monto: 4499, meses: 12,
              productId: 'prod_VbSVZzZnks5dVJ', priceId: 'price_1UaH1yAAdNlITNVbqdsGJJtf',
              imagen: 'https://files.stripe.com/links/MDB8YWNjdF8xU2M2ZDVBQWRObElUTlZifGZsX2xpdmVfT2ltT0p4ZFJLTmN4QmxFY0Z3RHlLcVU100HhdAlFLA',
              link: 'https://buy.stripe.com/cNi9ASbd2bIZ8e35Hsd7q0t' },
            { id: 'wedding.lite', nombre: 'Lite', monto: 2899,
              productId: 'prod_ThrfrgJ7bGsk3f', priceId: 'price_1Tl9jyAAdNlITNVbm0hq6omU',
              imagen: 'https://files.stripe.com/links/MDB8YWNjdF8xU2M2ZDVBQWRObElUTlZifGZsX2xpdmVfQ0hjdFBORHpXbnpINnE2aE1YaU13VnVO00qPEwQwxV',
              link: 'https://buy.stripe.com/bJe6oG6WM3ctamb0n8d7q02' },
            { id: 'wedding.paperless', nombre: 'Paperless', monto: 849,
              productId: 'prod_ThrfQpVr7gTuLS', priceId: 'price_1SkRvtAAdNlITNVbj8BA6F2Q',
              imagen: 'https://files.stripe.com/links/MDB8YWNjdF8xU2M2ZDVBQWRObElUTlZifGZsX2xpdmVfSlhiWDJ4YUNmV0M3YTJFUFROOWpSTVk200sk3JgHpM',
              link: 'https://buy.stripe.com/6oUdR8fti00hfGv6Lwd7q0f' },
          ],
        },
      ],
    },
    {
      clave: 'pops',
      grupos: [
        {
          titulo: null,
          productos: [
            { id: 'pops.individual', nombre: 'Pop', monto: 549, pops: 1,
              productId: 'prod_VQ1P4AEuKpGcSY', priceId: 'price_1UPBMpAAdNlITNVbsMytTDx4',
              imagen: 'https://files.stripe.com/links/MDB8YWNjdF8xU2M2ZDVBQWRObElUTlZifGZsX2xpdmVfdzJtaXVzaEU0N2J0VHBtRjBscndoOGZ600nxYcVVfQ',
              link: 'https://buy.stripe.com/6oU4gygxm14l0LB0n8d7q0g' },
            { id: 'pops.bucket_5', nombre: 'Bucket 5 Pops', monto: 2249, pops: 5,
              productId: 'prod_VbRxwmHXwYccpu', priceId: 'price_1UaH4PAAdNlITNVbL15skW9Y',
              imagen: 'https://files.stripe.com/links/MDB8YWNjdF8xU2M2ZDVBQWRObElUTlZifGZsX2xpdmVfUmpNNzdVcjdVZkV4NWVvVFgyUGZrNjRu00CxVf8WNW',
              link: 'https://buy.stripe.com/bJe14m3KA28p65V0n8d7q0u' },
            { id: 'pops.bucket_10', nombre: 'Bucket 10 Pops', monto: 4000, pops: 10, meses: 12, mismoPrecio: true,
              productId: 'prod_VbRy89kVxXQ6on', priceId: 'price_1UaHjdAAdNlITNVbv6j6JQKZ',
              imagen: 'https://files.stripe.com/links/MDB8YWNjdF8xU2M2ZDVBQWRObElUTlZifGZsX2xpdmVfR0xvVnY0S29YeEdHSHVtUDR6Nm9VRW5k00f9LW2Dhr',
              link: 'https://buy.stripe.com/9B6bJ0fti6oF51R6Lwd7q0x' },
          ],
        },
      ],
    },
    {
      clave: 'extras',
      grupos: [
        {
          titulo: null,
          productos: [
            { id: 'extras.side_event', nombre: 'Side Event', monto: 300,
              productId: 'prod_TzUdGoGP30dpei', priceId: 'price_1Tl9kwAAdNlITNVbqroYr991',
              imagen: 'https://files.stripe.com/links/MDB8YWNjdF8xU2M2ZDVBQWRObElUTlZifGZsX2xpdmVfVHpzUHVlZ2FMUG10bTlDRGVPSUp1SHhU00KNRILQTK',
              link: 'https://buy.stripe.com/fZu9ASbd25kB9i7fi2d7q0o' },
            { id: 'extras.cambiate_a_pro', nombre: 'Cambiate a PRO', monto: 1100,
              productId: 'prod_UkhT1IUcNBqftu', priceId: 'price_1TlC4RAAdNlITNVbjcRtexSy',
              imagen: 'https://files.stripe.com/links/MDB8YWNjdF8xU2M2ZDVBQWRObElUTlZifGZsX2xpdmVfWEZjSXpJektobHl5Q3N3U3VESG1lcEZD00hpcZJkDG',
              link: 'https://buy.stripe.com/5kQ9ASch63ct51Rd9Ud7q0s' },
          ],
        },
        {
          titulo: 'Créditos',
          productos: [
            { id: 'extras.creditos.50', nombre: '50 Créditos', monto: 150,
              productId: 'prod_TuyMyftisD9Ftv', priceId: 'price_1Tl9qVAAdNlITNVbzMviUvKo',
              imagen: 'https://files.stripe.com/links/MDB8YWNjdF8xU2M2ZDVBQWRObElUTlZifGZsX2xpdmVfenV5Q3BTcWhTcXJlWUJXUkxWVkF6T0dp00IYQzE1nE',
              link: 'https://buy.stripe.com/cNifZga8Y7sJfGv8TEd7q0p' },
            { id: 'extras.creditos.100', nombre: '100 Créditos', monto: 200,
              productId: 'prod_TuyNgRyhOEgk9p', priceId: 'price_1Tl9oiAAdNlITNVby13ZND99',
              imagen: 'https://files.stripe.com/links/MDB8YWNjdF8xU2M2ZDVBQWRObElUTlZifGZsX2xpdmVfV2M0NEJ1dzVkczU5VnJrV3AyZzM4UTh000sExy1P6b',
              link: 'https://buy.stripe.com/4gM7sKdla00heCrd9Ud7q0q' },
            { id: 'extras.creditos.200', nombre: '200 Créditos', monto: 300,
              productId: 'prod_TuyOYmiOSKXs97', priceId: 'price_1Tl9tfAAdNlITNVbTIy9P6X9',
              imagen: 'https://files.stripe.com/links/MDB8YWNjdF8xU2M2ZDVBQWRObElUTlZifGZsX2xpdmVfbkN6cEVoRnBmQkpCeXZwV0Vqd1JCUXVL00zzhxCn3A',
              link: 'https://buy.stripe.com/8x24gydla7sJ8e39XId7q0r' },
          ],
        },
      ],
    },
    {
      clave: 'promos',
      grupos: [
        {
          titulo: null,
          productos: [
            { id: 'promos.pro_20_off', nombre: 'PRO 20% OFF', monto: 3199,
              productId: 'prod_VbSSieDvJfgvz3', priceId: 'price_1UaFY1AAdNlITNVbWr0IC7SR',
              imagen: 'https://files.stripe.com/links/MDB8YWNjdF8xU2M2ZDVBQWRObElUTlZifGZsX2xpdmVfYmx3cnhXWXphZW0yZ0ZyeU1udlp1cHR4005ovFFzAe',
              link: 'https://buy.stripe.com/bJe14mepedR78e35Hsd7q0a' },
            { id: 'promos.pro_msi', nombre: 'PRO MSI', monto: 4000, meses: 12,
              productId: 'prod_Va0VhUewMVIFcz', priceId: 'price_1UaHg5AAdNlITNVbpmncSmHc',
              imagen: 'https://files.stripe.com/links/MDB8YWNjdF8xU2M2ZDVBQWRObElUTlZifGZsX2xpdmVfejFENHUzVWVZZ2Q2d1dqak5RZDhtWGhv00cTadKe2x',
              link: 'https://buy.stripe.com/bJe8wOdla5kB1PFb1Md7q0w' },
          ],
        },
      ],
    },
]
