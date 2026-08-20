export function fileMatchesAccept(file: File, accept: string) {
  const parts = accept
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);

  if (parts.length === 0) {
    return true;
  }

  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();

  return parts.some((part) => {
    if (part.endsWith("/*")) {
      return type.startsWith(part.slice(0, -1));
    }

    if (part.startsWith(".")) {
      return name.endsWith(part);
    }

    return (
      type === part || (part === "application/pdf" && name.endsWith(".pdf"))
    );
  });
}
