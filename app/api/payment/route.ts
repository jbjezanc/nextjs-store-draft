import Stripe from "stripe";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);
import { type NextRequest } from "next/server";
import db from "@/utils/db";

export const POST = async (req: NextRequest) => {
  const requestHeaders = new Headers(req.headers);
  const origin = requestHeaders.get("origin");

  const { orderId, cartId } = await req.json();

  const order = await db.order.findUnique({ where: { id: orderId } });
  const cart = await db.cart.findUnique({
    where: { id: cartId },
    include: {
      cartItems: {
        include: {
          product: true,
        },
      },
    },
  });

  if (!order || !cart) {
    return Response.json(null, {
      status: 404,
      statusText: "Not Found",
    });
  }

  // cart subtotal
  const subtotal = cart.cartItems.reduce((acc, cartItem) => {
    return acc + cartItem.product.price * cartItem.amount;
  }, 0);

  // dynamically determine tax rate (using 10% )
  const taxRate = 0.1; // could be dynamically calculated from region
  const taxAmount = subtotal * taxRate;

  // tax line item
  const taxLineItem = {
    quantity: 1,
    price_data: {
      currency: "usd",
      product_data: {
        name: "Tax",
      },
      unit_amount: Math.round(taxAmount * 100), // Convert to cents
    },
  };

  // shipping line item
  const shippingLineItem = {
    quantity: 1,
    price_data: {
      currency: "usd",
      product_data: {
        name: "Shipping",
      },
      unit_amount: 500, // shipping is $5.00 (500 cents
    },
  };

  // line items
  // const line_items = cart.cartItems.map((cartItem) => {
  //   return {
  //     quantity: cartItem.amount,
  //     price_data: {
  //       currency: "usd",
  //       product_data: {
  //         name: cartItem.product.name,
  //         images: [cartItem.product.image],
  //       },
  //       unit_amount: cartItem.product.price * 100, // price in cents
  //     },
  //   };
  // });

  const line_items = [
    ...cart.cartItems.map((cartItem) => ({
      quantity: cartItem.amount,
      price_data: {
        currency: "usd",
        product_data: {
          name: cartItem.product.name,
          images: [cartItem.product.image],
        },
        unit_amount: cartItem.product.price * 100,
      },
    })),
    shippingLineItem,
    taxLineItem,
  ];
  
  try {
    const session = await stripe.checkout.sessions.create({
      ui_mode: "embedded",
      metadata: { orderId, cartId },
      line_items: line_items,
      mode: "payment",
      return_url: `${origin}/api/confirm?session_id={CHECKOUT_SESSION_ID}`,
    });
    return Response.json({
      clientSecret: session.client_secret,
    });
  } catch (error) {
    console.log(error);
    return Response.json(null, {
      status: 500,
      statusText: "Internal Server Error",
    });
  }
};
