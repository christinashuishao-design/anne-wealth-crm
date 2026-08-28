import { notFound, redirect } from "next/navigation";

const replacements: Record<string, string> = {
  contacts: "/customers",
  notifications: "/tasks",
  "follow-ups": "/tasks",
  "product-categories": "/products",
  "supplier-products": "/products",
  quotations: "/pricing",
  payments: "/finance",
  "imports/history": "/imports",
  "settings/users": "/communication-connections",
  "settings/roles": "/communication-connections",
  "settings/audit": "/communication-connections",
};

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const replacement = replacements[slug.join("/")];
  if (replacement) redirect(replacement);
  notFound();
}
