export function can(permission, permissions = []) {
  if (!permission) {
    return false;
  }

  return permissions.some((item) => {
    const slug =
      typeof item === 'string'
        ? item
        : item?.slug;

    return slug === permission;
  });
}