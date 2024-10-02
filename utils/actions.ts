"use server";

import db from "@/utils/db";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

// helper function to get current authenticated user
const getAuthUser = async () => {
  const user = await currentUser();
  if (!user) redirect("/");
  return user;
};

// helper function
const renderError = (error: unknown): { message: string } => {
  console.log(error);
  return {
    message: error instanceof Error ? error.message : "An error occurred",
  };
};

export const fetchFeaturedProducts = async () => {
  const products = await db.product.findMany({
    where: {
      featured: true,
    },
  });
  return products;
};

export const fetchAllProducts = ({ search = "" }: { search: string }) => {
  return db.product.findMany({
    where: {
      OR: [
        {
          name: { contains: search, mode: "insensitive" },
        },
        {
          company: { contains: search, mode: "insensitive" },
        },
      ],
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};

export const fetchSingleProduct = async (productId: string) => {
  const product = await db.product.findUnique({
    where: {
      id: productId,
    },
  });
  if (!product) redirect("/products");
  return product;
};

export const createProductAction = async (
  prevState: any,
  formData: FormData
): Promise<{ message: string }> => {
  // access clerkId with helper functions
  const user = await getAuthUser();
  if (!user) redirect("/");

  try {
    // manually fetch the inputs
    const name = formData.get("name") as string;
    const company = formData.get("company") as string;
    // will be dealt with Zod
    const price = Number(formData.get("price") as string);
    // temp (will be stored on a supabase bucket)
    const image = formData.get("image") as File;
    const description = formData.get("description") as string;
    const featured = Boolean(formData.get("featured") as string);

    await db.product.create({
      data: {
        name,
        company,
        price,
        image: "/images/product-5.jpg", // hardcode for time being
        description,
        featured,
        clerkId: user.id, // check if the user exists
      },
    });

    return { message: "product created" };
  } catch (error) {
    return renderError(error);
  }
};
