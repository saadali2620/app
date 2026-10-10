/**
 * schema.org builders for scripts/prerender.mjs: Organization, ProductGroup with
 * one offer per size, MerchantReturnPolicy and OfferShippingDetails.
 * Pure functions, no network access.
 */
import { AAO } from './aao-config.mjs';

const S = 'https://schema.org/';
const GR = 'http://purl.org/goodrelations/v1#';

export const orgId = (site) => `${site}/#organization`;

export function returnPolicy(site, onSale) {
  const link = `${site}/policies`;
  if (onSale && !AAO.saleItemsReturnable) {
    return {
      '@type': 'MerchantReturnPolicy',
      applicableCountry: AAO.country,
      returnPolicyCategory: `${S}MerchantReturnNotPermitted`,
      merchantReturnLink: link,
    };
  }
  return {
    '@type': 'MerchantReturnPolicy',
    applicableCountry: AAO.country,
    returnPolicyCountry: AAO.country,
    returnPolicyCategory: `${S}MerchantReturnFiniteReturnWindow`,
    merchantReturnDays: AAO.returnWindowDays,
    returnMethod: `${S}ReturnByMail`,
    returnFees: `${S}ReturnShippingFees`,
    returnShippingFeesAmount: { '@type': 'MonetaryAmount', value: AAO.exchangeFeePkr, currency: 'PKR' },
    refundType: [`${S}ExchangeRefund`, `${S}StoreCreditRefund`, `${S}FullRefund`],
    merchantReturnLink: link,
  };
}

export function shippingDetails() {
  if (AAO.shippingFeePkr === null) return undefined;
  const deliveryTime = {
    '@type': 'ShippingDeliveryTime',
    transitTime: { '@type': 'QuantitativeValue', minValue: AAO.transitDays.min, maxValue: AAO.transitDays.max, unitCode: 'DAY' },
  };
  if (AAO.handlingDays) {
    deliveryTime.handlingTime = {
      '@type': 'QuantitativeValue',
      minValue: AAO.handlingDays.min,
      maxValue: AAO.handlingDays.max,
      unitCode: 'DAY',
    };
  }
  return {
    '@type': 'OfferShippingDetails',
    shippingRate: { '@type': 'MonetaryAmount', value: AAO.shippingFeePkr, currency: 'PKR' },
    shippingDestination: { '@type': 'DefinedRegion', addressCountry: AAO.country },
    deliveryTime,
  };
}

function availability({ inStock, backorder }) {
  if (backorder) return `${S}BackOrder`;
  return inStock ? `${S}InStock` : `${S}OutOfStock`;
}

function offer(site, url, o) {
  const out = {
    '@type': 'Offer',
    url,
    priceCurrency: o.currency,
    price: String(o.price),
    itemCondition: `${S}NewCondition`,
    availability: availability(o),
    seller: { '@id': orgId(site) },
    acceptedPaymentMethod: [`${GR}COD`, `${GR}ByBankTransferInAdvance`],
    hasMerchantReturnPolicy: returnPolicy(site, Boolean(o.regular)),
  };
  if (o.regular) {
    // The "was" price, so an agent can tell the item is discounted.
    out.priceSpecification = {
      '@type': 'UnitPriceSpecification',
      priceType: `${S}ListPrice`,
      price: String(o.regular),
      priceCurrency: o.currency,
    };
  }
  const ship = shippingDetails();
  if (ship) out.shippingDetails = ship;
  return out;
}

/**
 * p: normalized product from prerender.mjs.
 * p.variants (optional): [{ id, sku, size, inStock, backorder, price, regular }]
 */
export function productSchema(site, brand, p) {
  const url = `${site}/products/${p.slug}`;
  const base = {
    '@context': 'https://schema.org',
    name: p.name,
    description: p.short || p.long || p.name,
    image: p.images,
    brand: { '@type': 'Brand', name: brand },
  };
  const own = { currency: p.currency, price: p.price, regular: p.regular, inStock: p.inStock, backorder: false };

  if (!p.variants || p.variants.length === 0) {
    return { ...base, '@type': 'Product', '@id': `${url}#product`, url, ...(p.sku && { sku: p.sku }), offers: offer(site, url, own) };
  }

  const hasVariant = p.variants.map((v) => {
    const vUrl = v.size ? `${url}?size=${encodeURIComponent(v.size)}` : url;
    const o = {
      currency: p.currency,
      price: v.price ?? p.price,
      regular: v.price !== undefined ? v.regular : p.regular,
      inStock: v.inStock ?? p.inStock,
      backorder: v.backorder === true,
    };
    return {
      '@type': 'Product',
      sku: v.sku || (p.sku && v.size ? `${p.sku}-${v.size}` : String(v.id)),
      name: v.size ? `${p.name} (${v.size})` : p.name,
      ...(v.size && { size: v.size }),
      ...(p.color && { color: p.color }),
      image: p.images,
      url: vUrl,
      offers: offer(site, vUrl, o),
    };
  });

  return {
    ...base,
    '@type': 'ProductGroup',
    '@id': `${url}#product`,
    url,
    productGroupID: p.sku || String(p.id),
    ...(p.color && { color: p.color }),
    variesBy: [`${S}size`],
    hasVariant,
    // aggregateRating / review are intentionally absent: add them only from real submitted reviews.
  };
}

export function organizationSchema({ site, brand, logo, description }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'OnlineStore',
    '@id': orgId(site),
    name: brand,
    url: `${site}/`,
    logo,
    image: logo,
    foundingDate: '2021',
    description,
    email: AAO.email,
    address: {
      '@type': 'PostalAddress',
      streetAddress: AAO.streetAddress,
      addressLocality: AAO.locality,
      addressCountry: AAO.country,
    },
    areaServed: { '@type': 'Country', name: 'Pakistan' },
    sameAs: [AAO.instagram],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      email: AAO.email,
      areaServed: AAO.country,
      availableLanguage: ['English'],
    },
    brand: { '@type': 'Brand', name: brand },
    hasMerchantReturnPolicy: returnPolicy(site, false),
  };
}
