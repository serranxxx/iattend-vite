// Catálogo de precios (RUTA_CATALOGO y Admin › Ventas › Precios). Foto de lo
// que hay en Stripe (live) al 2026-11-10: cada producto con su precio principal (`default_price`), la
// imagen del producto y su Payment Link. Los links nuevos se crearon con
// metadata `origen: catalogo_precios`; una compra por link no trae
// `priceId` en la metadata, así que el webhook la ignora y la activa un asesor.
// Si cambia un precio o un link en Stripe, hay que actualizarlo aquí a mano.
// `meses`: plazo a meses sin intereses (el monto es el total).

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
              imagen: 'https://files.stripe.com/links/MDB8YWNjdF8xU2M2ZDVBQWRObElUTlZifGZsX2xpdmVfZmNFZ045MUxDd2hHdHcyRXl0N2l2S0E300QUdZB4HE',
              link: 'https://buy.stripe.com/aFa00i4OE8wNdyn8TEd7q0b' },
            { id: 'wedding.pro_3_meses', nombre: 'PRO 3 meses', monto: 4349, meses: 3,
              productId: 'prod_VbSVZzZnks5dVJ', priceId: 'price_1UaFawAAdNlITNVbVUKNNDOO',
              imagen: 'https://files.stripe.com/links/MDB8YWNjdF8xU2M2ZDVBQWRObElUTlZifGZsX2xpdmVfVjUzSHRtc3FLMGJpTjNSTWEwQ1Z3NEFX00aF61b0xE',
              link: 'https://buy.stripe.com/cNi3cu3KAbIZ2TJ4Dod7q0c' },
            { id: 'wedding.pro_6_meses', nombre: 'PRO 6 meses', monto: 4499, meses: 6,
              productId: 'prod_VbSWr12X4xM4sY', priceId: 'price_1UaFbAAAdNlITNVb5rZP3BPt',
              imagen: 'https://files.stripe.com/links/MDB8YWNjdF8xU2M2ZDVBQWRObElUTlZifGZsX2xpdmVfMGE2eGI1am9ITnlrVDdpNGRrbVkzSXE500dzHrm68m',
              link: 'https://buy.stripe.com/eVqaEWdla5kB79Z7PAd7q0d' },
            { id: 'wedding.pro_12_meses', nombre: 'PRO 12 meses', monto: 4799, meses: 12,
              productId: 'prod_VbSWQJp1oHEOTK', priceId: 'price_1UaFbGAAdNlITNVbO8YUryWU',
              imagen: 'https://files.stripe.com/links/MDB8YWNjdF8xU2M2ZDVBQWRObElUTlZifGZsX2xpdmVfVWtObTlGN0lySktjZjZGMWdDSTcyeDdF00Fz6rtVKP',
              link: 'https://buy.stripe.com/8x2cN4bd24gx0LB2vgd7q0e' },
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
            { id: 'pops.individual', nombre: 'Pop', monto: 549,
              productId: 'prod_VQ1P4AEuKpGcSY', priceId: 'price_1UPBMpAAdNlITNVbsMytTDx4',
              imagen: 'https://files.stripe.com/links/MDB8YWNjdF8xU2M2ZDVBQWRObElUTlZifGZsX2xpdmVfd09GVEdvVUxFWUdCYm91Q0dwSVVhWXBn00eYqtokUx',
              link: 'https://buy.stripe.com/6oU4gygxm14l0LB0n8d7q0g' },
          ],
        },
        {
          titulo: 'Bucket 5 Pops',
          productos: [
            { id: 'pops.bucket_5.contado', nombre: 'Bucket 5 Pops - Contado', monto: 2200,
              productId: 'prod_VbRxwmHXwYccpu', priceId: 'price_1UaF3tAAdNlITNVbtOJvbjYq',
              imagen: 'https://files.stripe.com/links/MDB8YWNjdF8xU2M2ZDVBQWRObElUTlZifGZsX2xpdmVfUVlWWHFIdTVzZUdkUm9XajR4QjVrQWx400Wpmf8xpB',
              link: 'https://buy.stripe.com/14AaEW4OE3ct8e35Hsd7q0h' },
            { id: 'pops.bucket_5.3_msi', nombre: 'Bucket 5 Pops - 3 MSI', monto: 2370, meses: 3,
              productId: 'prod_VbRy2LpnjgWX8A', priceId: 'price_1UaF4DAAdNlITNVbRh1q4NiT',
              imagen: 'https://files.stripe.com/links/MDB8YWNjdF8xU2M2ZDVBQWRObElUTlZifGZsX2xpdmVfZzVwOWdPYUpiNFUxeU1BaXJ1dWNyMXll00aA9mEUO8',
              link: 'https://buy.stripe.com/3cI8wO80Q5kBgKz9XId7q0i' },
            { id: 'pops.bucket_5.6_msi', nombre: 'Bucket 5 Pops - 6 MSI', monto: 2430, meses: 6,
              productId: 'prod_VbRyQSHaLGudoi', priceId: 'price_1UaF4UAAdNlITNVbYMERH6f6',
              imagen: 'https://files.stripe.com/links/MDB8YWNjdF8xU2M2ZDVBQWRObElUTlZifGZsX2xpdmVfTUtDWDZOdk1FT0RXUmhicFBud2hxVnVT00A5QyDPYw',
              link: 'https://buy.stripe.com/aFa28q5SIbIZ0LB7PAd7q0j' },
          ],
        },
        {
          titulo: 'Bucket 10 Pops',
          productos: [
            { id: 'pops.bucket_10.contado', nombre: 'Bucket 10 Pops - Contado', monto: 3850,
              productId: 'prod_VbRy89kVxXQ6on', priceId: 'price_1UaF4aAAdNlITNVbvZ3h2Hkn',
              imagen: 'https://files.stripe.com/links/MDB8YWNjdF8xU2M2ZDVBQWRObElUTlZifGZsX2xpdmVfOUxOdEQxVW43TWtMVEZYVmg0d3lrZVA300bKUYAnNN',
              link: 'https://buy.stripe.com/3cI3cuepe4gxcujgm6d7q0k' },
            { id: 'pops.bucket_10.3_msi', nombre: 'Bucket 10 Pops - 3 MSI', monto: 4170, meses: 3,
              productId: 'prod_VbRyEcK5qCIxNf', priceId: 'price_1UaF4qAAdNlITNVbZkkxzT6y',
              imagen: 'https://files.stripe.com/links/MDB8YWNjdF8xU2M2ZDVBQWRObElUTlZifGZsX2xpdmVfa1BnZUx0OHhobXVnQ0ZIUFZOTUlJWVpR00SVSzzFjr',
              link: 'https://buy.stripe.com/8x214m4OE5kBeCr0n8d7q0l' },
            { id: 'pops.bucket_10.6_msi', nombre: 'Bucket 10 Pops - 6 MSI', monto: 4320, meses: 6,
              productId: 'prod_VbRyqVAzZZnk38', priceId: 'price_1UaF4wAAdNlITNVb5Mjjpl5m',
              imagen: 'https://files.stripe.com/links/MDB8YWNjdF8xU2M2ZDVBQWRObElUTlZifGZsX2xpdmVfS0ZuMlhxTUlIeXlvNXk1aUwweExxc0ZU008EfbuPcs',
              link: 'https://buy.stripe.com/28EcN42Gw6oF8e39XId7q0m' },
            { id: 'pops.bucket_10.12_msi', nombre: 'Bucket 10 Pops - 12 MSI', monto: 4560, meses: 12,
              productId: 'prod_VbRz64IO41J7SX', priceId: 'price_1UaF58AAdNlITNVb7GhFSbuR',
              imagen: 'https://files.stripe.com/links/MDB8YWNjdF8xU2M2ZDVBQWRObElUTlZifGZsX2xpdmVfRlVHZXN2Q1R1NHJ1dVRndzNKNDBlN2RY00UoFqfJrz',
              link: 'https://buy.stripe.com/14A6oG3KAcN365V9XId7q0n' },
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
            { id: 'promos.pro_msi', nombre: 'PRO MSI', monto: 3999, meses: 12,
              productId: 'prod_Va0VhUewMVIFcz', priceId: 'price_1UYqUXAAdNlITNVb74nl51hN',
              imagen: 'https://files.stripe.com/links/MDB8YWNjdF8xU2M2ZDVBQWRObElUTlZifGZsX2xpdmVfejFENHUzVWVZZ2Q2d1dqak5RZDhtWGhv00cTadKe2x',
              link: 'https://buy.stripe.com/fZu8wObd200h2TJ2vgd7q08' },
          ],
        },
      ],
    },
]
