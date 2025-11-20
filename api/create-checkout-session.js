import Stripe from "stripe";

export default async function handler(req, res) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: "Tab4Storm Premium Access",
          },
          unit_amount: 500, // 5 USD = 20 zł (zmienisz jak chcesz)
        },
        quantity: 1,
      },
    ],
    success_url: `${process.env.SITE_URL}/?payment=success`,
    cancel_url: `${process.env.SITE_URL}/?payment=cancelled`,
  });

  res.status(200).json({ url: session.url });
}
