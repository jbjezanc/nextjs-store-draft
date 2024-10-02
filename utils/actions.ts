"use server";

import db from "@/utils/db";
import { redirect } from "next/navigation";

export const fetchFeaturedProducts = async () => {
  // possibly using the values here, await them and store into a variable
  const products = await db.product.findMany({
    where: {
      featured: true,
    },
    // select: {
    //   name: true,
    // },
  });
  return products;
};

export const fetchAllProducts = ({ search = "" }: { search: string }) => {
  // not using the fetched values, just return the result to the calling code
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
  return { message: "product created" };
};
