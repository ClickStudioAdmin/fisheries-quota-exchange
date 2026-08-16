export function accountPath(organisationId: number, path = "/dashboard") {
  return `${path}?account=${organisationId}`;
}
