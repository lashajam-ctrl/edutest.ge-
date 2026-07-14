type HomeProps = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

export default async function Home({ searchParams }: HomeProps) {
  const params = (await searchParams) ?? {};
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") query.set(key, value);
  }
  const src = `/app.html${query.size ? `?${query}` : ""}`;
  return <iframe title="EduTest.ge" src={src} className="app-frame" />;
}
