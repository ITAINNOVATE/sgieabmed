import LoginPage from "../page"

export default function LoginRoute({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined }
}) {
  return <LoginPage searchParams={searchParams} />
}
