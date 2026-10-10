/**
 * Business facts used by the AAO structured data and llms.txt files that
 * scripts/prerender.mjs writes at build time. Everything here comes from the
 * published Policies and Contact pages. Edit here, not in the schema code.
 */
export const AAO = {
  email: 'help@nors.com.pk',
  instagram: 'https://instagram.com/nors.com.pk',
  streetAddress: 'PECHS',
  locality: 'Karachi',
  country: 'PK',

  // Policies page: "Estimated Delivery: 3 to 7 business days after order confirmation."
  transitDays: { min: 3, max: 7 },
  // Policies page: "Claims must be submitted within 72 hours of package delivery."
  returnWindowDays: 3,
  // Policies page: "A Rs. 250 - Rs. 300 exchange fee applies per swap" (upper bound used).
  exchangeFeePkr: 300,
  // Policies page: orders above PKR 6,000 need an advance payment (same value as COD_DEPOSIT_THRESHOLD in the app).
  codAdvanceThresholdPkr: 6000,

  // NOT published on the site yet. Shipping is priced per zone by WooCommerce at checkout,
  // so there is no single flat fee. While this is null, shippingDetails is left out of the
  // schema rather than guessed. Set a number only if one flat fee applies to every order.
  shippingFeePkr: null,
  // Days from order confirmation to dispatch, e.g. { min: 0, max: 1 }. Optional.
  handlingDays: null,

  // The Exchange & Refund policy excludes "discounted, sale, or archive pieces" but also
  // promises refunds for manufacturing defects. false = the schema says sale items are not
  // returnable, matching the first rule. Change once the policy text is clarified.
  saleItemsReturnable: false,
};
